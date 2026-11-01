import { useState } from 'react';
import { X, Search, Headphones, CheckCircle2 } from 'lucide-react';
import type { Chapter } from '../types';

interface ChapterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  chapters: Chapter[];
  currentChapterId: string;
  onSelectChapter: (chapter: Chapter) => void;
  storyTitle: string;
}

export const ChapterDrawer: React.FC<ChapterDrawerProps> = ({
  isOpen,
  onClose,
  chapters,
  currentChapterId,
  onSelectChapter,
  storyTitle,
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filteredChapters = chapters.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-xs sm:max-w-sm bg-white dark:bg-zinc-900 h-full shadow-2xl flex flex-col z-10 transition-transform animate-slide-right">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <h3 className="font-bold text-base text-gray-900 dark:text-white truncate">
              Mục lục chương
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">{storyTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-gray-100 dark:border-zinc-800">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm chương..."
              className="w-full pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-zinc-800 rounded-xl text-xs sm:text-sm border border-transparent focus:border-indigo-500 focus:outline-none text-gray-800 dark:text-zinc-200"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredChapters.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-400">Không tìm thấy chương nào</div>
          ) : (
            filteredChapters.map((ch, idx) => {
              const isActive = ch.id === currentChapterId;
              return (
                <button
                  key={ch.id}
                  onClick={() => {
                    onSelectChapter(ch);
                    onClose();
                  }}
                  className={`w-full text-left p-3 rounded-xl flex items-center justify-between gap-2 transition-all ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800'
                      : 'hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="min-w-0 flex items-center gap-2.5">
                    <span className="text-xs font-mono text-gray-400 flex-shrink-0 w-6">
                      #{idx + 1}
                    </span>
                    <span className="text-xs sm:text-sm truncate">{ch.title}</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {ch.hasAudioFile && (
                      <span title="Có file âm thanh riêng">
                        <Headphones className="w-3.5 h-3.5 text-emerald-500" />
                      </span>
                    )}
                    {isActive && <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-gray-100 dark:border-zinc-800 text-center text-xs text-gray-400">
          Tổng cộng: {chapters.length} chương
        </div>
      </div>
    </div>
  );
};
