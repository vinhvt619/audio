import React, { useState } from 'react';
import {
  X,
  Upload,
  FileText,
  Book,
  Music,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { parseTextFile, parseEpubFile, type ParsedBook } from '../services/fileParser';
import { db, saveChapterAudio } from '../services/db';
import { persistStory, persistChaptersBatch, persistChapter } from '../services/dataService';
import type { Story, Chapter } from '../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (storyId: string) => void;
  stories: Story[];
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  stories,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'manual' | 'audio'>('upload');

  // Upload tab state
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedBook | null>(null);
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [bookCategory, setBookCategory] = useState('Tiểu thuyết');

  // Manual tab state
  const [manualTitle, setManualTitle] = useState('');
  const [manualAuthor, setManualAuthor] = useState('');
  const [manualCategory, setManualCategory] = useState('Truyện ngắn');
  const [manualDesc, setManualDesc] = useState('');
  const [manualChapterTitle, setManualChapterTitle] = useState('Chương 1');
  const [manualContent, setManualContent] = useState('');

  // Audio tab state
  const [selectedStoryId, setSelectedStoryId] = useState<string>(stories[0]?.id || '');
  const [storyChapters, setStoryChapters] = useState<Chapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUploading, setAudioUploading] = useState(false);

  // Load chapters when story selected in audio tab
  React.useEffect(() => {
    if (selectedStoryId) {
      db.chapters
        .where('storyId')
        .equals(selectedStoryId)
        .sortBy('chapterIndex')
        .then((chaps) => {
          setStoryChapters(chaps);
          if (chaps.length > 0) {
            setSelectedChapterId(chaps[0].id);
          }
        });
    }
  }, [selectedStoryId]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMsg(null);
    setParsedData(null);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let res: ParsedBook;

      if (ext === 'txt') {
        res = await parseTextFile(file);
      } else if (ext === 'epub') {
        res = await parseEpubFile(file);
      } else {
        throw new Error('Chỉ hỗ trợ tập tin định dạng .txt hoặc .epub');
      }

      setParsedData(res);
      setBookTitle(res.title);
      setBookAuthor(res.author);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi xử lý tập tin');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveParsedBook = async () => {
    if (!parsedData) return;

    setIsProcessing(true);
    try {
      const storyId = 'story-' + Date.now();
      const newStory: Story = {
        id: storyId,
        title: bookTitle.trim() || parsedData.title,
        author: bookAuthor.trim() || parsedData.author,
        category: bookCategory,
        description: parsedData.description,
        coverUrl:
          parsedData.coverDataUrl ||
          'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        chaptersCount: parsedData.chapters.length,
      };

      const newChapters: Chapter[] = parsedData.chapters.map((ch, idx) => ({
        id: `${storyId}-chap-${idx + 1}`,
        storyId,
        chapterIndex: idx + 1,
        title: ch.title,
        content: ch.content,
        hasAudioFile: false,
      }));

      await persistStory(newStory);
      await persistChaptersBatch(newChapters);

      onSuccess(storyId);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể lưu truyện vào cơ sở dữ liệu');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveManualStory = async () => {
    if (!manualTitle.trim()) {
      setErrorMsg('Vui lòng nhập tên truyện');
      return;
    }
    if (!manualContent.trim()) {
      setErrorMsg('Vui lòng nhập nội dung truyện');
      return;
    }

    setIsProcessing(true);
    try {
      const storyId = 'story-' + Date.now();
      const newStory: Story = {
        id: storyId,
        title: manualTitle.trim(),
        author: manualAuthor.trim() || 'Tác giả',
        category: manualCategory,
        description: manualDesc.trim() || 'Truyện do bạn tạo',
        coverUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        chaptersCount: 1,
      };

      const newChapter: Chapter = {
        id: `${storyId}-chap-1`,
        storyId,
        chapterIndex: 1,
        title: manualChapterTitle.trim() || 'Chương 1',
        content: manualContent.trim(),
        hasAudioFile: false,
      };

      await persistStory(newStory);
      await persistChapter(newChapter);

      onSuccess(storyId);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi lưu truyện');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveAudioAttachment = async () => {
    if (!selectedChapterId || !audioFile) {
      setErrorMsg('Vui lòng chọn chương và tập tin âm thanh');
      return;
    }

    setAudioUploading(true);
    setErrorMsg(null);
    try {
      await saveChapterAudio(selectedChapterId, audioFile);
      alert('Đã đính kèm file audio vào chương thành công!');
      onSuccess(selectedStoryId);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi lưu file audio');
    } finally {
      setAudioUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-zinc-800 flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Book className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white">
              Thêm Truyện & Audio
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/40 p-1.5 gap-1.5">
          <button
            onClick={() => {
              setActiveTab('upload');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'upload'
                ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Tải TXT / EPUB</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('manual');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'manual'
                ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Tạo thủ công</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('audio');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'audio'
                ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Music className="w-4 h-4" />
            <span>Gắn Audio</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs flex items-center gap-2 border border-red-200 dark:border-red-900">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: UPLOAD TXT / EPUB */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              {!parsedData ? (
                <div className="border-2 border-dashed border-gray-300 dark:border-zinc-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-2xl p-6 sm:p-8 text-center transition-colors">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3">
                    {isProcessing ? (
                      <Loader2 className="w-7 h-7 animate-spin" />
                    ) : (
                      <Upload className="w-7 h-7" />
                    )}
                  </div>
                  <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white mb-1">
                    Chọn hoặc Kéo thả tập tin truyện
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mb-4 max-w-xs mx-auto">
                    Hỗ trợ file văn bản <code className="text-indigo-600">.txt</code> (tự nhận diện chương) và sách điện tử <code className="text-indigo-600">.epub</code>
                  </p>
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs sm:text-sm font-semibold cursor-pointer shadow-md shadow-indigo-600/20 transition-all">
                    <span>Chọn file từ máy</span>
                    <input
                      type="file"
                      accept=".txt,.epub"
                      onChange={handleFileUpload}
                      disabled={isProcessing}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span>
                      Đã đọc thành công <strong>{parsedData.chapters.length} chương</strong>!
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-zinc-300 mb-1 block">
                      Tên truyện
                    </label>
                    <input
                      type="text"
                      value={bookTitle}
                      onChange={(e) => setBookTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:border-indigo-500 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-zinc-300 mb-1 block">
                        Tác giả
                      </label>
                      <input
                        type="text"
                        value={bookAuthor}
                        onChange={(e) => setBookAuthor(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:border-indigo-500 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 dark:text-zinc-300 mb-1 block">
                        Thể loại
                      </label>
                      <input
                        type="text"
                        value={bookCategory}
                        onChange={(e) => setBookCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:border-indigo-500 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-zinc-300 mb-1 block">
                      Xem trước danh sách chương ({parsedData.chapters.length})
                    </label>
                    <div className="max-h-36 overflow-y-auto p-2 bg-gray-50 dark:bg-zinc-800/60 rounded-xl space-y-1 text-xs">
                      {parsedData.chapters.slice(0, 10).map((c, i) => (
                        <div key={i} className="truncate text-gray-700 dark:text-zinc-300 py-0.5">
                          #{i + 1}. {c.title}
                        </div>
                      ))}
                      {parsedData.chapters.length > 10 && (
                        <div className="text-gray-400 italic">
                          ... và {parsedData.chapters.length - 10} chương khác
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setParsedData(null)}
                      className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800"
                    >
                      Chọn file khác
                    </button>
                    <button
                      onClick={handleSaveParsedBook}
                      disabled={isProcessing}
                      className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      <span>Lưu vào tủ sách</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MANUAL CREATE */}
          {activeTab === 'manual' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-300 mb-1 block">
                  Tên truyện *
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Lão Hạc"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:border-indigo-500 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-zinc-300 mb-1 block">
                    Tác giả
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Nam Cao"
                    value={manualAuthor}
                    onChange={(e) => setManualAuthor(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:border-indigo-500 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-zinc-300 mb-1 block">
                    Thể loại
                  </label>
                  <input
                    type="text"
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:border-indigo-500 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-300 mb-1 block">
                  Tóm tắt / Giới thiệu
                </label>
                <input
                  type="text"
                  placeholder="Mô tả ngắn gọn về tác phẩm..."
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:border-indigo-500 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-300 mb-1 block">
                  Tên chương 1
                </label>
                <input
                  type="text"
                  value={manualChapterTitle}
                  onChange={(e) => setManualChapterTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:border-indigo-500 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-300 mb-1 block">
                  Nội dung văn bản (các đoạn văn cách nhau bằng dòng trống) *
                </label>
                <textarea
                  rows={6}
                  placeholder="Dán nội dung truyện chữ vào đây..."
                  value={manualContent}
                  onChange={(e) => setManualContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:border-indigo-500 text-gray-900 dark:text-white"
                />
              </div>

              <button
                onClick={handleSaveManualStory}
                disabled={isProcessing}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5 transition-all"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Lưu truyện</span>
              </button>
            </div>
          )}

          {/* TAB 3: ATTACH AUDIO FILE */}
          {activeTab === 'audio' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-300 mb-1 block">
                  Chọn truyện
                </label>
                <select
                  value={selectedStoryId}
                  onChange={(e) => setSelectedStoryId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:border-indigo-500 text-gray-900 dark:text-white"
                >
                  {stories.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.author})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-300 mb-1 block">
                  Chọn chương để gắn Audio
                </label>
                <select
                  value={selectedChapterId}
                  onChange={(e) => setSelectedChapterId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:border-indigo-500 text-gray-900 dark:text-white"
                >
                  {storyChapters.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.chapterIndex}. {c.title} {c.hasAudioFile ? '(Đã có audio)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-300 mb-1 block">
                  Tập tin âm thanh (.mp3, .m4a, .wav, .ogg)
                </label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-950 dark:file:text-indigo-300"
                />
              </div>

              {audioFile && (
                <div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl text-xs space-y-1 text-gray-600 dark:text-zinc-300">
                  <div>Tập tin: {audioFile.name}</div>
                  <div>Dung lượng: {(audioFile.size / (1024 * 1024)).toFixed(2)} MB</div>
                </div>
              )}

              <button
                onClick={handleSaveAudioAttachment}
                disabled={audioUploading || !audioFile}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5 transition-all"
              >
                {audioUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Music className="w-4 h-4" />}
                <span>Lưu tập tin Audio cho chương này</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
