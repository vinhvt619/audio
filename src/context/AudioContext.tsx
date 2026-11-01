import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { Story, Chapter, TTSVoiceOption } from '../types';
import { ttsService, type TTSStatus, NATURAL_VI_VOICE_URI } from '../services/ttsService';
import { getChapterAudioUrl } from '../services/db';
import { getOrFetchChapter } from '../services/chapterService';
import { splitReadingParagraphs } from '../services/readingText';
import { isCurrentChapterSource } from '../data/storySources.js';
import { recordReadingProgress } from '../services/readingProgressService';

interface AudioContextType {
  currentStory: Story | null;
  currentChapter: Chapter | null;
  chapterList: Chapter[];
  audioMode: 'file' | 'tts';
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
  activeParagraphIndex: number;
  ttsStatus: TTSStatus;
  voices: TTSVoiceOption[];
  selectedVoiceURI: string;
  previewingVoiceURI: string | null;
  sleepTimerRemaining: number | null; // in seconds
  
  // Actions
  playChapter: (story: Story, chapter: Chapter, chapters?: Chapter[], initialMode?: 'file' | 'tts') => Promise<void>;
  togglePlay: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  skip: (seconds: number) => void;
  setMode: (mode: 'file' | 'tts') => void;
  setRate: (rate: number) => void;
  setAudioVolume: (vol: number) => void;
  toggleMute: () => void;
  setSelectedVoice: (voiceURI: string) => void;
  playVoicePreview: (voiceURI: string) => void;
  stopVoicePreview: () => void;
  setSleepTimer: (minutes: number | null) => void;
  jumpToParagraph: (index: number) => void;
  nextChapter: () => Promise<void>;
  prevChapter: () => Promise<void>;
  closeAudio: () => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [chapterList, setChapterList] = useState<Chapter[]>([]);
  const [audioMode, setAudioMode] = useState<'file' | 'tts'>('file');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  
  // TTS State
  const [activeParagraphIndex, setActiveParagraphIndex] = useState<number>(0);
  const [ttsStatus, setTtsStatus] = useState<TTSStatus>('idle');
  const [voices, setVoices] = useState<TTSVoiceOption[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [previewingVoiceURI, setPreviewingVoiceURI] = useState<string | null>(null);

  // Sleep timer
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);
  const sleepTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio HTML element
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioModeRef = useRef<'file' | 'tts'>(audioMode);
  const currentStoryRef = useRef<Story | null>(currentStory);
  const currentChapterRef = useRef<Chapter | null>(currentChapter);
  const chapterListRef = useRef<Chapter[]>(chapterList);
  const isPlayingRef = useRef<boolean>(isPlaying);

  useEffect(() => { currentStoryRef.current = currentStory; }, [currentStory]);
  useEffect(() => { currentChapterRef.current = currentChapter; }, [currentChapter]);
  useEffect(() => { chapterListRef.current = chapterList; }, [chapterList]);
  useEffect(() => { audioModeRef.current = audioMode; }, [audioMode]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  const handleNextChapterRef = useRef<() => Promise<void>>(() => Promise.resolve());

  // Initialize Audio element and TTS voices
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration || 0);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      // Auto play next chapter if sleep timer not expired
      handleNextChapterRef.current();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    // Load TTS Voices with Vietnamese natural voice as primary default or saved preference
    ttsService.getVoices().then((loadedVoices) => {
      setVoices(loadedVoices);
      const savedVoice = typeof window !== 'undefined' ? localStorage.getItem('tts_selected_voice') : null;
      const foundSaved = savedVoice ? loadedVoices.find((v) => v.voiceURI === savedVoice) : null;
      const naturalVoice = loadedVoices.find((v) => v.voiceURI === NATURAL_VI_VOICE_URI);
      const chosenVoice = foundSaved || naturalVoice || loadedVoices[0];
      if (chosenVoice) {
        setSelectedVoiceURI(chosenVoice.voiceURI);
        ttsService.setSettings({ voiceURI: chosenVoice.voiceURI });
      }
    });

    ttsService.onParagraphChange((idx) => {
      setActiveParagraphIndex(idx);
    });

    ttsService.onStatusChange((status) => {
      setTtsStatus(status);
      if (audioModeRef.current === 'tts') {
        setIsPlaying(status === 'playing');
      }
    });

