import type { Chapter } from '../src/types/index';
export function fetchLiveChapter(story: string, chapNum: number): Promise<Chapter | null>;
