import { db, initSampleDataIfEmpty } from './db';
import type { Story, Chapter } from '../types';
import { mergeStoryWithProgress } from './readingProgressService';
import { storySources, getSourceChapters, isCurrentChapterSource } from '../data/storySources.js';

export interface MongoStatus {
  connected: boolean;
  uriConfigured: boolean;
  databaseName: string | null;
  storiesCount: number;
  chaptersCount: number;
  readOnly?: boolean;
  hosted?: boolean;
}

let cachedStatus: MongoStatus = {
  connected: false,
  uriConfigured: false,
  databaseName: null,
  storiesCount: 0,
  chaptersCount: 0,
};

export async function fetchDbStatus(): Promise<MongoStatus> {
  try {
    const res = await fetch('/api/db-status');
    if (res.ok) {
      cachedStatus = await res.json();
    } else {
      console.warn(`[dataService] DB status returned HTTP ${res.status}`);
    }
  } catch (err) {
    console.warn('[dataService] Failed to check db status:', err);
  }
  return cachedStatus;
}

export function getCachedDbStatus(): MongoStatus {
  return cachedStatus;
}

function hiddenHostedStories(): string[] {
  try { return JSON.parse(localStorage.getItem('audioread_hidden_stories') || '[]'); }
  catch { return []; }
}

export async function configureMongo(uri: string): Promise<{ ok: boolean; status?: MongoStatus; error?: string }> {
  try {
    const res = await fetch('/api/db-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uri: uri.trim() }),
    });

    const data = await res.json();
    if (res.ok && data.ok) {
      cachedStatus = data.status;
      return { ok: true, status: data.status };
    }
    return { ok: false, error: data.error || `HTTP ${res.status}: Kết nối thất bại` };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Lỗi mạng' };
  }
}

export async function syncSeedsToMongo(): Promise<MongoStatus> {
  try {
    const res = await fetch('/api/db-sync-seed', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      if (data.status) cachedStatus = data.status;
    }
  } catch (err) {
    console.error('Failed to sync seeds to mongo:', err);
  }
  return cachedStatus;
}

/**
 * Clear local browser IndexedDB data if explicitly requested by user in settings.
 * NEVER called automatically during read/fetch operations.
 */
export async function clearLocalDb(): Promise<void> {
  try {
    await db.stories.clear();
    await db.chapters.clear();
    console.log('[dataService] Local Dexie cache cleared successfully.');
  } catch (err) {
    console.warn('[dataService] Failed to clear local db:', err);
  }
}

/**
 * Clear only cached chapters from IndexedDB (Dexie).
 * Preserves user reading progress and custom imported stories.
 * Forces chapters to load fresh from MongoDB Atlas Cloud.
 */
export async function clearLocalChapterCache(): Promise<number> {
  try {
    const count = await db.chapters.count();
    await db.chapters.clear();
    console.log(`[dataService] Cleared ${count} cached chapters from local Dexie.`);
    return count;
  } catch (err) {
    console.warn('[dataService] Failed to clear local chapter cache:', err);
    return 0;
  }
}


/**
 * Unified Stories retrieval:
 * Merges Cloud stories with local-only stories and local progress.
 * Does NOT clear local Dexie data.
 */
