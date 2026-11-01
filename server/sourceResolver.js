import { getSourceChapters, storySources, isCurrentChapterSource } from '../src/data/storySources.js';
import { fetchMeTruyenChapter } from './meTruyenSource.js';

export async function resolvePreferredChapter(storyId, index, storage) {
  const book = storySources[storyId];
  const metadata = getSourceChapters(storyId).find(ch => ch.chapterIndex === index);
  if (!book || !metadata) return null;
  const cached = await storage.readCache(storyId, index).catch(() => null);
  if (cached?.content && isCurrentChapterSource(cached)
    && (cached.source !== 'archive' || Date.now() - cached.sourceCheckedAt < 60 * 60 * 1000)) {
    const { _id, ...chapter } = cached;
    return chapter;
  }
  let reason = book.chapters.find(ch => ch.chapterIndex === index)?.fallbackReason || 'unavailable';
  if (metadata.sourceUrl) {
    try {
      const chapter = await (storage.fetchPrimary || fetchMeTruyenChapter)(storyId, index);
      if (chapter?.content) {
        await storage.writeCache(chapter).catch(() => {});
        return chapter;
      }
    } catch (error) {
      if (error.code === 'SOURCE_EMPTY') reason = 'empty';
    }
  }
  const previous = await storage.readArchive(storyId, index).catch(() => null);
  if (!previous?.content) return null;
  const original = { ...previous };
  for (const key of ['_id', 'sourceUrl', 'sourceChapterIndex']) delete original[key];
  const chapter = {
    ...original, source: 'archive', sourceVersion: book.sourceVersion,
    sourceFallbackReason: reason, sourceCheckedAt: Date.now(),
  };
  await storage.writeCache(chapter).catch(() => {});
  return chapter;
}
