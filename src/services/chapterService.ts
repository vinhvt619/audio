import { db } from './db';
import type { Chapter } from '../types';
import { storySources, isCurrentChapterSource } from '../data/storySources.js';

export const STORY_MAX_CHAPTERS: Record<string, { total: number; status: string }> = {
  'bach-the-cau-tien': { total: storySources['bach-the-cau-tien'].chapters.length, status: storySources['bach-the-cau-tien'].status },
  'de-ba': { total: 6976, status: 'Đại Kết Cục (6976/6976 chương)' },
  'moi-ngay-mot-que': { total: 549, status: 'Cập nhật mới nhất (549 chương)' },
};

export async function getOrFetchChapter(
  storyId: string,
  chapterIndex: number
): Promise<Chapter | null> {
  const local = await db.chapters.where('storyId').equals(storyId)
    .filter(ch => ch.chapterIndex === chapterIndex).first();
  if (local?.content && isCurrentChapterSource(local) && (local.source !== 'archive' || !navigator.onLine)) return local;
  // Fetch the selected source; unversioned content never masks the new source.
  try {
    const res = await fetch(`/api/chapter?story=${encodeURIComponent(storyId)}&chapter=${chapterIndex}`);
    if (res.ok) {
      const data: Chapter = await res.json();
      if (data && data.content && isCurrentChapterSource(data)) {
        const chapter = { ...local, ...data, hasAudioFile: local?.hasAudioFile || data.hasAudioFile };
        await db.chapters.put(chapter);
        return chapter;
      }
    }
  } catch (err) {
    console.warn(`[chapterService] Network fetch failed for ${storyId} chap ${chapterIndex}:`, err);
  }

  // 2. Fallback to local IndexedDB only if offline
  try {
    const localChapter = await db.chapters
      .where('storyId')
      .equals(storyId)
      .filter((ch) => ch.chapterIndex === chapterIndex)
      .first();

    if (localChapter && isCurrentChapterSource(localChapter)) {
      return localChapter;
    }
  } catch {}

  return null;
}

export async function syncBatchChapters(
  storyId: string,
  fromIndex: number,
  count: number,
  onProgress?: (done: number, total: number) => void
): Promise<number> {
  let savedCount = 0;
  for (let i = 0; i < count; i++) {
    const chapIndex = fromIndex + i;
    const ch = await getOrFetchChapter(storyId, chapIndex);
    if (ch) savedCount++;
    if (onProgress) {
      onProgress(i + 1, count);
    }
  }
  return savedCount;
}