    ttsService.onFinish(() => {
      handleNextChapterRef.current();
    });

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      ttsService.stop();
      if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
    };
  }, []);

  // Sleep timer countdown ticker
  useEffect(() => {
    if (sleepTimerRemaining === null) {
      if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
      return;
    }

    if (sleepTimerRemaining <= 0) {
      pause();
      setSleepTimerRemaining(null);
      return;
    }

    sleepTimerRef.current = setInterval(() => {
      setSleepTimerRemaining((prev) => {
        if (prev === null || prev <= 1) {
          pause();
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
    };
  }, [sleepTimerRemaining]);

  const getParagraphs = (chapter: Chapter): string[] => {
    if (!chapter || !chapter.content) return [];
    return splitReadingParagraphs(chapter.content);
  };

  const playChapter = async (
    story: Story,
    chapter: Chapter,
    chapters?: Chapter[],
    initialMode?: 'file' | 'tts'
  ) => {
    setCurrentStory(story);
    if (chapters) setChapterList(chapters);

    // If chapter.content is missing, fetch full chapter from server/mongo
    let targetChapter = chapter;
    if (!targetChapter.content || !isCurrentChapterSource(targetChapter)) {
      const full = await getOrFetchChapter(story.id, chapter.chapterIndex);
      if (full && full.content) {
        targetChapter = full;
      } else {
        setIsPlaying(false);
        return;
      }
    }
    setCurrentChapter(targetChapter);
    recordReadingProgress(story, targetChapter, 0, true);

    const hasAudio = !!targetChapter.hasAudioFile;
    const chosenMode = initialMode || (hasAudio ? 'file' : 'tts');
    setAudioMode(chosenMode);
    audioModeRef.current = chosenMode;

    if (chosenMode === 'tts') {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const paragraphs = getParagraphs(targetChapter);
      if (paragraphs.length === 0) {
        console.warn('[AudioContext] No paragraphs found for chapter:', targetChapter.title);
        setIsPlaying(false);
        return;
      }
      setActiveParagraphIndex(0);
      ttsService.setSettings({ rate: playbackRate, volume: isMuted ? 0 : volume });
      ttsService.startReading(paragraphs, 0);
      setIsPlaying(true);
      return;
    }

    // Audio file mode
    ttsService.stop();
    const audioUrl = await getChapterAudioUrl(targetChapter.id);
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.currentTime = targetChapter.lastAudioPosition || 0;
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (e) {
        console.warn('Audio play request interrupted:', e);
      }
    } else {
      // Fallback to TTS if audio file doesn't exist
      setAudioMode('tts');
      audioModeRef.current = 'tts';
      const paragraphs = getParagraphs(targetChapter);
      if (paragraphs.length === 0) {
        setIsPlaying(false);
        return;
      }
      setActiveParagraphIndex(0);
      ttsService.setSettings({ rate: playbackRate, volume: isMuted ? 0 : volume });
      ttsService.startReading(paragraphs, 0);
      setIsPlaying(true);
    }
  };

  const togglePlay = () => {
    if (audioMode === 'file') {
      if (!audioRef.current) return;
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(console.warn);
      }
    } else {
      // TTS mode
      if (ttsStatus === 'playing') {
        ttsService.pause();
        setIsPlaying(false);
      } else if (ttsStatus === 'paused') {
        ttsService.resume();
        setIsPlaying(true);
      } else if (currentChapter) {
        const paragraphs = getParagraphs(currentChapter);
        if (paragraphs.length > 0) {
          ttsService.startReading(paragraphs, activeParagraphIndex);
          setIsPlaying(true);
        }
      }
    }
  };

  const pause = () => {
    if (audioMode === 'file' && audioRef.current) {
      audioRef.current.pause();
    } else {
      ttsService.pause();
    }
    setIsPlaying(false);
  };

  const seek = (seconds: number) => {
    if (audioMode === 'file' && audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(seconds, duration));
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const skip = (deltaSeconds: number) => {
    if (audioMode === 'file' && audioRef.current) {
      const nextTime = Math.max(0, Math.min(audioRef.current.currentTime + deltaSeconds, duration));
      audioRef.current.currentTime = nextTime;
      setCurrentTime(nextTime);
    } else if (audioMode === 'tts') {
      if (deltaSeconds > 0) {
        ttsService.nextParagraph();
      } else {
        ttsService.prevParagraph();
      }
    }
  };

  const setMode = async (mode: 'file' | 'tts') => {
    if (mode === audioMode) return;
    setAudioMode(mode);
    audioModeRef.current = mode;

    if (mode === 'tts') {
      if (audioRef.current) audioRef.current.pause();
      if (currentChapter && isPlaying) {
        const paragraphs = getParagraphs(currentChapter);
        ttsService.startReading(paragraphs, activeParagraphIndex);
      }
    } else {
      ttsService.stop();
      if (currentChapter) {
        const url = await getChapterAudioUrl(currentChapter.id);
        if (url && audioRef.current) {
          audioRef.current.src = url;
          if (isPlaying) {
            audioRef.current.play().catch(console.warn);
          }
        }
      }
    }
  };

  const setRate = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
    ttsService.setSettings({ rate });
  };

  const setAudioVolume = (vol: number) => {
    setVolume(vol);
    setIsMuted(vol === 0);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
    ttsService.setSettings({ volume: vol });
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (audioRef.current) {
      audioRef.current.volume = nextMuted ? 0 : volume;
    }
    ttsService.setSettings({ volume: nextMuted ? 0 : volume });
  };

  const setSelectedVoice = (voiceURI: string) => {
    setSelectedVoiceURI(voiceURI);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tts_selected_voice', voiceURI);
    }
    ttsService.setSettings({ voiceURI });
    if (audioMode === 'tts' && isPlaying && currentChapter) {
      const paragraphs = getParagraphs(currentChapter);
      ttsService.startReading(paragraphs, activeParagraphIndex);
    }
  };

  const playVoicePreview = (voiceURI: string) => {
    setPreviewingVoiceURI(voiceURI);
    ttsService.playVoicePreview(voiceURI, () => {
      setPreviewingVoiceURI(null);
    });
  };

  const stopVoicePreview = () => {
    ttsService.stopPreview();
    setPreviewingVoiceURI(null);
  };

  const setSleepTimer = (minutes: number | null) => {
    if (minutes === null) {
      setSleepTimerRemaining(null);
    } else {
      setSleepTimerRemaining(minutes * 60);
    }
  };

  const jumpToParagraph = (index: number) => {
    setActiveParagraphIndex(index);
    if (audioMode === 'tts') {
      ttsService.jumpToParagraph(index);
    }
  };

  const handleNextChapter = async () => {
    const story = currentStoryRef.current;
    const chap = currentChapterRef.current;
    const list = chapterListRef.current;
    const mode = audioModeRef.current;
    if (!story || !chap) return;

    let nextChap: Chapter | null = null;
    if (list && list.length > 0) {
      const currentIndex = list.findIndex(
        (c) => c.id === chap.id || c.chapterIndex === chap.chapterIndex
      );
      if (currentIndex >= 0 && currentIndex < list.length - 1) {
        nextChap = list[currentIndex + 1];
      }
    }

    if (!nextChap) {
      try {
        const fetched = await getOrFetchChapter(story.id, chap.chapterIndex + 1);
        if (fetched) {
          nextChap = fetched;
        }
      } catch (err) {
        console.warn('[AudioContext] Failed to auto-fetch next chapter:', err);
      }
    }

    if (nextChap) {
      console.log('[AudioContext] Auto advancing to next chapter:', nextChap.title);
      await playChapter(story, nextChap, list, mode);
    } else {
      pause();
    }
  };
  handleNextChapterRef.current = handleNextChapter;

  const handlePrevChapter = async () => {
    const story = currentStoryRef.current;
    const chap = currentChapterRef.current;
    const list = chapterListRef.current;
    const mode = audioModeRef.current;
    if (!story || !chap) return;

    let prevChap: Chapter | null = null;
    if (list && list.length > 0) {
      const currentIndex = list.findIndex(
        (c) => c.id === chap.id || c.chapterIndex === chap.chapterIndex
      );
      if (currentIndex > 0) {
        prevChap = list[currentIndex - 1];
      }
    }

    if (!prevChap && chap.chapterIndex > 1) {
      try {
        const fetched = await getOrFetchChapter(story.id, chap.chapterIndex - 1);
        if (fetched) {
          prevChap = fetched;
        }
      } catch (err) {
        console.warn('[AudioContext] Failed to auto-fetch prev chapter:', err);
      }
    }

    if (prevChap) {
      await playChapter(story, prevChap, list, mode);
    }
  };

  const closeAudio = () => {
    pause();
    ttsService.stop();
    ttsService.stopPreview();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
    setCurrentStory(null);
    setCurrentChapter(null);
    setIsPlaying(false);
    if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
    setSleepTimerRemaining(null);
  };

  return (
    <AudioContext.Provider
      value={{
        currentStory,
        currentChapter,
        chapterList,
        audioMode,
        isPlaying,
        currentTime,
        duration,
        playbackRate,
        volume,
        isMuted,
        activeParagraphIndex,
        ttsStatus,
        voices,
        selectedVoiceURI,
        previewingVoiceURI,
        sleepTimerRemaining,
        playChapter,
        togglePlay,
        pause,
        seek,
        skip,
        setMode,
        setRate,
        setAudioVolume,
        toggleMute,
        setSelectedVoice,
        playVoicePreview,
        stopVoicePreview,
        setSleepTimer,
        jumpToParagraph,
        nextChapter: handleNextChapter,
        prevChapter: handlePrevChapter,
        closeAudio,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};
