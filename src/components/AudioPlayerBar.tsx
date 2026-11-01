import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Gauge,
  Moon,
  Mic,
  Music,
  BookOpen,
  Check,
  Square,
  Sparkles,
  X,
} from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import { splitReadingParagraphs } from '../services/readingText';

interface AudioPlayerBarProps {
  onOpenReader: () => void;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({ onOpenReader }) => {
  const {
    currentStory,
    currentChapter,
    audioMode,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    volume,
    isMuted,
    activeParagraphIndex,
    voices,
    selectedVoiceURI,
    previewingVoiceURI,
    sleepTimerRemaining,
    togglePlay,
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
    nextChapter,
    prevChapter,
    jumpToParagraph,
    closeAudio,
  } = useAudio();

  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const updateHeight = () => document.documentElement.style.setProperty(
      '--audio-player-height', `${player.getBoundingClientRect().height}px`,
    );
    updateHeight();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateHeight) : null;
    observer?.observe(player);
    window.addEventListener('resize', updateHeight);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateHeight);
      document.documentElement.style.removeProperty('--audio-player-height');
    };
  }, [currentChapter?.id]);

  useEffect(() => {
    if (!showSpeedMenu && !showTimerMenu && !showVoiceMenu) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowSpeedMenu(false);
        setShowTimerMenu(false);
        setShowVoiceMenu(false);
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [showSpeedMenu, showTimerMenu, showVoiceMenu]);

  if (!currentChapter || !currentStory) {
    return null;
  }

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatTimerCountdown = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  const paragraphs = splitReadingParagraphs(currentChapter.content);
  const totalParagraphs = paragraphs.length;

  const speedOptions = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
  const timerOptions = [
    { label: '15 phút', minutes: 15 },
    { label: '30 phút', minutes: 30 },
    { label: '45 phút', minutes: 45 },
    { label: '60 phút', minutes: 60 },
  ];

  return (
    <div ref={playerRef} data-testid="audio-player" role="region" aria-label="Trình phát âm thanh" className="fixed bottom-0 left-0 right-0 z-30 transition-all select-none">
      {/* Backdrop for menus if open */}
      {(showSpeedMenu || showTimerMenu || showVoiceMenu) && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={() => {
            setShowSpeedMenu(false);
            setShowTimerMenu(false);
            setShowVoiceMenu(false);
          }}
        />
      )}

      {/* Main player bar */}
      <div className="audio-player-surface relative z-50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-t border-gray-200/90 dark:border-zinc-800 shadow-2xl transition-all">
        {/* Progress Seek Bar */}
        <div className="relative group w-full h-2 cursor-pointer bg-gray-200 dark:bg-zinc-800">
          {audioMode === 'file' ? (
            <>
              <div
                className="absolute left-0 top-0 bottom-0 bg-indigo-600 dark:bg-indigo-500 rounded-r-full"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => seek(parseFloat(e.target.value))}
                className="absolute inset-0 w-full opacity-0 cursor-pointer h-full z-10"
              />
            </>
          ) : (
            <>
              <div
                className="absolute left-0 top-0 bottom-0 bg-violet-600 dark:bg-violet-500 rounded-r-full transition-all duration-300"
                style={{
                  width: `${
                    totalParagraphs > 0
                      ? ((activeParagraphIndex + 1) / totalParagraphs) * 100
                      : 0
                  }%`,
                }}
              />
              <input
                type="range"
                min={0}
                max={Math.max(0, totalParagraphs - 1)}
                value={activeParagraphIndex}
                onChange={(e) => jumpToParagraph(parseInt(e.target.value, 10))}
                className="absolute inset-0 w-full opacity-0 cursor-pointer h-full z-10"
              />
            </>
          )}
        </div>

        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 lg:flex lg:justify-between lg:gap-4">
          {/* Left: Book & Chapter metadata */}
          <div data-testid="player-metadata" className="col-start-1 row-start-1 flex items-center gap-3 min-w-0 lg:flex-1 lg:max-w-sm">
            {currentStory.coverUrl ? (
              <img
                src={currentStory.coverUrl}
                alt={currentStory.title}
                className="hidden sm:block w-12 h-12 rounded-lg object-cover flex-shrink-0 shadow-sm border border-gray-200 dark:border-zinc-700 cursor-pointer hover:opacity-80"
                onClick={onOpenReader}
              />
            ) : (
              <div
                onClick={onOpenReader}
                className="hidden sm:flex w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-950 items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold flex-shrink-0 cursor-pointer"
              >
                {currentStory.title.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h4
                  onClick={onOpenReader}
                  className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-zinc-100 truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  title={currentChapter.title}
                >
                  {currentChapter.title}
                </h4>
              </div>
              <p className="text-[11px] sm:text-xs text-gray-500 dark:text-zinc-400 truncate">
                {currentStory.title} • {currentStory.author}
              </p>

              {/* Mode switch pills */}
              <div className="flex items-center gap-1.5 mt-1 whitespace-nowrap">
                <button
                  onClick={() => setMode('file')}
                  disabled={!currentChapter.hasAudioFile}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors flex items-center gap-1 ${
                    audioMode === 'file'
                      ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300'
                  }`}
                  title={
                    currentChapter.hasAudioFile
                      ? 'Phát file audio thu sẵn của chương'
                      : 'Chưa có file audio, bạn có thể tải lên trong chi tiết chương'
                  }
                >
                  <Music className="w-2.5 h-2.5" />
                  <span className="lg:hidden">File</span><span className="hidden lg:inline">File Audio</span>
                  {currentChapter.hasAudioFile && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  )}
                </button>

                <button
                  onClick={() => setMode('tts')}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors flex items-center gap-1 ${
                    audioMode === 'tts'
                      ? 'bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 font-semibold'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300'
                  }`}
                  title="Đọc bằng giọng AI (Text-To-Speech) tự động đồng bộ theo chữ"
                >
                  <Mic className="w-2.5 h-2.5" />
                  <span className="lg:hidden">Giọng AI</span><span className="hidden lg:inline">Giọng AI (TTS)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Center: Playback Controls */}
          <div data-testid="player-playback" className="col-span-2 row-start-2 flex flex-col items-center gap-1 min-w-0 lg:flex-1 lg:max-w-md">
            <div className="audio-player-playback flex items-center gap-2 sm:gap-4">
              <button
                onClick={prevChapter}
                className="p-1.5 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                title="Chương trước"
              >
                <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <button
                onClick={() => skip(-10)}
                className="p-1.5 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                title={audioMode === 'file' ? 'Lùi 10 giây' : 'Đoạn trước'}
              >
                <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <button
                onClick={togglePlay}
                className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-all ${
                  audioMode === 'file'
                    ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'
                    : 'bg-violet-600 hover:bg-violet-700 shadow-violet-600/30'
                }`}
                title={isPlaying ? 'Tạm dừng' : 'Phát tiếp'}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>

              <button
                onClick={() => skip(audioMode === 'file' ? 30 : 1)}
                className="p-1.5 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                title={audioMode === 'file' ? 'Tua tới 30 giây' : 'Đoạn sau'}
              >
                <RotateCw className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <button
                onClick={nextChapter}
                className="p-1.5 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                title="Chương tiếp theo"
              >
                <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Time / Progress indicators */}
            <div className="text-[11px] text-gray-500 dark:text-zinc-400 flex items-center gap-2 font-mono whitespace-nowrap">
              {audioMode === 'file' ? (
                <span>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              ) : (
                <span>
                  Đoạn {activeParagraphIndex + 1} / {totalParagraphs}
                </span>
              )}
            </div>
          </div>

          {/* Right: Tools & Utilities */}
          <div data-testid="player-tools" className="audio-player-tools col-start-2 row-start-1 flex shrink-0 items-center gap-0.5 lg:gap-2">
            {/* Speed Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSpeedMenu(!showSpeedMenu);
                  setShowTimerMenu(false);
                  setShowVoiceMenu(false);
                }}
                className={`p-1.5 sm:px-2 sm:py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                  showSpeedMenu
                    ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800'
                }`}
                title="Tốc độ phát"
              >
                <Gauge className="w-4 h-4" />
                <span className="hidden sm:inline">{playbackRate}x</span>
              </button>

              {showSpeedMenu && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="audio-player-popover absolute right-0 bottom-full mb-2 w-36 bg-white dark:bg-zinc-800 rounded-xl shadow-2xl border border-gray-200 dark:border-zinc-700 p-1.5 z-50 pointer-events-auto"
                >
                  <div className="text-[10px] font-bold text-gray-400 dark:text-zinc-400 px-2 py-1 uppercase">
                    Tốc độ
                  </div>
                  {speedOptions.map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRate(rate);
                        setShowSpeedMenu(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                        playbackRate === rate
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold'
                          : 'hover:bg-gray-100 dark:hover:bg-zinc-700/60 text-gray-700 dark:text-zinc-200'
                      }`}
                    >
                      <span>{rate}x</span>
                      {playbackRate === rate && <span className="text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sleep Timer */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTimerMenu(!showTimerMenu);
                  setShowSpeedMenu(false);
                  setShowVoiceMenu(false);
                }}
                className={`p-1.5 sm:px-2 sm:py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                  sleepTimerRemaining !== null
                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-bold animate-pulse'
                    : showTimerMenu
                    ? 'bg-gray-200 dark:bg-zinc-800 text-gray-900 dark:text-white'
                    : 'text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800'
                }`}
                title={
                  sleepTimerRemaining !== null
                    ? `Hẹn giờ tắt: ${formatTimerCountdown(sleepTimerRemaining)}`
                    : 'Hẹn giờ tắt tự động'
                }
              >
                <Moon className="w-4 h-4" />
                {sleepTimerRemaining !== null && (
                  <span className="text-[10px] hidden md:inline">
                    {formatTimerCountdown(sleepTimerRemaining)}
                  </span>
                )}
              </button>

              {showTimerMenu && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="audio-player-popover absolute right-0 bottom-full mb-2 w-44 bg-white dark:bg-zinc-800 rounded-xl shadow-2xl border border-gray-200 dark:border-zinc-700 p-1.5 z-50 pointer-events-auto"
                >
                  <div className="text-[10px] font-bold text-gray-400 dark:text-zinc-400 px-2 py-1 uppercase">
                    Hẹn giờ tắt
                  </div>
                  {timerOptions.map((opt) => (
                    <button
                      key={opt.minutes}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSleepTimer(opt.minutes);
                        setShowTimerMenu(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-100 dark:hover:bg-zinc-700/60 text-gray-700 dark:text-zinc-200 transition-colors"
                    >
                      {opt.label}
                    </button>
                  ))}
                  {sleepTimerRemaining !== null && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSleepTimer(null);
                        setShowTimerMenu(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 mt-1 border-t border-gray-100 dark:border-zinc-700 pt-1.5"
                    >
                      Hủy hẹn giờ
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* TTS Voice Selection (when in TTS mode) */}
            {audioMode === 'tts' && voices.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowVoiceMenu(!showVoiceMenu);
                    setShowSpeedMenu(false);
                    setShowTimerMenu(false);
                  }}
                  className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    showVoiceMenu
                      ? 'bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 ring-2 ring-violet-500/20'
                      : 'text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800'
                  }`}
                  title="Chọn giọng đọc AI tiếng Việt"
                >
                  <Mic className="w-4 h-4 text-violet-500" />
                  <span className="hidden lg:inline text-[11px] font-bold text-violet-600 dark:text-violet-400 max-w-[110px] truncate">
                    {voices.find((v) => v.voiceURI === selectedVoiceURI)?.name || 'Giọng AI'}
                  </span>
                </button>

                {showVoiceMenu && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="audio-player-popover absolute right-0 bottom-full mb-2 w-80 sm:w-96 max-h-[75vh] overflow-y-auto bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-zinc-800 p-2.5 z-50 pointer-events-auto divide-y divide-gray-100 dark:divide-zinc-800"
                  >
                    {/* Header */}
                    <div className="pb-2 px-1 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-violet-500" />
                        <span className="text-xs font-bold text-gray-800 dark:text-zinc-100 uppercase tracking-wider">
                          Giọng Đọc Tiếng Việt
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 font-semibold">
                        {voices.length} giọng
                      </span>
                    </div>

                    {/* Voice list */}
                    <div className="pt-2 space-y-1.5">
                      {voices.map((v) => {
                        const isSelected = selectedVoiceURI === v.voiceURI;
                        const isPreviewing = previewingVoiceURI === v.voiceURI;
                        return (
                          <div
                            key={v.voiceURI}
                            onClick={() => {
                              setSelectedVoice(v.voiceURI);
                              setShowVoiceMenu(false);
                            }}
                            className={`group p-2.5 rounded-xl text-xs cursor-pointer border transition-all flex items-center justify-between gap-2 ${
                              isSelected
                                ? 'bg-violet-50/80 dark:bg-violet-950/40 border-violet-500/60 shadow-sm ring-1 ring-violet-500/30'
                                : 'border-transparent hover:bg-gray-50 dark:hover:bg-zinc-800/60 hover:border-gray-200 dark:hover:border-zinc-750'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-1">
                                  <span>{v.gender === 'female' ? '👩' : v.gender === 'male' ? '👨' : '🎙️'}</span>
                                  <span>{v.name}</span>
                                </span>

                                {v.style && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-200/50 dark:border-indigo-800/40">
                                    {v.style}
                                  </span>
                                )}

                                {v.recommended && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-700">
                                    ⭐ Khuyên dùng
                                  </span>
                                )}
                              </div>

                              {v.description && (
                                <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1 line-clamp-1">
                                  {v.description}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Nghe thử (Preview button) */}
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
                                    ? 'bg-red-500 text-white animate-pulse shadow-sm'
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
                                <div className="w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center shrink-0">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Volume toggle */}
            <div className="hidden lg:flex items-center gap-1.5">
              <button
                onClick={toggleMute}
                className="p-1.5 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors"
                title={isMuted ? 'Bật âm' : 'Tắt âm'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
                className="w-16 h-1 accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Reader view jump button */}
            <button
              onClick={onOpenReader}
              className="hidden lg:flex p-2 sm:px-3 sm:py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 text-xs font-semibold items-center gap-1.5 transition-colors shadow-sm ml-1"
              title="Mở giao diện đọc toàn màn hình"
            >
              <BookOpen className="w-4 h-4 text-indigo-500" />
              <span className="hidden sm:inline">Đọc chữ</span>
            </button>

            {/* Close Audio Player Button */}
            <button
              type="button"
              onClick={closeAudio}
              className="p-1.5 sm:p-2 rounded-xl text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors ml-0.5 sm:ml-1"
              title="Tắt nghe audio (Đóng trình phát)"
              aria-label="Tắt nghe audio"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
