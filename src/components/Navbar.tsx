import React from 'react';
import { BookOpen, Headphones, PlusCircle, Search, Sparkles, Cloud } from 'lucide-react';

interface NavbarProps {
  currentView: 'library' | 'story' | 'reader';
  onNavigate: (view: 'library' | 'story' | 'reader') => void;
  onOpenImport: () => void;
  onOpenMongoConfig?: () => void;
  isMongoConnected?: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  hasActivePlayback: boolean;
  onOpenActivePlaybackReader?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenImport,
  onOpenMongoConfig,
  isMongoConnected,
  searchQuery,
  onSearchChange,
  hasActivePlayback,
  onOpenActivePlaybackReader,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div
          onClick={() => onNavigate('library')}
          className="flex items-center gap-2.5 cursor-pointer group select-none flex-shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                AudioRead
              </span>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium hidden sm:block">
              Đọc Truyện & Nghe Sách Nói
            </p>
          </div>
        </div>

        {/* Search bar in library view */}
        {currentView === 'library' && (
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Tìm tên truyện, tác giả..."
                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-zinc-800/80 border border-transparent focus:border-indigo-500 rounded-xl text-sm focus:outline-none focus:bg-white dark:focus:bg-zinc-800 transition-all text-gray-800 dark:text-zinc-200 placeholder-gray-400"
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {hasActivePlayback && currentView !== 'reader' && (
            <button
              onClick={() => {
                if (onOpenActivePlaybackReader) {
                  onOpenActivePlaybackReader();
                } else {
                  onNavigate('reader');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-xl bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-900/60 transition-all shadow-sm animate-pulse"
              title="Mở giao diện đọc của chương đang phát"
            >
              <Sparkles className="w-4 h-4 text-violet-500" />
              <span>Đang đọc</span>
            </button>
          )}

          <button
            onClick={() => onNavigate('library')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all ${
              currentView === 'library'
                ? 'bg-gray-100 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400'
                : 'text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800/60'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Tủ sách</span>
          </button>

          {onOpenMongoConfig && (
            <button
              onClick={onOpenMongoConfig}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border transition-all active:scale-95 ${
                isMongoConnected
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700/60 text-emerald-700 dark:text-emerald-300'
                  : 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-200 hover:bg-amber-100'
              }`}
              title={
                isMongoConnected
                  ? 'Đã kết nối MongoDB Cloud (Dữ liệu đồng bộ)'
                  : 'Bấm để cấu hình kết nối MongoDB Atlas Cloud'
              }
            >
              <Cloud className={`w-4 h-4 ${isMongoConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`} />
              <span className="hidden sm:inline">
                {isMongoConnected ? 'Cloud Atlas' : 'Lưu Cloud'}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isMongoConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
            </button>
          )}

          <button
            onClick={onOpenImport}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white transition-all shadow-sm shadow-indigo-600/30"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Thêm truyện</span>
          </button>
        </div>
      </div>

      {/* Mobile search bar when on library view */}
      {currentView === 'library' && (
        <div className="md:hidden px-4 pb-3 pt-1 border-t border-gray-100 dark:border-zinc-800/80">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm tên truyện, tác giả..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-zinc-800/80 border border-transparent focus:border-indigo-500 rounded-xl text-xs sm:text-sm focus:outline-none focus:bg-white dark:focus:bg-zinc-800 transition-all text-gray-800 dark:text-zinc-200 placeholder-gray-400"
            />
          </div>
        </div>
      )}
    </header>
  );
};
