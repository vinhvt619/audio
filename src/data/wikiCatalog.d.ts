import type { Chapter } from '../types/index';
export interface WikiBook {
  sourceUrl: string;
  sourceTitle: string;
  description: string;
  status: string;
  chapters: { chapterIndex: number; title: string; path: string }[];
}
export const wikiCatalog: Record<string, WikiBook>;
export const WIKI_SOURCE_VERSION: string;
export function getWikiChapters(storyId: string): Chapter[];
export function isCurrentChapterSource(chapter: Chapter): boolean;
