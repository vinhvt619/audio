import type { Chapter } from '../types/index';
export interface StorySource {
  source: 'metruyenchu';
  sourceLabel: string;
  sourceVersion: string;
  sourceUrl: string;
  upstreamChapterCount: number;
  status: string;
  chapters: { chapterIndex: number; title: string; sourceChapterIndex?: number; sourceUrl?: string; fallbackReason?: string }[];
}
export const storySources: Record<string, StorySource>;
export function getSourceChapters(storyId: string): Chapter[];
export function isCurrentChapterSource(chapter: Chapter): boolean;
export function sourceFallbackMessage(reason?: string): string;
