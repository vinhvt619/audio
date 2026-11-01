import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Headphones,
  Plus,
  Trash2,
  Sparkles,
  Bookmark,
  RotateCcw,
  Search,
  Play,
  Pause,
} from 'lucide-react';
import type { Story } from '../types';
import { db, reseedRequestedStories } from '../services/db';
import { removeStory } from '../services/dataService';
import { useAudio } from '../context/AudioContext';

interface LibraryViewProps {
  stories: Story[];
  onSelectStory: (story: Story) => void;
  onOpenReader: (story: Story, chapterId?: string) => void;
  onOpenAudio: (story: Story, chapterId?: string) => void;
  onOpenImport: () => void;
  onRefreshStories: () => void;
  searchQuery: string;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  stories,
  onSelectStory,
  onOpenReader,
  onOpenAudio,
  onOpenImport,
  onRefreshStories,
  searchQuery,
}) => {
  const { currentStory, isPlaying, togglePlay } = useAudio();
  const [selectedTag, setSelectedTag] = useState<string>('Tất cả');

  // Extract normalized discrete tags from category strings (e.g. "Tiên Hiệp • Cẩu Đạo • Hệ Thống")
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    stories.forEach((s) => {
      if (s.category) {
        s.category
          .split(/[•,·]/)
          .map((t) => t.trim())
          .filter((t) => t.length > 0)
          .forEach((t) => tagSet.add(t));
      }
    });
    return ['Tất cả', ...Array.from(tagSet)];
  }, [stories]);

  const filteredStories = useMemo(() => {
    return stories.filter((story) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        story.title.toLowerCase().includes(q) ||
        story.author.toLowerCase().includes(q) ||
        (story.category && story.category.toLowerCase().includes(q));

      const matchesTag =
        selectedTag === 'Tất cả' ||
        (story.category && story.category.toLowerCase().includes(selectedTag.toLowerCase()));

      return matchesSearch && matchesTag;
    });
  }, [stories, searchQuery, selectedTag]);

  const handleDeleteStory = async (e: React.MouseEvent, storyId: string) => {
    e.stopPropagation();
    if (confirm('Bạn có chắc chắn muốn xóa truyện này khỏi tủ sách? Dữ liệu chương và liên kết sẽ được dọn dẹp an toàn.')) {
      const chaps = await db.chapters.where('storyId').equals(storyId).toArray();
      for (const ch of chaps) {
        await db.audioAttachments.delete(ch.id);
      }
      await removeStory(storyId);
      onRefreshStories();
    }
  };

  // Find most recently read story
  const recentStory = useMemo(() => {
    return stories
      .filter((s) => s.lastReadChapterId || s.lastReadChapterIndex)
      .sort((a, b) => (b.lastReadTime || b.updatedAt || 0) - (a.lastReadTime || a.updatedAt || 0))[0];
  }, [stories]);

  const isLibraryEmpty = stories.length === 0;
  const isSearchNoResults = !isLibraryEmpty && filteredStories.length === 0;

  return (
    <div className="player-clearance max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-7 animate-fade-in">
      {/* Header and Hero Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            <span>Tủ sách của bạn</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
              {stories.length} tác phẩm
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Đọc chữ và nghe giọng AI tiếng Việt mượt mà mọi lúc, mọi nơi
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onOpenImport}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm active:scale-95 transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm truyện mới</span>
          </button>
        </div>
      </div>

      {/* Recent Reading Hero Banner */}
      {recentStory && (
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 dark:from-zinc-900 dark:via-indigo-950/70 dark:to-zinc-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-indigo-500/20 backdrop-blur-sm">
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="flex items-center gap-4 sm:gap-5 min-w-0">
              <div
                onClick={() => onSelectStory(recentStory)}
                className="w-16 h-20 sm:w-20 sm:h-24 rounded-2xl overflow-hidden shadow-lg flex-shrink-0 bg-zinc-800 border border-white/10 cursor-pointer hover:opacity-90 transition-opacity"
              >
                {recentStory.coverUrl ? (
                  <img
                    src={recentStory.coverUrl}
                    alt={recentStory.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-xl bg-indigo-600">
                    {recentStory.title.slice(0, 1)}
                  </div>
                )}
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Chương gần nhất đang đọc
                  </span>
                  {recentStory.lastReadProgress !== undefined && recentStory.lastReadProgress > 0 && (
                    <span className="text-white/60 text-[11px] font-medium">
                      Tiến độ: {recentStory.lastReadProgress}%
                    </span>
                  )}
                </div>
                <h3
                  onClick={() => onSelectStory(recentStory)}
                  className="font-extrabold text-base sm:text-xl truncate text-white cursor-pointer hover:underline"
                >
                  {recentStory.title}
                </h3>
                <p className="text-xs sm:text-sm text-indigo-200 font-medium flex items-center gap-1.5 truncate">
                  <Bookmark className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span>
                    Chương {recentStory.lastReadChapterIndex || 1}
                    {recentStory.lastReadChapterTitle ? `: ${recentStory.lastReadChapterTitle}` : ''}
                  </span>
                </p>
                {/* Mini progress bar */}
                {recentStory.lastReadProgress !== undefined && recentStory.lastReadProgress > 0 && (
                  <div className="w-48 sm:w-64 h-1.5 bg-white/20 rounded-full overflow-hidden mt-1.5">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-indigo-400 rounded-full transition-all"
                      style={{ width: `${recentStory.lastReadProgress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Quick Continue Buttons */}
            <div className="flex items-center gap-2.5 w-full md:w-auto flex-shrink-0 pt-2 md:pt-0">
              <button
                onClick={() => onOpenReader(recentStory, recentStory.lastReadChapterId)}
                className="flex-1 md:flex-none px-4 sm:px-5 py-2.5 rounded-xl bg-white text-indigo-900 hover:bg-indigo-50 font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>Đọc tiếp (C.{recentStory.lastReadChapterIndex || 1})</span>
              </button>
              <button
                onClick={() => {
                  if (currentStory?.id === recentStory.id) {
                    togglePlay();
                  } else {
                    onOpenAudio(recentStory, recentStory.lastReadChapterId);
                  }
                }}
                className={`flex-1 md:flex-none px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 backdrop-blur-md ${
                  currentStory?.id === recentStory.id && isPlaying
                    ? 'bg-rose-600 hover:bg-rose-700 text-white border border-rose-400/40'
                    : 'bg-indigo-600/80 hover:bg-indigo-600 text-white border border-indigo-400/40'
                }`}
                title={
                  currentStory?.id === recentStory.id && isPlaying
                    ? 'Tạm dừng đọc âm thanh'
                    : 'Tiếp tục nghe âm thanh'
                }
              >
                {currentStory?.id === recentStory.id && isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Tạm dừng</span>
                  </>
                ) : currentStory?.id === recentStory.id ? (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Phát tiếp</span>
                  </>
                ) : (
                  <>
                    <Headphones className="w-4 h-4" />
                    <span>Nghe tiếp</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discrete Category & Tag Pills */}
      {availableTags.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {availableTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                selectedTag === tag
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 border border-gray-200/80 dark:border-zinc-800'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Main Stories Grid or Empty States */}
      <div>
        {isLibraryEmpty ? (
          /* Empty Library State (No stories in database) */
          <div className="text-center py-16 px-4 bg-white dark:bg-zinc-900 rounded-3xl border border-gray-200 dark:border-zinc-800 space-y-3">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-500">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-base sm:text-lg text-gray-800 dark:text-zinc-200">
              Tủ sách hiện đang trống
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 max-w-sm mx-auto">
              Hãy thêm truyện từ file TXT, EPUB hoặc nạp bộ truyện có sẵn để bắt đầu đọc và nghe sách.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
              <button
                onClick={onOpenImport}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm truyện mới</span>
              </button>
              <button
                onClick={async () => {
                  await reseedRequestedStories();
                  onRefreshStories();
                }}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 text-xs sm:text-sm font-semibold transition-all inline-flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Nạp lại truyện mẫu</span>
              </button>
            </div>
          </div>
        ) : isSearchNoResults ? (
          /* Search / Filter No Results State */
          <div className="text-center py-16 px-4 bg-white dark:bg-zinc-900 rounded-3xl border border-gray-200 dark:border-zinc-800 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-500">
              <Search className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-base sm:text-lg text-gray-800 dark:text-zinc-200">
              Không tìm thấy tác phẩm phù hợp
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 max-w-md mx-auto">
              Không có truyện nào khớp với từ khóa tìm kiếm hoặc bộ lọc thể loại đã chọn.
            </p>
            <button
              onClick={() => {
                setSelectedTag('Tất cả');
              }}
              className="px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 text-xs sm:text-sm font-semibold transition-all inline-flex items-center gap-2 border border-indigo-200 dark:border-indigo-800/60"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Xóa bộ lọc thể loại</span>
            </button>
          </div>
        ) : (
          /* Stories Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredStories.map((story) => (
              <div
                key={story.id}
                onClick={() => onSelectStory(story)}
                className="group relative bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200/90 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:border-indigo-300 dark:hover:border-indigo-800 transition-all duration-300 flex flex-col overflow-hidden cursor-pointer"
              >
                {/* Book Cover Image */}
                <div className="relative aspect-[16/10] overflow-hidden bg-gray-100 dark:bg-zinc-800">
                  {story.coverUrl ? (
                    <img
                      src={story.coverUrl}
                      alt={story.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold text-3xl">
                      {story.title.slice(0, 1)}
                    </div>
                  )}

                  {/* Badges on cover */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      <span>{story.chaptersCount} chương</span>
                    </span>
                  </div>

                  {/* Delete button */}
                  <div className="absolute top-2.5 right-2.5">
                    <button
                      onClick={(e) => handleDeleteStory(e, story.id)}
                      className="p-1.5 rounded-lg bg-black/60 hover:bg-red-600 text-white backdrop-blur-md transition-colors opacity-0 group-hover:opacity-100"
                      title="Xóa truyện"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 block truncate">
                      {story.category || 'Văn học'}
                    </span>
                    <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white line-clamp-2 min-h-[2.5rem] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {story.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium truncate mt-0.5">
                      {story.author}
                    </p>
                    {story.lastReadChapterIndex ? (
                      <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-[11px] font-semibold text-amber-800 dark:text-amber-200">
                        <Bookmark className="w-3 h-3 text-amber-600 dark:text-amber-400 flex-shrink-0 fill-current" />
                        <span className="truncate">
                          Đang đọc: C.{story.lastReadChapterIndex}
                          {story.lastReadChapterTitle ? ` - ${story.lastReadChapterTitle}` : ''} ({story.lastReadProgress || 0}%)
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 dark:text-zinc-500 line-clamp-2 mt-1">
                        {story.description}
                      </p>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-gray-100 dark:border-zinc-800/80 flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenReader(story, story.lastReadChapterId);
                      }}
                      className="flex-1 py-1.5 px-2 rounded-xl bg-gray-100 hover:bg-indigo-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      title={story.lastReadChapterIndex ? `Đọc tiếp chương ${story.lastReadChapterIndex}` : 'Đọc từ đầu'}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{story.lastReadChapterIndex ? `Đọc C.${story.lastReadChapterIndex}` : 'Đọc chữ'}</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (currentStory?.id === story.id) {
                          togglePlay();
                        } else {
                          onOpenAudio(story, story.lastReadChapterId);
                        }
                      }}
                      className={`flex-1 py-1.5 px-2 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 ${
                        currentStory?.id === story.id && isPlaying
                          ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                          : currentStory?.id === story.id
                          ? 'bg-violet-600 hover:bg-violet-700 shadow-violet-600/20'
                          : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                      }`}
                      title={
                        currentStory?.id === story.id && isPlaying
                          ? 'Tạm dừng đọc âm thanh'
                          : currentStory?.id === story.id
                          ? 'Phát tiếp âm thanh'
                          : story.lastReadChapterIndex
                          ? `Nghe tiếp chương ${story.lastReadChapterIndex}`
                          : 'Nghe từ đầu'
                      }
                    >
                      {currentStory?.id === story.id && isPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5 fill-current" />
                          <span>Tạm dừng</span>
                        </>
                      ) : currentStory?.id === story.id ? (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Phát tiếp</span>
                        </>
                      ) : (
                        <>
                          <Headphones className="w-3.5 h-3.5" />
                          <span>{story.lastReadChapterIndex ? `Nghe C.${story.lastReadChapterIndex}` : 'Nghe ngay'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
