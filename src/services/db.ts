import Dexie, { type Table } from 'dexie';
import type { Story, Chapter, AudioAttachment, Bookmark } from '../types';
import { seededStories } from '../data/seedStories';

export class AudioReaderDatabase extends Dexie {
  stories!: Table<Story, string>;
  chapters!: Table<Chapter, string>;
  audioAttachments!: Table<AudioAttachment, string>;
  bookmarks!: Table<Bookmark, string>;

  constructor() {
    super('AudioReadDB');
    this.version(1).stores({
      stories: 'id, title, author, category, createdAt, updatedAt',
      chapters: 'id, storyId, chapterIndex, title, hasAudioFile',
      audioAttachments: 'id, chapterId',
      bookmarks: 'id, storyId, chapterId, createdAt',
    });
  }
}

export const db = new AudioReaderDatabase();

// Pre-load audio attachment blob into URL helper
export async function getChapterAudioUrl(chapterId: string): Promise<string | null> {
  const attachment = await db.audioAttachments.get(chapterId);
  if (attachment && attachment.blob) {
    return URL.createObjectURL(attachment.blob);
  }
  return null;
}

// Save audio file for a chapter
export async function saveChapterAudio(chapterId: string, file: File): Promise<string> {
  const attachment: AudioAttachment = {
    id: chapterId,
    chapterId,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || 'audio/mpeg',
    blob: file,
    createdAt: Date.now(),
  };

  await db.audioAttachments.put(attachment);
  await db.chapters.update(chapterId, { hasAudioFile: true });
  return URL.createObjectURL(file);
}

// Delete audio file
export async function removeChapterAudio(chapterId: string): Promise<void> {
  await db.audioAttachments.delete(chapterId);
  await db.chapters.update(chapterId, { hasAudioFile: false });
}

// Seed sample stories if empty or missing requested stories
export async function initSampleDataIfEmpty() {
  // Clean up de-men-phieu-luu-ky completely if it was previously seeded
  try {
    await db.stories.delete('de-men-phieu-luu-ky');
    await db.chapters.where('storyId').equals('de-men-phieu-luu-ky').delete();
    await db.audioAttachments.delete('de-men-chap-1');
  } catch (e) {
    console.warn('Error purging de-men:', e);
  }

  // Check and seed/upgrade the 3 requested novels
  for (const item of seededStories) {
    const existing = await db.stories.get(item.story.id);
    const existingChaptersCount = await db.chapters.where('storyId').equals(item.story.id).count();
    if (!existing || existingChaptersCount < item.chapters.length) {
      await db.stories.put({ ...item.story, chaptersCount: item.chapters.length });
      await db.chapters.bulkPut(item.chapters);
    }
  }
}

export async function reseedRequestedStories(): Promise<void> {
  for (const item of seededStories) {
    await db.stories.put({ ...item.story, chaptersCount: item.chapters.length });
    await db.chapters.bulkPut(item.chapters);
  }
}

