import React from 'react';
import {
  X,
  AlignLeft,
  AlignJustify,
  Palette,
  RotateCcw,
  Volume2,
  Square,
  Check,
  Sparkles,
} from 'lucide-react';
import { useReader } from '../context/ReaderContext';
import { useAudio } from '../context/AudioContext';
import type { ReaderTheme, ReaderWidth } from '../types';

interface ReaderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReaderSettingsModal: React.FC<ReaderSettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, resetSettings } = useReader();
  const {
    voices,
    selectedVoiceURI,
    setSelectedVoice,
    previewingVoiceURI,
    playVoicePreview,
    stopVoicePreview,
  } = useAudio();

  if (!isOpen) return null;

  const themes: { id: ReaderTheme; label: string; bg: string; text: string; border: string }[] = [
    { id: 'light', label: 'Sáng', bg: 'bg-white', text: 'text-gray-900', border: 'border-gray-300' },
    { id: 'sepia', label: 'Giấy cổ', bg: 'bg-[#fbf0d9]', text: 'text-[#433422]', border: 'border-[#e4d3b4]' },
    { id: 'forest', label: 'Xanh lá', bg: 'bg-[#eef6f0]', text: 'text-[#1d3d27]', border: 'border-[#cde0d2]' },
    { id: 'night', label: 'Đêm', bg: 'bg-[#18181b]', text: 'text-[#e4e4e7]', border: 'border-[#3f3f46]' },
    { id: 'dark', label: 'OLED', bg: 'bg-[#000000]', text: 'text-gray-200', border: 'border-zinc-800' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full sm:max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-zinc-800 p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white">
              Tùy Chỉnh Đọc Sách
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5 pt-4">
          {/* Theme selection */}
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2.5 block">
              Màu nền đọc sách
            </label>
            <div className="grid grid-cols-5 gap-2">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => updateSettings({ theme: t.id })}
                  className={`h-12 rounded-xl flex flex-col items-center justify-center border-2 transition-all ${
                    t.bg
                  } ${t.text} ${
                    settings.theme === t.id
                      ? 'border-indigo-600 ring-2 ring-indigo-500/20 scale-105 shadow-md'
                      : `${t.border} opacity-80 hover:opacity-100`
                  }`}
                >
                  <span className="text-[11px] font-semibold">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Font Family */}
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2.5 block">
              Kiểu chữ
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => updateSettings({ fontFamily: 'serif' })}
                className={`py-2.5 px-3 rounded-xl border text-sm flex items-center justify-center gap-2 font-serif transition-all ${
                  settings.fontFamily === 'serif'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold'
                    : 'border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800'
                }`}
              >
                <span>Lora (Có chân)</span>
              </button>

              <button
                onClick={() => updateSettings({ fontFamily: 'sans' })}
                className={`py-2.5 px-3 rounded-xl border text-sm flex items-center justify-center gap-2 font-sans transition-all ${
                  settings.fontFamily === 'sans'
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold'
                    : 'border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800'
                }`}
              >
                <span>Vietnam Pro (Hiện đại)</span>
              </button>
            </div>
          </div>

          {/* Font Size */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                Cỡ chữ
              </label>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                {settings.fontSize}px
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => updateSettings({ fontSize: Math.max(14, settings.fontSize - 1) })}
                className="w-9 h-9 rounded-xl border border-gray-200 dark:border-zinc-800 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                A-
              </button>
              <input
                type="range"
                min={14}
                max={30}
                value={settings.fontSize}
                onChange={(e) => updateSettings({ fontSize: parseInt(e.target.value, 10) })}
                className="flex-1 accent-indigo-600 cursor-pointer"
              />
              <button
                onClick={() => updateSettings({ fontSize: Math.min(30, settings.fontSize + 1) })}
                className="w-9 h-9 rounded-xl border border-gray-200 dark:border-zinc-800 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                A+
              </button>
            </div>
          </div>

          {/* Line Height & Alignment */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2 block">
                Giãn dòng: {settings.lineHeight}
              </label>
              <div className="flex items-center gap-1.5">
                {[1.6, 1.8, 2.0, 2.2].map((lh) => (
                  <button
                    key={lh}
                    onClick={() => updateSettings({ lineHeight: lh })}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      settings.lineHeight === lh
                        ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                        : 'border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {lh}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2 block">
                Căn lề chữ
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateSettings({ textAlign: 'left' })}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors ${
                    settings.textAlign === 'left'
                      ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                      : 'border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <AlignLeft className="w-4 h-4" />
                  <span>Trái</span>
                </button>
                <button
                  onClick={() => updateSettings({ textAlign: 'justify' })}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors ${
                    settings.textAlign === 'justify'
                      ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                      : 'border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <AlignJustify className="w-4 h-4" />
                  <span>Đều</span>
                </button>
              </div>
            </div>
          </div>

          {/* Width of Content */}
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2 block">
              Độ rộng trang
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  { id: 'narrow', label: 'Hẹp' },
                  { id: 'normal', label: 'Chuẩn' },
                  { id: 'wide', label: 'Rộng' },
                  { id: 'full', label: 'Tràn viền' },
                ] as { id: ReaderWidth; label: string }[]
              ).map((w) => (
                <button
                  key={w.id}
                  onClick={() => updateSettings({ maxWidth: w.id })}
                  className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    settings.maxWidth === w.id
                      ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                      : 'border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* Vietnamese TTS Voice Selection */}
          {voices.length > 0 && (
            <div className="pt-2 border-t border-gray-100 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                  <span>Giọng đọc AI (TTS)</span>
                </label>
                <span className="text-[11px] font-semibold text-violet-600 dark:text-violet-400">
                  {voices.length} giọng tiếng Việt
                </span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {voices.map((v) => {
                  const isSelected = selectedVoiceURI === v.voiceURI;
                  const isPreviewing = previewingVoiceURI === v.voiceURI;
                  return (
                    <div
                      key={v.voiceURI}
                      onClick={() => setSelectedVoice(v.voiceURI)}
                      className={`p-2 rounded-xl text-xs cursor-pointer border transition-all flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-violet-50 dark:bg-violet-950/40 border-violet-500 ring-1 ring-violet-500/20 shadow-sm'
                          : 'border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-gray-900 dark:text-zinc-100 flex items-center gap-1">
                            <span>{v.gender === 'female' ? '👩' : v.gender === 'male' ? '👨' : '🎙️'}</span>
                            <span>{v.name}</span>
                          </span>
                          {v.style && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium">
                              {v.style}
                            </span>
                          )}
                          {v.recommended && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-bold">
                              ⭐ Khuyên dùng
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isPreviewing) {
                              stopVoicePreview();
                            } else {
                              playVoicePreview(v.voiceURI);
                            }
                          }}
                          className={`px-2 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all ${
                            isPreviewing
                              ? 'bg-red-500 text-white animate-pulse'
                              : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:bg-violet-100 hover:text-violet-700 dark:hover:bg-violet-900/60 dark:hover:text-violet-300'
                          }`}
                          title={isPreviewing ? 'Dừng nghe thử' : 'Nghe thử giọng này'}
                        >
                          {isPreviewing ? (
                            <>
                              <Square className="w-2.5 h-2.5 fill-current" />
                              <span>Dừng</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-2.5 h-2.5" />
                              <span>Thử</span>
                            </>
                          )}
                        </button>

                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-violet-600 text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Auto-scroll with TTS Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-zinc-800">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-zinc-200">
                Tự cuộn theo giọng đọc AI
              </p>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                Tự động cuộn màn hình tới đoạn đang được đọc
              </p>
            </div>
            <button
              onClick={() => updateSettings({ autoScrollWithTTS: !settings.autoScrollWithTTS })}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                settings.autoScrollWithTTS ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-zinc-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 left-0.5 shadow-sm ${
                  settings.autoScrollWithTTS ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Reset button */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={resetSettings}
              className="text-xs text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Khôi phục mặc định</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