export async function getStoriesList(): Promise<Story[]> {
  const status = await fetchDbStatus();
  let cloudStories: Story[] = [];
  let cloudFetchSuccess = false;

  if (status.connected) {
    try {
      const res = await fetch('/api/stories');
      if (res.ok) {
        cloudStories = await res.json();
        cloudFetchSuccess = true;
      } else {
        console.warn(`[dataService] Cloud /api/stories returned HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn('[dataService] Failed to fetch stories from Mongo:', err);
    }
  }

  // Get local Dexie stories
  let localStories: Story[] = [];
  try {
    localStories = await db.stories.toArray();
  } catch (err) {
    console.warn('[dataService] Failed to query local Dexie stories:', err);
  }

  // If both are empty and not connected to cloud, seed sample data
  if (!cloudFetchSuccess && localStories.length === 0) {
    await initSampleDataIfEmpty();
    localStories = await db.stories.toArray();
  }

  // Merge Cloud stories with local stories without deleting local-only items
  const storyMap = new Map<string, Story>();

  // 1. Add cloud stories
  for (const cs of cloudStories) {
    if (status.readOnly && hiddenHostedStories().includes(cs.id)) continue;
    const withProgress = mergeStoryWithProgress(cs);
    storyMap.set(cs.id, withProgress);

    // Keep Dexie in sync as offline cache (upsert without wiping)
    db.stories.put(withProgress).catch(() => {});
  }

  // 2. Add or reconcile local stories
  for (const ls of localStories) {
    if (status.readOnly && hiddenHostedStories().includes(ls.id)) continue;
    if (!storyMap.has(ls.id)) {
      // Local-only story (e.g. user imported an EPUB or TXT file locally)
      const withProgress = mergeStoryWithProgress(ls);
      storyMap.set(ls.id, withProgress);
    } else {
      // Story exists in both: preserve whichever has newer reading progress
      const existing = storyMap.get(ls.id)!;
      if (ls.lastReadTime && (!existing.lastReadTime || ls.lastReadTime > existing.lastReadTime)) {
        storyMap.set(ls.id, {
          ...existing,
          lastReadChapterId: ls.lastReadChapterId,
          lastReadChapterIndex: ls.lastReadChapterIndex,
          lastReadChapterTitle: ls.lastReadChapterTitle,
          lastReadProgress: ls.lastReadProgress,
          lastReadTime: ls.lastReadTime,
        });
      }
    }
  }

  const list = Array.from(storyMap.values());
  for (const story of list) {
    const book = storySources[story.id];
    if (book) {
      story.chaptersCount = book.chapters.length;
      story.sourceUrl = book.sourceUrl;
    }
  }
  // Sort by latest updated / read
  return list.sort((a, b) => (b.lastReadTime || b.updatedAt) - (a.lastReadTime || a.updatedAt));
}

/**
 * Unified Story saving:
 * Always writes to local Dexie, and syncs to MongoDB Atlas if connected.
 */
export async function persistStory(story: Story): Promise<{ ok: boolean; error?: string }> {
  // 1. Always persist to local Dexie for instant UI response and offline safety
  try {
    await db.stories.put(story);
  } catch (err: any) {
    console.warn('[dataService] Failed to write story to Dexie:', err);
  }

  // 2. Sync to Mongo if connected
  if (cachedStatus.connected && !cachedStatus.readOnly) {
    try {
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(story),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.warn(`[dataService] Failed to persist story to Mongo (HTTP ${res.status}):`, errorText);
        return { ok: false, error: `Lỗi máy chủ (${res.status})` };
      }
      return { ok: true };
    } catch (err: any) {
      console.warn('[dataService] Network error persisting story to Mongo:', err);
      return { ok: false, error: err.message || 'Lỗi mạng khi lưu Cloud' };
    }
  }

  return { ok: true };
}

/**
 * Unified Story deleting:
 * Deletes from both local Dexie and MongoDB Cloud.
 */
export async function removeStory(storyId: string): Promise<{ ok: boolean; error?: string }> {
  if (cachedStatus.readOnly) {
    localStorage.setItem('audioread_hidden_stories', JSON.stringify([...new Set([...hiddenHostedStories(), storyId])]));
  }
  try {
    await db.stories.delete(storyId);
    await db.chapters.where('storyId').equals(storyId).delete();
  } catch (err) {
    console.warn('[dataService] Failed to delete story from Dexie:', err);
  }

  if (cachedStatus.connected && !cachedStatus.readOnly) {
    try {
      const res = await fetch(`/api/stories?id=${encodeURIComponent(storyId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        return { ok: false, error: `Xóa trên Cloud thất bại (HTTP ${res.status})` };
      }
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Lỗi mạng khi xóa truyện' };
    }
  }

  return { ok: true };
}

/**
 * Save a single chapter to Dexie and Cloud
 */
export async function persistChapter(chapter: Chapter): Promise<{ ok: boolean; error?: string }> {
  try {
    await db.chapters.put(chapter);
  } catch (err) {
    console.warn('[dataService] Error saving chapter to Dexie:', err);
  }

  if (cachedStatus.connected && !cachedStatus.readOnly) {
    try {
      const res = await fetch('/api/chapter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chapter),
      });
      if (!res.ok) {
        return { ok: false, error: `HTTP ${res.status}` };
      }
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  return { ok: true };
}

/**
 * Save multiple chapters to Dexie and Cloud
 */
export async function persistChaptersBatch(chapters: Chapter[]): Promise<{ ok: boolean; count: number; error?: string }> {
  try {
    await db.chapters.bulkPut(chapters);
  } catch (err) {
    console.warn('[dataService] Error bulk putting chapters to Dexie:', err);
  }

  if (cachedStatus.connected && !cachedStatus.readOnly && chapters.length > 0) {
    try {
      const res = await fetch('/api/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chapters),
      });
      if (!res.ok) {
        return { ok: false, count: 0, error: `HTTP ${res.status}` };
      }
      const data = await res.json();
      return { ok: true, count: data.count || chapters.length };
    } catch (err: any) {
      return { ok: false, count: 0, error: err.message };
    }
  }

  return { ok: true, count: chapters.length };
}

/**
 * Unified Chapters retrieval:
 * Fetches from Cloud if connected, caches to Dexie, falls back to Dexie if offline.
 */
export async function getStoryChapters(storyId: string): Promise<Chapter[]> {
  if (storySources[storyId]) {
    const local = await db.chapters.where('storyId').equals(storyId).toArray();
    const byIndex = new Map(local.map(ch => [ch.chapterIndex, ch]));
    return getSourceChapters(storyId).map(metadata => {
      const cached = byIndex.get(metadata.chapterIndex);
      if (cached?.content && isCurrentChapterSource(cached) && (cached.source !== 'archive' || !navigator.onLine)) return { ...metadata, ...cached };
      return {
        ...cached, ...metadata,
        content: '',
        hasAudioFile: cached?.hasAudioFile || false,
      };
    });
  }
  if (cachedStatus.connected) {
    try {
      const res = await fetch(`/api/story-chapters?storyId=${encodeURIComponent(storyId)}`);
      if (res.ok) {
        const chaps: Chapter[] = await res.json();
        if (chaps && chaps.length > 0) {
          const local = await db.chapters.where('storyId').equals(storyId).toArray();
          const merged = new Map(chaps.map(ch => [ch.id, ch]));
          for (const ch of local) merged.set(ch.id, { ...merged.get(ch.id), ...ch });
          return [...merged.values()].sort((a, b) => a.chapterIndex - b.chapterIndex);
        }
      }
    } catch (err) {
      console.warn('[dataService] Failed to fetch story chapters from Mongo:', err);
    }
  }

  return await db.chapters
    .where('storyId')
    .equals(storyId)
    .sortBy('chapterIndex');
}
