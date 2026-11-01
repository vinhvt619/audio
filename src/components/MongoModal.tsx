import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertCircle, Loader2, Sparkles, X, ExternalLink, Cloud, Trash2, RefreshCw } from 'lucide-react';
import { fetchDbStatus, configureMongo, syncSeedsToMongo, clearLocalDb, clearLocalChapterCache, type MongoStatus } from '../services/dataService';

interface MongoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: () => void;
}

export const MongoModal: React.FC<MongoModalProps> = ({ isOpen, onClose, onConnected }) => {
  const [status, setStatus] = useState<MongoStatus>({
    connected: false,
    uriConfigured: false,
    databaseName: null,
    storiesCount: 0,
    chaptersCount: 0,
  });
  const [uriInput, setUriInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen]);

  const loadStatus = async () => {
    const s = await fetchDbStatus();
    setStatus(s);
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uriInput.trim()) {
      setErrorMsg('Vui lòng nhập chuỗi kết nối MongoDB (bắt đầu bằng mongodb+srv:// hoặc mongodb://)');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await configureMongo(uriInput);
    setIsLoading(false);

    if (res.ok && res.status) {
      setStatus(res.status);
      setSuccessMsg('Đã kết nối thành công với MongoDB Atlas Cloud và đồng bộ dữ liệu!');
      if (onConnected) onConnected();
    } else {
      setErrorMsg(res.error || 'Kết nối thất bại. Hãy kiểm tra lại username, password hoặc IP Access List trên MongoDB Atlas.');
    }
  };

  const handleSyncSeeds = async () => {
    setIsSyncing(true);
    const s = await syncSeedsToMongo();
    setStatus(s);
    setIsSyncing(false);
    setSuccessMsg('Đã đồng bộ lại toàn bộ dữ liệu mẫu lên MongoDB Cloud thành công!');
    if (onConnected) onConnected();
  };

  const handleClearChapterCache = async () => {
    const cleared = await clearLocalChapterCache();
    setSuccessMsg(`Đã xóa sạch bộ nhớ đệm (${cleared} chương) trong IndexedDB trình duyệt! Toàn bộ nội dung chương sẽ được tải trực tiếp từ MongoDB Atlas Cloud. Tiến độ đọc của bạn vẫn được giữ nguyên.`);
  };

  const handleClearLocal = async () => {
    await clearLocalDb();
    setSuccessMsg('Đã dọn dẹp sạch sẽ toàn bộ dữ liệu lưu tạm ở Local trình duyệt! Toàn bộ dữ liệu truyện và chương đang được truy xuất 100% từ MongoDB Atlas Cloud.');
  };

  if (!isOpen) return null;

  if (status.hosted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
        <div role="dialog" aria-modal="true" aria-labelledby="hosted-storage-title" className="max-w-lg w-full rounded-2xl bg-white dark:bg-zinc-900 p-6 space-y-4">
          <h3 id="hosted-storage-title" className="font-bold text-lg">Thư viện online</h3>
          <p className="text-sm">{status.connected ? `Đang kết nối: ${status.storiesCount} truyện, ${status.chaptersCount} chương.` : 'Cloud tạm thời chưa kết nối. Bạn vẫn có thể dùng truyện đã lưu trên máy.'}</p>
          <p className="text-sm text-gray-600 dark:text-zinc-400">Bạn có thể đọc và nghe thư viện chung. Truyện nhập riêng, file audio, tiến độ đọc và thay đổi trong tủ sách được lưu trên trình duyệt của thiết bị này.</p>
          <button onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white rounded-xl">Đóng</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-zinc-800 p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${status.connected ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400' : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'}`}>
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg sm:text-xl text-gray-900 dark:text-white">
                Lưu trữ MongoDB Atlas Cloud
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                Đồng bộ truyện & tiến độ đọc nghe giữa điện thoại, máy tính và iPad
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Connection Status */}
        {status.connected ? (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 space-y-3">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Đang kết nối Cloud: {status.databaseName || 'audio_novel_db'}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white/80 dark:bg-zinc-900/60 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900">
                <span className="text-gray-500 dark:text-zinc-400 block">Số tác phẩm:</span>
                <span className="font-bold text-base text-gray-900 dark:text-white">{status.storiesCount} bộ</span>
              </div>
              <div className="bg-white/80 dark:bg-zinc-900/60 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900">
                <span className="text-gray-500 dark:text-zinc-400 block">Số chương trên Cloud:</span>
                <span className="font-bold text-base text-gray-900 dark:text-white">{status.chaptersCount} chương</span>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSyncSeeds}
                disabled={isSyncing}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50"
              >
                {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Đồng bộ truyện mẫu lên Cloud</span>
              </button>

              <button
                type="button"
                onClick={handleClearChapterCache}
                className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 border border-amber-200 dark:border-amber-800"
                title="Dọn bộ nhớ đệm chương trong IndexedDB, nội dung chương sẽ tải trực tiếp từ MongoDB Cloud. Tiến độ đọc được giữ nguyên."
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Dọn bộ nhớ đệm chương (Giữ tiến độ)</span>
              </button>

              <button
                type="button"
                onClick={handleClearLocal}
                className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                title="Xóa toàn bộ dữ liệu lưu trong IndexedDB trên thiết bị này"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Xóa sạch bộ nhớ Local</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-2">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-semibold text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Chưa kết nối Cloud (Hiện tại dữ liệu đang lưu cục bộ trên trình duyệt)</span>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300/80 leading-relaxed">
              Khi bạn kết nối MongoDB Atlas, dữ liệu sẽ được lưu trữ vĩnh viễn trên đám mây, không lo bị mất khi dọn dẹp trình duyệt và có thể mở nghe ở bất kỳ thiết bị nào.
            </p>
          </div>
        )}

        {/* Input Connection String Form */}
        <form onSubmit={handleConnect} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 mb-1.5">
              Chuỗi kết nối MongoDB Atlas (Connection String):
            </label>
            <input
              type="text"
              value={uriInput}
              onChange={(e) => setUriInput(e.target.value)}
              placeholder="mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/audio_novel_db?retryWrites=true&w=majority"
              className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-xs sm:text-sm font-mono text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500"
            />
            <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1">
              Bạn có thể dán trực tiếp chuỗi kết nối vào đây hoặc thêm vào file <code className="bg-gray-100 dark:bg-zinc-800 px-1 py-0.5 rounded">.env</code> với biến <code className="bg-gray-100 dark:bg-zinc-800 px-1 py-0.5 rounded">MONGODB_URI</code>.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={isLoading || !uriInput.trim()}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-indigo-600/30 active:scale-95 transition-all disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              <span>{isLoading ? 'Đang kiểm tra kết nối...' : 'Lưu & Kết nối Cloud'}</span>
            </button>
          </div>
        </form>

        {/* 3 Step Guide */}
        <div className="border-t border-gray-100 dark:border-zinc-800 pt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
              Cách lấy chuỗi kết nối miễn phí (100% Free):
            </span>
            <a
              href="https://www.mongodb.com/cloud/atlas/register"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 font-semibold"
            >
              <span>Đăng ký MongoDB Atlas</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <ol className="text-xs text-gray-600 dark:text-zinc-400 space-y-1.5 list-decimal pl-4 leading-relaxed">
            <li>Đăng ký tài khoản miễn phí tại <a href="https://www.mongodb.com/cloud/atlas" target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 underline">MongoDB Atlas</a> và chọn cụm miễn phí <strong>M0 (Free)</strong>.</li>
            <li>Tại mục <strong>Network Access</strong>, chọn <strong>Add IP Address</strong> → chọn <strong>Allow Access from Anywhere (0.0.0.0/0)</strong>.</li>
            <li>Tại mục <strong>Database Access</strong>, tạo tài khoản (ví dụ username: <code className="bg-gray-100 dark:bg-zinc-800 px-1 py-0.5 rounded">admin</code>, đặt mật khẩu dễ nhớ).</li>
            <li>Bấm nút <strong>Connect</strong> ở Database → chọn <strong>Drivers (Node.js)</strong> → sao chép chuỗi <code className="bg-gray-100 dark:bg-zinc-800 px-1 py-0.5 rounded">mongodb+srv://...</code> (thay mật khẩu vào) rồi dán vào ô trên!</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
