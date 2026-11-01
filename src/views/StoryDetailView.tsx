import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Headphones,
  Plus,
  Music,
  Trash2,
  Sparkles,
  Search,
  Upload,
  Download,
  Compass,
  Loader2,
  Bookmark,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
} from 'lucide-react';
import type { Story, Chapter } from '../types';
import { saveChapterAudio, removeChapterAudio, reseedRequestedStories } from '../services/db';
import { getOrFetchChapter, syncBatchChapters, STORY_MAX_CHAPTERS } from '../services/chapterService';
import { getStoryChapters, persistStory, persistChapter } from '../services/dataService';
import { useAudio } from '../context/AudioContext';
import { mergeStoryWithProgress } from '../services/readingProgressService';
import { storySources } from '../data/storySources.js';

interface StoryDetailViewProps {
  story: Story;
  onBack: () => void;
  onReadChapter: (chapter: Chapter, chapters: Chapter[]) => void;
  onPlayChapter: (chapter: Chapter, chapters: Chapter[]) => void;
  onRefreshStory: () => void;
}

export const StoryDetailView: React.FC<StoryDetailViewProps> = ({
  story,
  onBack,
  onReadChapter,
  onPlayChapter,
  onRefreshStory,
}) => {
  const { currentStory, currentChapter, isPlaying, togglePlay } = useAudio();
  const activeStoryProgress = useMemo(() => mergeStoryWithProgress(story), [story]);

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoadingChapters, setIsLoadingChapters] = useState(true);
  const [search, setSearch] = useState('');
  const [jumpChapterNum, setJumpChapterNum] = useState('');
  const [isJumping, setIsJumping] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [showAddChapterModal, setShowAddChapterModal] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterContent, setNewChapterContent] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100;

  const jumpToReadingChapter = () => {
    const targetIdx = activeStoryProgress.lastReadChapterIndex;
    if (!targetIdx) return;
    const page = Math.ceil(targetIdx / pageSize) || 1;
    setCurrentPage(page);
    setTimeout(() => {
      const el = document.getElementById(`chapter-item-${activeStoryProgress.lastReadChapterId || activeStoryProgress.lastReadChapterIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  useEffect(() => {
    loadChapters();
  }, [story.id]);

  const loadChapters = async (): Promise<Chapter[]> => {
    setIsLoadingChapters(true);
    try {
      const list = await getStoryChapters(story.id);
      setChapters(list);
      return list;
    } finally {
      setIsLoadingChapters(false);
    }
  };

  const handleAudioUploadForChapter = async (
    e: React.ChangeEvent<HTMLInputElement>,
    chapterId: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await saveChapterAudio(chapterId, file);
      alert('Đã tải lên và gắn file âm thanh thành công!');
      loadChapters();
    } catch (err: any) {
      alert('Lỗi khi tải file: ' + err.message);
    }
  };

  const handleRemoveAudio = async (chapterId: string) => {
    if (confirm('Bạn có muốn gỡ bỏ file audio của chương này?')) {
      await removeChapterAudio(chapterId);
      loadChapters();
    }
  };

  const handleAddChapter = async () => {
    if (!newChapterTitle.trim() || !newChapterContent.trim()) {
      alert('Vui lòng nhập tiêu đề và nội dung chương');
      return;
    }

    const currentMaxIndex = chapters.length > 0 ? Math.max(...chapters.map((c) => c.chapterIndex || 0)) : 0;
    const nextIndex = currentMaxIndex + 1;
    const newChap: Chapter = {
      id: `${story.id}-chap-${Date.now()}`,
      storyId: story.id,
      chapterIndex: nextIndex,
      title: newChapterTitle.trim(),
      content: newChapterContent.trim(),
      hasAudioFile: false,
    };

    await persistChapter(newChap);
    await persistStory({
      ...story,
      chaptersCount: Math.max(story.chaptersCount, nextIndex),
      updatedAt: Date.now(),
    });

    setNewChapterTitle('');
    setNewChapterContent('');
    setShowAddChapterModal(false);
    await loadChapters();
    onRefreshStory();
  };

  const handleJumpToChapter = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const num = parseInt(jumpChapterNum.trim(), 10);
    if (isNaN(num) || num < 1) {
      alert('Vui lòng nhập số chương hợp lệ (ví dụ: 101, 200, 500)');
      return;
    }

    setIsJumping(true);
    try {
      const ch = await getOrFetchChapter(story.id, num);
      if (ch) {
        const freshList = await loadChapters();
        onReadChapter(ch, freshList.length > 0 ? freshList : chapters);
      } else {
        alert(`Không tìm thấy chương ${num} của bộ truyện này.`);
      }
    } catch (err: any) {
      alert('Lỗi tải chương: ' + err.message);
    } finally {
      setIsJumping(false);
    }
  };

  const storyMeta = STORY_MAX_CHAPTERS[story.id];
  const currentMaxIndex = chapters.length > 0 ? Math.max(...chapters.map((c) => c.chapterIndex || 0)) : 0;
  const maxSourceChapters = storyMeta?.total || story.chaptersCount;
  const remainingAvailable = storySources[story.id]
    ? chapters.filter(ch => !ch.content).length
    : Math.max(0, maxSourceChapters - currentMaxIndex);

  const handleDownloadMoreChapters = async (count = 50) => {
    if (remainingAvailable <= 0) {
      alert('Tác phẩm đã tải đủ tất cả các chương từ nguồn!');
      return;
    }

    const toFetch = Math.min(count, remainingAvailable);
    setIsSyncing(true);
    setSyncStatus(`Đang chuẩn bị tải thêm ${toFetch} chương tiếp theo...`);
    try {
      let actualSaved = 0;
      if (storySources[story.id]) {
        const missing = chapters.filter(ch => !ch.content).slice(0, toFetch);
        for (const [index, ch] of missing.entries()) {
          if (await getOrFetchChapter(story.id, ch.chapterIndex)) actualSaved++;
          setSyncStatus(`Đang tải từ nguồn: ${index + 1}/${missing.length} chương...`);
        }
      } else {
        actualSaved = await syncBatchChapters(story.id, currentMaxIndex + 1, toFetch, (done, total) => {
          setSyncStatus(`Đang tải từ nguồn: ${done}/${total} chương...`);
        });
      }
      const freshList = await loadChapters();
      onRefreshStory();
      setSyncStatus(`Đã tải thành công ${actualSaved} chương mới! Hiện có ${freshList.length} chương.`);
      setTimeout(() => setSyncStatus(null), 3500);
    } catch (err: any) {
      setSyncStatus(`Lỗi khi tải: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredChapters = useMemo(() => {
    return chapters.filter((c) =>
      c.title.toLowerCase().includes(search.toLowerCase())
    );
  }, [chapters, search]);

  const totalPages = Math.ceil(filteredChapters.length / pageSize) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const pagedChapters = useMemo(() => {
    if (search.trim()) return filteredChapters;
    const start = (currentPage - 1) * pageSize;
    return filteredChapters.slice(start, start + pageSize);
  }, [filteredChapters, currentPage, search]);

  return (
    <div className="player-clearance max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-fade-in">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Quay lại Tủ sách</span>
      </button>

      {/* Story Info Header */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-gray-200/90 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row gap-6 sm:gap-8 items-start">
        {/* Cover */}
        <div className="w-28 sm:w-44 md:w-48 aspect-[3/4] rounded-2xl overflow-hidden bg-gray-100 dark:bg-zinc-800 shadow-md flex-shrink-0 mx-auto md:mx-0">
          {story.coverUrl ? (
            <img
              src={story.coverUrl}
              alt={story.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-indigo-50 dark:bg-indigo-950 text-indigo-600 font-bold text-4xl">
              {story.title.slice(0, 2)}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 space-y-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                {story.category || 'Văn học'}
              </span>
              {storyMeta && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>{storyMeta.status}</span>
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mt-2">
              {story.title}
            </h1>
            <p className="text-sm font-medium text-gray-600 dark:text-zinc-400 mt-1">
              Tác giả: <span className="text-gray-900 dark:text-zinc-200 font-semibold">{story.author}</span>
            </p>
          </div>

          <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-300 leading-relaxed bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-2xl">
            {story.description || 'Chưa có thông tin tóm tắt.'}
          </p>
          {story.sourceUrl && (
            <a href={story.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-xs text-indigo-600 dark:text-indigo-400 underline underline-offset-2">
              Nguồn ưu tiên: {storySources[story.id]?.sourceLabel || 'Xem nguồn'}
            </a>
          )}

          {/* Sync status alert */}
          {syncStatus && (
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center gap-2 border border-indigo-200 dark:border-indigo-800 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{syncStatus}</span>
            </div>
          )}

          {/* Dedicated Latest Reading Progress Banner */}
          {chapters.length > 0 && (() => {
            const lastReadChapter =
              chapters.find((c) => c.id === activeStoryProgress.lastReadChapterId) ||
              (activeStoryProgress.lastReadChapterIndex
                ? chapters.find((c) => c.chapterIndex === activeStoryProgress.lastReadChapterIndex)
                : null);

            const isAudioActiveOnLastRead =
              currentStory?.id === story.id &&
              lastReadChapter &&
              currentChapter?.id === lastReadChapter.id;

            if (lastReadChapter) {
              return (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-violet-500/10 border border-amber-300/50 dark:border-amber-700/50 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-[11px] font-bold flex items-center gap-1 border border-amber-300 dark:border-amber-700/60">
                        <Bookmark className="w-3 h-3 fill-current text-amber-600 dark:text-amber-400" />
                        <span>Chương bạn đang đọc gần nhất</span>
                      </span>
                      {activeStoryProgress.lastReadProgress !== undefined && (
                        <span className="text-xs font-semibold text-gray-600 dark:text-zinc-300">
                          • Đã đọc: {activeStoryProgress.lastReadProgress}%
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={jumpToReadingChapter}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 self-start sm:self-auto"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>Xem vị trí trong danh sách</span>
                    </button>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate">
                      Chương {lastReadChapter.chapterIndex}: {lastReadChapter.title}
                    </h3>
                    <div className="w-full h-2 bg-gray-200 dark:bg-zinc-800 rounded-full overflow-hidden mt-1.5">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 via-indigo-500 to-violet-500 rounded-full transition-all duration-300"
                        style={{ width: `${activeStoryProgress.lastReadProgress || 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      onClick={() => onReadChapter(lastReadChapter, chapters)}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-600/30 active:scale-95 transition-all flex items-center gap-2"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Đọc tiếp (Chương {lastReadChapter.chapterIndex})</span>
                    </button>

                    <button
                      onClick={() => {
                        if (isAudioActiveOnLastRead) {
                          togglePlay();
                        } else {
                          onPlayChapter(lastReadChapter, chapters);
                        }
                      }}
                      className={`px-4 py-2.5 rounded-xl text-white text-xs sm:text-sm font-semibold shadow-md active:scale-95 transition-all flex items-center gap-2 ${
                        isAudioActiveOnLastRead && isPlaying
                          ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                          : 'bg-violet-600 hover:bg-violet-700 shadow-violet-600/30'
                      }`}
                      title={isAudioActiveOnLastRead && isPlaying ? 'Tạm dừng đọc' : 'Phát âm thanh'}
                    >
                      {isAudioActiveOnLastRead && isPlaying ? (
                        <>
                          <Pause className="w-4 h-4 fill-current" />
                          <span>Tạm dừng nghe</span>
                        </>
                      ) : isAudioActiveOnLastRead ? (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          <span>Tiếp tục nghe</span>
                        </>
                      ) : (
                        <>
                          <Headphones className="w-4 h-4" />
                          <span>Nghe tiếp (Chương {lastReadChapter.chapterIndex})</span>
                        </>
                      )}
                    </button>

                    {lastReadChapter.chapterIndex > 1 && (
                      <button
                        onClick={() => onReadChapter(chapters[0], chapters)}
                        className="px-3 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5"
                        title="Bắt đầu lại từ chương 1"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                        <span>Chương 1</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => onReadChapter(chapters[0], chapters)}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-600/30 active:scale-95 transition-all flex items-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Đọc chương 1</span>
                </button>

                <button
                  onClick={() => onPlayChapter(chapters[0], chapters)}
                  className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs sm:text-sm font-semibold shadow-md shadow-violet-600/30 active:scale-95 transition-all flex items-center gap-2"
                >
                  <Headphones className="w-4 h-4" />
                  <span>Nghe chương 1</span>
                </button>
              </div>
            );
          })()}

          {/* Additional Management Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {remainingAvailable > 0 ? (
              <button
                onClick={() => handleDownloadMoreChapters(Math.min(50, remainingAvailable))}
                disabled={isSyncing}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                title={`Tải thêm ${Math.min(50, remainingAvailable)} chương tiếp theo trực tiếp từ nguồn`}
              >
                {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>Tải thêm {Math.min(50, remainingAvailable)} chương</span>
              </button>
            ) : (
              <span className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold flex items-center gap-1.5 select-none">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                <span>Đã đủ toàn bộ chương ({chapters.length}/{maxSourceChapters})</span>
              </span>
            )}

            <button
              onClick={() => setShowAddChapterModal(true)}
              className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-200 text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm chương</span>
            </button>

            <button
              onClick={async () => {
                await reseedRequestedStories();
                await loadChapters();
                onRefreshStory();
              }}
              className="px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5"
              title="Đồng bộ lại toàn bộ các chương đã lấy từ nguồn"
            >
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>Cập nhật số chương</span>
            </button>
          </div>
        </div>
      </div>

      {/* Chapter List Section */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-gray-200/90 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-gray-100 dark:border-zinc-800">
          <div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
              <span>Danh sách chương ({chapters.length})</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Nghe bằng giọng đọc AI tiếng Việt hoặc đọc chữ mượt mà
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Direct Jump Input */}
            <form onSubmit={handleJumpToChapter} className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                value={jumpChapterNum}
                onChange={(e) => setJumpChapterNum(e.target.value)}
                placeholder="Số chương..."
                className="w-28 px-3 py-1.5 bg-gray-50 dark:bg-zinc-800 rounded-xl text-xs sm:text-sm border border-gray-200 dark:border-zinc-700 text-gray-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={isJumping || !jumpChapterNum}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1 active:scale-95 disabled:opacity-50"
              >
                {isJumping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Compass className="w-3.5 h-3.5" />}
                <span>Đọc ngay</span>
              </button>
            </form>

            {/* Filter Search */}
            <div className="relative w-48 sm:w-56">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tên chương..."
                className="w-full pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-zinc-800 rounded-xl text-xs sm:text-sm border border-transparent focus:border-indigo-500 focus:outline-none text-gray-800 dark:text-zinc-200"
              />
            </div>
          </div>
        </div>

        {/* Chapters list */}
        {isLoadingChapters ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            <span className="text-xs">Đang tải danh sách chương...</span>
          </div>
        ) : filteredChapters.length === 0 ? (
          <div className="py-12 text-center text-gray-500 dark:text-zinc-400 text-sm">
            {search ? 'Không tìm thấy chương nào phù hợp với từ khóa.' : 'Chưa có chương nào trong bộ truyện này.'}
          </div>
        ) : (
          <>
            {/* Top Pagination controls if totalPages > 1 and not searching */}
            {!search.trim() && totalPages > 1 && (
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-zinc-800 text-xs font-semibold">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Trang trước</span>
                </button>

                <div className="flex items-center gap-2 text-gray-500 dark:text-zinc-400">
                  <span>Trang {currentPage} / {totalPages}</span>
                  <span className="hidden sm:inline">
                    (Chương {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredChapters.length)})
                  </span>
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 rounded-lg border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-all"
                >
                  <span>Trang sau</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="divide-y divide-gray-100 dark:divide-zinc-800/80">
            {pagedChapters.map((ch) => {
              const isLastRead =
                ch.id === activeStoryProgress.lastReadChapterId ||
                (activeStoryProgress.lastReadChapterIndex !== undefined && ch.chapterIndex === activeStoryProgress.lastReadChapterIndex);

              const isThisAudioActive = currentStory?.id === story.id && currentChapter?.id === ch.id;
              const isThisPlaying = isThisAudioActive && isPlaying;

              return (
                <div
                  id={`chapter-item-${ch.id || ch.chapterIndex}`}
                  key={ch.id}
                  className={`py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl px-2 transition-colors ${
                    isLastRead
                      ? 'bg-amber-50/80 dark:bg-amber-950/30 border-l-4 border-amber-500 pl-3'
                      : 'hover:bg-gray-50/60 dark:hover:bg-zinc-800/40'
                  }`}
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-gray-400 w-8">
                      #{ch.chapterIndex}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-gray-800 dark:text-zinc-200 truncate">
                          {ch.title}
                        </h4>
                        {isLastRead && (
                          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700/60 flex items-center gap-1 flex-shrink-0">
                            <Bookmark className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400 fill-current" />
                            <span>Chương đang đọc ({activeStoryProgress.lastReadProgress || 0}%)</span>
                          </span>
                        )}
                        {isThisAudioActive && (
                          <span className="text-[10px] font-bold text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/60 px-2 py-0.5 rounded-full border border-violet-300 dark:border-violet-700/60 flex items-center gap-1 flex-shrink-0">
                            <Sparkles className="w-2.5 h-2.5 text-violet-600 dark:text-violet-400" />
                            <span>{isThisPlaying ? 'Đang phát' : 'Đang tạm dừng'}</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                      {ch.hasAudioFile ? (
                        <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Music className="w-3 h-3" />
                          <span>Có file audio</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-violet-600 dark:text-violet-400 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>Hỗ trợ giọng AI</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions for this chapter */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => onReadChapter(ch, chapters)}
                    className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-indigo-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 hover:text-indigo-600 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Đọc</span>
                  </button>

                  <button
                    onClick={() => {
                      if (isThisAudioActive) {
                        togglePlay();
                      } else {
                        onPlayChapter(ch, chapters);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                      isThisPlaying
                        ? 'bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 shadow-sm'
                        : isThisAudioActive
                        ? 'bg-violet-100 hover:bg-violet-200 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300'
                        : 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                    }`}
                    title={
                      isThisPlaying
                        ? 'Tạm dừng đọc âm thanh'
                        : isThisAudioActive
                        ? 'Phát tiếp âm thanh'
                        : 'Phát âm thanh chương này'
                    }
                  >
                    {isThisPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        <span>Tạm dừng</span>
                      </>
                    ) : isThisAudioActive ? (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Phát tiếp</span>
                      </>
                    ) : (
                      <>
                        <Headphones className="w-3.5 h-3.5" />
                        <span>Nghe</span>
                      </>
                    )}
                  </button>

                  {/* Upload or remove audio button */}
                  <label
                    className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 text-gray-500 hover:text-indigo-600 text-xs font-medium cursor-pointer transition-colors flex items-center gap-1"
                    title="Gắn file âm thanh riêng cho chương này"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Gắn MP3</span>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => handleAudioUploadForChapter(e, ch.id)}
                      className="hidden"
                    />
                  </label>

                  {ch.hasAudioFile && (
                    <button
                      onClick={() => handleRemoveAudio(ch.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-400 hover:text-red-500 transition-colors"
                      title="Gỡ bỏ file audio"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          </div>

          {/* Bottom Pagination controls */}
          {!search.trim() && totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-zinc-800 text-xs font-semibold">
              <button
                onClick={() => {
                  setCurrentPage((p) => Math.max(1, p - 1));
                  window.scrollTo({ top: 350, behavior: 'smooth' });
                }}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Trang trước</span>
              </button>

              <div className="flex items-center gap-2 text-gray-500 dark:text-zinc-400">
                <span>Trang {currentPage} / {totalPages}</span>
                <span className="hidden sm:inline">
                  ({(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredChapters.length)})
                </span>
              </div>

              <button
                onClick={() => {
                  setCurrentPage((p) => Math.min(totalPages, p + 1));
                  window.scrollTo({ top: 350, behavior: 'smooth' });
                }}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-all"
              >
                <span>Trang sau</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
        )}
      </div>

      {/* Add Chapter Modal */}
      {showAddChapterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-lg w-full p-6 space-y-4 border border-gray-200 dark:border-zinc-800 shadow-2xl">
            <h3 className="font-bold text-base text-gray-900 dark:text-white">
              Thêm chương mới cho: {story.title}
            </h3>
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 mb-1 block">
                Tiêu đề chương
              </label>
              <input
                type="text"
                placeholder={`Chương ${chapters.length + 1}: Tiêu đề`}
                value={newChapterTitle}
                onChange={(e) => setNewChapterTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:border-indigo-500 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 mb-1 block">
                Nội dung văn bản
              </label>
              <textarea
                rows={8}
                placeholder="Dán nội dung chương..."
                value={newChapterContent}
                onChange={(e) => setNewChapterContent(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:border-indigo-500 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddChapterModal(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 text-xs font-semibold text-gray-700 dark:text-zinc-300"
              >
                Hủy
              </button>
              <button
                onClick={handleAddChapter}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
              >
                Lưu chương
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
