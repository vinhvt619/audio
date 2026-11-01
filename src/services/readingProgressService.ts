import { db } from './db';
import { persistStory } from './dataService';
import type { Story, Chapter } from '../types';

export interface ReadingProgressData {
  storyId: string;
  chapterId: string;
  chapterIndex: number;
  chapterTitle: string;
  progress: number; // 0 - 100 percentage
  time: number; // timestamp ms
}

/**
 * Get reading progress for a specific story from localStorage.
 * Backward compatible with both old schema { chapterId, progress, time }
 * and current schema { lastReadChapterId, lastReadProgress, lastReadTime }
 */
export function getSavedReadingProgress(storyId: string): ReadingProgressData | null {
  try {
    const raw = localStorage.getItem(`last_read_${storyId}`);
    if (!raw) return null;

    const data = JSON.parse(raw);
    if (!data) return null;

    const chapterId = data.lastReadChapterId || data.chapterId;
    if (!chapterId) return null;

    const chapterIndex =
      typeof data.lastReadChapterIndex === 'number'
        ? data.lastReadChapterIndex
        : typeof data.chapterIndex === 'number'
        ? data.chapterIndex
        : 1;

    const chapterTitle =
      data.lastReadChapterTitle || data.chapterTitle || `Chương ${chapterIndex}`;

    const progress =
      typeof data.lastReadProgress === 'number'
        ? data.lastReadProgress
        : typeof data.progress === 'number'
        ? data.progress
        : 0;

    const time =
      typeof data.lastReadTime === 'number'
        ? data.lastReadTime
        : typeof data.time === 'number'
        ? data.time
        : Date.now();

    return {
      storyId,
      chapterId,
      chapterIndex,
      chapterTitle,
      progress: Math.max(0, Math.min(100, progress)),
      time,
    };
  } catch (err) {
    console.warn(`[readingProgressService] Error reading progress for ${storyId}:`, err);
    return null;
  }
}

/**
 * Save progress immediately to localStorage
 */
function saveToLocalStorage(record: ReadingProgressData) {
  try {
    const payload = {
      storyId: record.storyId,
      // Standardized modern format
      lastReadChapterId: record.chapterId,
      lastReadChapterIndex: record.chapterIndex,
      lastReadChapterTitle: record.chapterTitle,
      lastReadProgress: record.progress,
      lastReadTime: record.time,
      // Backward-compatible fallback properties
      chapterId: record.chapterId,
      chapterIndex: record.chapterIndex,
      chapterTitle: record.chapterTitle,
      progress: record.progress,
      time: record.time,
    };

    localStorage.setItem(`last_read_${record.storyId}`, JSON.stringify(payload));
    localStorage.setItem('last_active_story_id', record.storyId);
  } catch (err) {
    console.warn('[readingProgressService] Failed to write localStorage:', err);
  }
}

// Memory buffer for debounced saving to database
let pendingSave: {
  record: ReadingProgressData;
  story: Story;
  timer: NodeJS.Timeout | null;
} | null = null;

async function executeDbSave(story: Story, record: ReadingProgressData) {
  const updateData = {
    lastReadChapterId: record.chapterId,
    lastReadChapterIndex: record.chapterIndex,
    lastReadChapterTitle: record.chapterTitle,
    lastReadProgress: record.progress,
    lastReadTime: record.time,
    updatedAt: Date.now(),
  };

  // 1. Always update local Dexie
  try {
    await db.stories.update(story.id, updateData);
  } catch (err) {
    console.warn('[readingProgressService] Error updating Dexie story:', err);
  }

  // 2. Persist to MongoDB Cloud
  try {
    await persistStory({
      ...story,
      ...updateData,
    });
  } catch (err) {
    console.warn('[readingProgressService] Error persisting story progress:', err);
  }
}

/**
 * Flush any pending progress save immediately (e.g. before unmount or switching chapters)
 */
export async function flushPendingProgress(): Promise<void> {
  if (pendingSave) {
    if (pendingSave.timer) {
      clearTimeout(pendingSave.timer);
      pendingSave.timer = null;
    }
    const { story, record } = pendingSave;
    pendingSave = null;
    await executeDbSave(story, record);
  }
}

/**
 * Update reading progress.
 * LocalStorage is updated immediately (or throttled).
 * Database write is debounced (800ms) to prevent hammering the network on rapid scrolling.
 */
export function recordReadingProgress(
  story: Story,
  chapter: Chapter,
  progress: number,
  immediate = false
): void {
  const record: ReadingProgressData = {
    storyId: story.id,
    chapterId: chapter.id,
    chapterIndex: chapter.chapterIndex,
    chapterTitle: chapter.title,
    progress: Math.max(0, Math.min(100, Math.round(progress))),
    time: Date.now(),
  };

  // Save to localStorage immediately so user never loses their position
  saveToLocalStorage(record);

  if (immediate) {
    if (pendingSave?.timer) {
      clearTimeout(pendingSave.timer);
    }
    pendingSave = null;
    executeDbSave(story, record).catch(() => {});
    return;
  }

  // Debounced database save
  if (pendingSave?.timer) {
    clearTimeout(pendingSave.timer);
  }

  pendingSave = {
    record,
    story,
    timer: setTimeout(() => {
      if (pendingSave) {
        const { story: s, record: r } = pendingSave;
        pendingSave = null;
        executeDbSave(s, r).catch(() => {});
      }
    }, 800),
  };
}

/**
 * Merges a Story with its latest reading progress from localStorage if it's newer
 */
export function mergeStoryWithProgress(story: Story): Story {
  const saved = getSavedReadingProgress(story.id);
  if (saved) {
    if (!story.lastReadTime || saved.time >= story.lastReadTime) {
      return {
        ...story,
        lastReadChapterId: saved.chapterId,
        lastReadChapterIndex: saved.chapterIndex,
        lastReadChapterTitle: saved.chapterTitle,
        lastReadProgress: saved.progress,
        lastReadTime: saved.time,
      };
    }
  }
  return story;
}
