import type { Chapter } from '../src/types/index';
export function parseMeTruyenChapter(html: string, metadata: Chapter): Chapter;
export function fetchMeTruyenChapter(storyId: string, chapterIndex: number): Promise<Chapter | null>;
