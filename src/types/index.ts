export type ReaderTheme = 'light' | 'sepia' | 'dark' | 'night' | 'forest';
export type ReaderFont = 'sans' | 'serif';
export type ReaderWidth = 'narrow' | 'normal' | 'wide' | 'full';

export interface Story {
  id: string;
  title: string;
  author: string;
  description: string;
  coverUrl?: string;
  category?: string;
  createdAt: number;
  updatedAt: number;
  lastReadChapterId?: string;
  lastReadChapterTitle?: string;
  lastReadChapterIndex?: number;
  lastReadProgress?: number; // 0 - 100 percentage
  lastReadTime?: number;
  chaptersCount: number;
  sourceUrl?: string;
}

export interface Chapter {
  id: string;
  storyId: string;
  chapterIndex: number;
  title: string;
  content: string; // Plain text or paragraphs with \n\n
  audioUrl?: string; // Blob URL or data URL
  hasAudioFile?: boolean;
  audioDuration?: number;
  lastAudioPosition?: number; // seconds
  source?: 'wikicv' | 'metruyenchu' | 'archive';
  sourceVersion?: string;
  sourceUrl?: string;
  sourceChapterIndex?: number;
  sourceCheckedAt?: number;
  sourceFallbackReason?: string;
}

export interface AudioAttachment {
  id: string;
  chapterId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  blob: Blob;
  duration?: number;
  createdAt: number;
}

export interface ReaderSettings {
  theme: ReaderTheme;
  fontFamily: ReaderFont;
  fontSize: number; // 14 to 32 px
  lineHeight: number; // 1.4 to 2.4
  letterSpacing: number; // -0.5 to 2 px
  paragraphSpacing: number; // 12 to 36 px
  maxWidth: ReaderWidth;
  textAlign: 'left' | 'justify';
  autoScrollWithTTS: boolean;
  bionicReading: boolean;
}

export interface TTSVoiceOption {
  voiceURI: string;
  name: string;
  lang: string;
  isDefault: boolean;
  isVietnamese?: boolean;
  gender?: 'female' | 'male' | 'other';
  provider?: 'edge' | 'google' | 'system';
  style?: string;
  description?: string;
  recommended?: boolean;
}

export interface TTSSettings {
  voiceURI?: string;
  rate: number; // 0.5 to 2.5
  pitch: number; // 0.5 to 1.5
  volume: number; // 0 to 1
}

export interface Bookmark {
  id: string;
  storyId: string;
  chapterId: string;
  paragraphIndex: number;
  snippet: string;
  createdAt: number;
}
