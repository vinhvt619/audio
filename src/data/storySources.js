import { meTruyenBook } from './meTruyenCatalog.js';

export const storySources = Object.freeze(Object.assign(Object.create(null), { 'bach-the-cau-tien': meTruyenBook }));

export function getSourceChapters(storyId) {
  const book = storySources[storyId];
  if (!book) return [];
  return book.chapters.map(ch => ({
    id: `${storyId}-chap-${ch.chapterIndex}`, storyId, chapterIndex: ch.chapterIndex,
    title: ch.title, content: '', hasAudioFile: false,
    source: ch.sourceUrl ? book.source : 'archive', sourceVersion: book.sourceVersion,
    ...(ch.sourceUrl ? { sourceUrl: ch.sourceUrl, sourceChapterIndex: ch.sourceChapterIndex } : {}),
  }));
}

export function isCurrentChapterSource(chapter) {
  const book = storySources[chapter.storyId];
  if (!book) return true;
  const expected = book.chapters.find(ch => ch.chapterIndex === chapter.chapterIndex);
  if (!expected || chapter.sourceVersion !== book.sourceVersion) return false;
  if (chapter.source === 'archive') return true;
  return chapter.source === book.source && !!expected.sourceUrl && chapter.sourceUrl === expected.sourceUrl;
}

export function sourceFallbackMessage(reason) {
  if (reason === 'empty') return 'Chương này ở nguồn mới đang trống; đang hiển thị bản đã lưu.';
  if (reason === 'not-listed') return 'Nguồn mới chưa có chương này; đang hiển thị bản đã lưu.';
  return 'Nguồn mới tạm thời không tải được; đang hiển thị bản đã lưu.';
}
