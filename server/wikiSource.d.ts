import type { Chapter } from '../src/types/index';
export function parseWikiChapter(html: string, metadata: Chapter): Chapter;
export function fetchWikiChapter(storyId: string, chapterIndex: number): Promise<Chapter | null>;
