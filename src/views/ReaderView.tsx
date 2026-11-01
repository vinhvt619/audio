import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Headphones,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Mic,
  Play,
  Pause,
  List,
  Loader2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import type { Story, Chapter } from '../types';
import { useReader, getThemeClasses } from '../context/ReaderContext';
import { useAudio } from '../context/AudioContext';
import { ChapterDrawer } from '../components/ChapterDrawer';
import { ReaderSettingsModal } from '../components/ReaderSettingsModal';
import { getOrFetchChapter } from '../services/chapterService';
import { splitReadingParagraphs } from '../services/readingText';
import { storySources, isCurrentChapterSource, sourceFallbackMessage } from '../data/storySources.js';
import {
  recordReadingProgress,
  flushPendingProgress,
  getSavedReadingProgress,
} from '../services/readingProgressService';

interface ReaderViewProps {
  story: Story;
  chapter: Chapter;
  chapters: Chapter[];
  onBack: () => void;
  onSelectChapter: (ch: Chapter) => void;
}

export const ReaderView: React.FC<ReaderViewProps> = ({
  story,
  chapter,
  chapters,
  onBack,
  onSelectChapter,
}) => {
  const { settings } = useReader();
  const themeClasses = getThemeClasses(settings.theme);

  const {
    currentStory,
    currentChapter,
    isPlaying,
    audioMode,
    activeParagraphIndex,
    playChapter,
    togglePlay,
    jumpToParagraph,
  } = useAudio();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [readProgress, setReadProgress] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const paragraphRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const hasCurrentChapterSource = isCurrentChapterSource(chapter) && (chapter.source !== 'archive' || !navigator.onLine);

  const [content, setContent] = useState<string>(hasCurrentChapterSource ? chapter.content || '' : '');
  const [isLoadingContent, setIsLoadingContent] = useState<boolean>(!chapter.content || !hasCurrentChapterSource);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resolvedChapter, setResolvedChapter] = useState<Chapter | null>(hasCurrentChapterSource ? chapter : null);

  const isRestoringScroll = useRef(false);

  // Fetch chapter content safely with cancellation & error recovery
  const loadContent = useCallback(() => {
    let isCancelled = false;
    setLoadError(null);

    if (chapter.content && hasCurrentChapterSource) {
      setContent(chapter.content);
      setResolvedChapter(chapter);
      setIsLoadingContent(false);
    } else {
      setIsLoadingContent(true);
      setContent('');
      setResolvedChapter(null);

      getOrFetchChapter(story.id, chapter.chapterIndex)
        .then((full) => {
          if (isCancelled) return;
          if (full && full.content) {
            setContent(full.content);
            setResolvedChapter(full);
          } else {
            setLoadError(`Không thể tải nội dung ${chapter.title}. Vui lòng thử lại.`);
          }
          setIsLoadingContent(false);
        })
        .catch((err) => {
          if (isCancelled) return;
          setLoadError(err.message || 'Lỗi mạng khi tải chương.');
          setIsLoadingContent(false);
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [chapter, story.id, hasCurrentChapterSource]);

  useEffect(() => {
    const cleanup = loadContent();
    return () => {
      cleanup();
    };
  }, [loadContent]);

  // Restore scroll position after content loaded, or reset to top for new chapter
  useEffect(() => {
    if (isLoadingContent || !content) return;

    const saved = getSavedReadingProgress(story.id);
    const isSameChapter = saved && (saved.chapterId === chapter.id || saved.chapterIndex === chapter.chapterIndex);

    if (isSameChapter && saved.progress > 0) {
      isRestoringScroll.current = true;
      const targetPercent = saved.progress;
      setReadProgress(targetPercent);

      // Wait for layout to settle before scrolling
      const timer = setTimeout(() => {
        const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (totalHeight > 0) {
          const targetTop = (targetPercent / 100) * totalHeight;
          window.scrollTo({ top: targetTop, behavior: 'auto' });
        }
        setTimeout(() => {
          isRestoringScroll.current = false;
        }, 150);
      }, 60);

      return () => clearTimeout(timer);
    } else {
      // New chapter - reset scroll and progress
      setReadProgress(0);
      window.scrollTo({ top: 0, behavior: 'auto' });
      recordReadingProgress(story, chapter, 0, true);
    }
  }, [isLoadingContent, content, chapter.id, story.id]);

  // Split chapter into readable paragraphs
  const paragraphs = splitReadingParagraphs(content);

  // Check if current chapter in audio context matches reader's chapter
  const isAudioActiveOnThisChapter = currentChapter?.id === chapter.id;
  const canSelectAudioParagraph =
    isAudioActiveOnThisChapter && currentStory?.id === story.id && audioMode === 'tts';

  // Auto-scroll to active paragraph if TTS is playing and setting is enabled
  useEffect(() => {
    if (
      isAudioActiveOnThisChapter &&
      audioMode === 'tts' &&
      isPlaying &&
      settings.autoScrollWithTTS
    ) {
      const activeEl = paragraphRefs.current[activeParagraphIndex];
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [activeParagraphIndex, isAudioActiveOnThisChapter, audioMode, isPlaying, settings.autoScrollWithTTS]);

  // Sync reader view if audio playback auto-advances to another chapter in the same story
  const lastActiveAudioChapterId = useRef(currentChapter?.id);
  useEffect(() => {
    if (
      isPlaying &&
      currentStory?.id === story.id &&
      currentChapter &&
      currentChapter.id !== chapter.id &&
      lastActiveAudioChapterId.current !== currentChapter.id
    ) {
      onSelectChapter(currentChapter);
    }
    lastActiveAudioChapterId.current = currentChapter?.id;
  }, [currentChapter, currentStory?.id, isPlaying, story.id, chapter.id, onSelectChapter]);

  // Track scroll progress with debounce and immediate localStorage persistence
  useEffect(() => {
    const handleScroll = () => {
      if (isRestoringScroll.current) return;

      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight <= 0) {
        setReadProgress(100);
        recordReadingProgress(story, chapter, 100, false);
        return;
      }

      const progress = Math.min(100, Math.max(0, Math.round((window.scrollY / totalHeight) * 100)));
      setReadProgress(progress);
      recordReadingProgress(story, chapter, progress, false);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [story, chapter]);

  // Flush pending progress on chapter change, view change, tab hide, and page unload
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingProgress();
      }
    };

    const handleBeforeUnload = () => {
      flushPendingProgress();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      flushPendingProgress();
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const handleStartTTSAtParagraph = (index: number) => {
    if (!canSelectAudioParagraph) return;

    // If user is currently selecting or copying text, do not start audio playback
    if (window.getSelection && window.getSelection()?.toString().trim().length) {
      return;
    }

    jumpToParagraph(index);
    if (!isPlaying) {
      togglePlay();
    }
  };

  const getMaxWidthClass = () => {
    switch (settings.maxWidth) {
      case 'narrow':
        return 'max-w-xl';
      case 'wide':
        return 'max-w-4xl';
      case 'full':
        return 'max-w-full px-4';
      case 'normal':
      default:
        return 'max-w-2xl';
    }
  };

  const currentIndex = chapters.findIndex((c) => c.id === chapter.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < chapters.length - 1;
  const [loadingNext, setLoadingNext] = useState(false);

  const handleGoPrev = () => {
    if (!hasPrev) return;
    flushPendingProgress();
    onSelectChapter(chapters[currentIndex - 1]);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const handleGoNext = async () => {
    flushPendingProgress();
    if (hasNext) {
      onSelectChapter(chapters[currentIndex + 1]);
      window.scrollTo({ top: 0, behavior: 'auto' });
    } else {
      setLoadingNext(true);
      try {
        const nextCh = await getOrFetchChapter(story.id, chapter.chapterIndex + 1);
        if (nextCh) {
          onSelectChapter(nextCh);
          window.scrollTo({ top: 0, behavior: 'auto' });
        } else {
          alert('Đã đến chương mới nhất của bộ truyện!');
        }
      } catch (err: any) {
        alert('Lỗi tải chương: ' + err.message);
      } finally {
        setLoadingNext(false);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`reader-content player-clearance min-h-screen transition-colors duration-300 ${themeClasses.bg} ${themeClasses.text}`}
      style={{
        fontFamily: settings.fontFamily === 'serif' ? 'Lora, serif' : 'Be Vietnam Pro, sans-serif',
      }}
    >
      {/* Top Floating Reading Toolbar */}
      <header
        className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors ${
          themeClasses.surface
        } ${themeClasses.border} bg-opacity-90 dark:bg-opacity-90 shadow-sm`}
      >
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          {/* Back & Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => {
                flushPendingProgress();
                onBack();
              }}
              className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title="Quay lại"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h2 className="font-bold text-xs sm:text-sm truncate">{resolvedChapter?.title || chapter.title}</h2>
              <p className={`text-[11px] truncate ${themeClasses.mutedText}`}>
                {story.title} • {story.author}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Quick Audio trigger */}
            <button
              onClick={() => {
                if (isAudioActiveOnThisChapter) {
                  togglePlay();
                } else {
                  playChapter(story, resolvedChapter || { ...chapter, content }, chapters);
                }
              }}
              className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              title={isPlaying && isAudioActiveOnThisChapter ? 'Tạm dừng đọc' : 'Phát âm thanh chương này'}
            >
              {isPlaying && isAudioActiveOnThisChapter ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span className="hidden sm:inline">Dừng</span>
                </>
              ) : (
                <>
                  <Headphones className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Nghe</span>
                </>
              )}
            </button>

            {/* Table of Contents Drawer */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title="Mục lục chương"
            >
              <List className="w-5 h-5" />
            </button>

            {/* Display settings */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title="Cài đặt cỡ chữ, màu nền"
            >
              <Sliders className="w-5 h-5" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors hidden sm:block"
              title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Reading progress line at the top edge */}
        <div className="h-0.5 w-full bg-transparent">
          <div
            className="h-full bg-indigo-600 transition-all duration-150"
            style={{ width: `${readProgress}%` }}
          />
        </div>
      </header>

      {/* Main Chapter Content */}
      <main className={`mx-auto px-4 sm:px-6 pt-8 sm:pt-12 ${getMaxWidthClass()}`}>
        {/* Chapter Header */}
        <div className="text-center mb-8 pb-6 border-b border-dashed border-gray-300/40 dark:border-zinc-700/50">
          <span className="text-xs uppercase tracking-widest font-semibold opacity-60">
            {story.title}
          </span>
          <h1 className="text-xl sm:text-3xl font-extrabold mt-2 tracking-tight">
            {resolvedChapter?.title || chapter.title}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs opacity-60 mt-3 font-sans">
            {storySources[story.id] && (
              <>
                {resolvedChapter?.source === 'archive' ? <span>Nguồn: Bản đã lưu</span> : (
                  <a href={resolvedChapter?.sourceUrl || chapter.sourceUrl || storySources[story.id].sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Nguồn: {storySources[story.id].sourceLabel}</a>
                )}
                <span>•</span>
              </>
            )}
            <span>{paragraphs.length} đoạn văn</span>
            <span>•</span>
            <span>Tiến độ: {readProgress}%</span>
            {chapter.hasAudioFile && (
              <>
                <span>•</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <Headphones className="w-3 h-3" />
                  Có audio riêng
                </span>
              </>
            )}
          </div>
          {resolvedChapter?.source === 'archive' && (
            <p className="text-xs opacity-70 mt-3 font-sans">{sourceFallbackMessage(resolvedChapter.sourceFallbackReason)}</p>
          )}
        </div>

        {/* Loading / Error / Paragraphs Reader */}
        {isLoadingContent ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <span className="text-sm font-medium">Đang tải nội dung {chapter.title}...</span>
          </div>
        ) : loadError ? (
          <div className="py-16 flex flex-col items-center justify-center gap-4 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center text-red-500">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-red-600 dark:text-red-400 max-w-md">{loadError}</p>
            <button
              onClick={loadContent}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-2 active:scale-95 transition-all shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Thử lại</span>
            </button>
          </div>
        ) : (
          <article
            className="space-y-6"
            style={{
              fontSize: `${settings.fontSize}px`,
              lineHeight: settings.lineHeight,
              textAlign: settings.textAlign,
              letterSpacing: `${settings.letterSpacing}px`,
            }}
          >
            {paragraphs.map((pText, idx) => {
              const isSpeakingThis =
                canSelectAudioParagraph && activeParagraphIndex === idx;

              return (
                <p
                  key={idx}
                  ref={(el) => {
                    paragraphRefs.current[idx] = el;
                  }}
                  onClick={canSelectAudioParagraph ? () => handleStartTTSAtParagraph(idx) : undefined}
                  className={`relative rounded-xl p-2.5 -mx-2.5 transition-all duration-300 ${
                    canSelectAudioParagraph ? 'group cursor-pointer' : ''
                  } ${
                    isSpeakingThis
                      ? themeClasses.activeParagraph
                      : canSelectAudioParagraph ? 'hover:bg-black/5 dark:hover:bg-white/5' : ''
                  }`}
                  title={canSelectAudioParagraph ? 'Nhấn vào để nghe đọc từ đoạn này bằng giọng AI' : undefined}
                >
                  {/* Floating TTS jump badge on hover */}
                  {canSelectAudioParagraph && (
                    <span className="absolute -left-7 top-3 hidden group-hover:flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white shadow-md text-[10px] animate-scale-in">
                      <Play className="w-3 h-3 fill-current ml-0.5" />
                    </span>
                  )}

                  {isSpeakingThis && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-sans font-bold px-1.5 py-0.5 rounded bg-indigo-600 text-white mr-2 align-middle">
                      <Mic className="w-3 h-3 animate-pulse" />
                      Đang đọc
                    </span>
                  )}

                  <span>{pText}</span>
                </p>
              );
            })}
          </article>
        )}

        {/* Chapter Navigation Footer */}
        <div className="mt-16 pt-8 border-t border-gray-300/40 dark:border-zinc-700/50 flex items-center justify-between gap-4 font-sans">
          <button
            onClick={handleGoPrev}
            disabled={!hasPrev}
            className={`px-4 py-2.5 rounded-xl border flex items-center gap-2 text-xs sm:text-sm font-semibold transition-all ${
              hasPrev
                ? 'border-gray-300 dark:border-zinc-700 hover:bg-black/5 dark:hover:bg-white/10 active:scale-95'
                : 'opacity-40 cursor-not-allowed border-transparent'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Chương trước</span>
          </button>

          <button
            onClick={() => setIsDrawerOpen(true)}
            className="text-xs font-semibold opacity-70 hover:opacity-100 flex items-center gap-1 py-2 px-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
          >
            <List className="w-4 h-4" />
            <span>Mục lục</span>
          </button>

          <button
            onClick={handleGoNext}
            disabled={loadingNext}
            className="px-4 py-2.5 rounded-xl border border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20 active:scale-95 flex items-center gap-2 text-xs sm:text-sm font-semibold transition-all disabled:opacity-60"
            title="Đọc chương tiếp theo"
          >
            {loadingNext ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang tải...</span>
              </>
            ) : (
              <>
                <span>Chương sau</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </main>

      {/* Chapter Drawer */}
      <ChapterDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        chapters={chapters}
        currentChapterId={chapter.id}
        onSelectChapter={(target) => {
          flushPendingProgress();
          onSelectChapter(target);
        }}
        storyTitle={story.title}
      />

      {/* Reader Settings Modal */}
      <ReaderSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};
