import type { Chapter } from '../src/types/index';
export function resolvePreferredChapter(storyId: string, index: number, storage: {
  readCache: (storyId: string, index: number) => Promise<Chapter | null>;
  readArchive: (storyId: string, index: number) => Promise<Chapter | null>;
  writeCache: (chapter: Chapter) => Promise<void>;
}): Promise<Chapter | null>;
