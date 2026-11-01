import fs from 'node:fs/promises';
import { wikiCatalog } from '../src/data/wikiCatalog.js';

const book = wikiCatalog['bach-the-cau-tien'];
if (!book) throw new Error('bach-the-cau-tien not found in wikiCatalog');

const chapters = book.chapters.map(c => ({
  index: c.chapterIndex,
  title: c.title,
  path: c.path,
}));

// Chapters already verified in Mongo Atlas
const existingCached = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
  12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
  23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33,
  34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 515, 516
];

const scriptCode = `// ==UserScript/ConsoleScript==
// Name: AudioRead WikiCV Downloader - Bách Thế Cầu Tiên
// Target: https://wikicv.org/truyen/muon-doi-cau-tien-Y0Ui7lS4CHObdc1v
// Description: Tải nội dung 723 chương Bách Thế Cầu Tiên từ chính trình duyệt với độ trễ an toàn, chống Cloudflare chặn.
// ==========================================

(() => {
  if (window.__wikicvCrawlerRunning) {
    alert('Crawler đang chạy rồi! Hãy nhìn vào góc trên bên phải màn hình.');
    return;
  }
  window.__wikicvCrawlerRunning = true;

  const STORY_ID = 'bach-the-cau-tien';
  const STORY_TITLE = 'Bách Thế Cầu Tiên';
  const SOURCE_VERSION = 'wikicv-2026-10-15';
  const CHAPTERS = ${JSON.stringify(chapters)};
  const ALREADY_CACHED_SET = new Set(${JSON.stringify(existingCached)});

  // IndexedDB Storage Helper to prevent memory or storage quota issues
  const DB_NAME = 'AudioRead_WikiCV';
  const STORE_NAME = 'bach_the_cau_tien_chapters';

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'chapterIndex' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function getSavedChapter(db, index) {
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(index);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  }

  async function saveChapter(db, data) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).put(data);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async function getAllSavedChapters(db) {
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }

  async function clearSavedChapters(db) {
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).clear();
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  }

  // Text Extractor compatible with AudioRead server/wikiSource.js
  function extractChapterContent(html, chapter) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const body = doc.getElementById('bookContentBody');
    if (!body) throw new Error('Không tìm thấy #bookContentBody');

    const paragraphs = Array.from(body.querySelectorAll('p'))
      .map(p => p.textContent.trim())
      .filter(Boolean);

    if (paragraphs[0] && /^Chương\\s+\\d+/i.test(paragraphs[0])) {
      paragraphs.shift();
    }

    const content = paragraphs.join('\\n\\n').trim();
    if (content.length < 50) throw new Error('Nội dung quá ngắn (< 50 ký tự)');
    return content;
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  // Create UI
  const root = document.createElement('div');
  root.id = 'audioread-wikicv-crawler';
  root.style.cssText = \`
    position: fixed;
    top: 20px;
    right: 20px;
    width: 380px;
    background: #1e293b;
    color: #f8fafc;
    border: 2px solid #38bdf8;
    border-radius: 12px;
    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.5);
    z-index: 9999999;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    padding: 16px;
    font-size: 13px;
    line-height: 1.5;
  \`;

  root.innerHTML = \`
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 8px; margin-bottom: 12px;">
      <div style="font-weight: 700; font-size: 14px; color: #38bdf8; display: flex; align-items: center; gap: 6px;">
        <span>📚</span> AudioRead • Tải Bách Thế Cầu Tiên
      </div>
      <button id="arc-btn-close" style="background: none; border: none; color: #94a3b8; font-size: 16px; cursor: pointer; padding: 0 4px;">✕</button>
    </div>

    <div style="margin-bottom: 8px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-weight: 600;">
        <span id="arc-stat-count">Đã tải: 0 / \${CHAPTERS.length} (0%)</span>
        <span id="arc-stat-speed" style="color: #94a3b8;">Nghỉ 1.8s</span>
      </div>
      <div style="width: 100%; height: 8px; background: #334155; border-radius: 4px; overflow: hidden;">
        <div id="arc-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #38bdf8, #818cf8); transition: width 0.3s;"></div>
      </div>
    </div>

    <div id="arc-status" style="background: #0f172a; border-radius: 6px; padding: 8px; margin-bottom: 12px; font-family: monospace; font-size: 12px; color: #cbd5e1; min-height: 38px; word-break: break-all;">
      Đang chuẩn bị cơ sở dữ liệu...
    </div>

    <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px;">
      <button id="arc-btn-toggle" style="flex: 1; min-width: 100px; padding: 8px 12px; background: #0284c7; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">⏸️ Tạm dừng</button>
      <button id="arc-btn-export" style="flex: 1; min-width: 120px; padding: 8px 12px; background: #059669; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">💾 Xuất file JSON</button>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #94a3b8;">
      <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;">
        <input type="checkbox" id="arc-cb-skip-cached" checked style="cursor: pointer;">
        Bỏ qua 45 ch đã có (1-43, 515, 516)
      </label>
      <button id="arc-btn-clear" style="background: none; border: none; color: #f43f5e; cursor: pointer; text-decoration: underline; font-size: 11px;">Xóa tải lại</button>
    </div>
  \`;

  document.body.appendChild(root);

  // Controller state
  let isPaused = false;
  let isTerminated = false;
  let dbInstance = null;

  const btnClose = root.querySelector('#arc-btn-close');
  const btnToggle = root.querySelector('#arc-btn-toggle');
  const btnExport = root.querySelector('#arc-btn-export');
  const btnClear = root.querySelector('#arc-btn-clear');
  const cbSkipCached = root.querySelector('#arc-cb-skip-cached');
  const txtStatus = root.querySelector('#arc-status');
  const txtStatCount = root.querySelector('#arc-stat-count');
  const barProgress = root.querySelector('#arc-progress-bar');

  btnClose.onclick = () => {
    if (confirm('Bạn có chắc muốn đóng bảng điều khiển? Tiến trình tải sẽ dừng lại.')) {
      isTerminated = true;
      window.__wikicvCrawlerRunning = false;
      root.remove();
    }
  };

  btnToggle.onclick = () => {
    isPaused = !isPaused;
    btnToggle.textContent = isPaused ? '▶️ Tiếp tục' : '⏸️ Tạm dừng';
    btnToggle.style.background = isPaused ? '#16a34a' : '#0284c7';
    txtStatus.textContent = isPaused ? 'Đã tạm dừng. Bấm "Tiếp tục" khi sẵn sàng.' : 'Đang tiếp tục...';
  };

  btnExport.onclick = async () => {
    if (!dbInstance) return;
    btnExport.disabled = true;
    btnExport.textContent = 'Đang đóng gói...';
    const all = await getAllSavedChapters(dbInstance);
    all.sort((a, b) => a.chapterIndex - b.chapterIndex);
    
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`bach-the-cau-tien-wikicv-\${all.length}chaps.json\`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);

    btnExport.disabled = false;
    btnExport.textContent = '💾 Xuất file JSON';
    txtStatus.textContent = \`Đã xuất file \${all.length} chương thành công!\`;
  };

  btnClear.onclick = async () => {
    if (!dbInstance) return;
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ các chương đã lưu trong IndexedDB để tải lại?')) {
      await clearSavedChapters(dbInstance);
      alert('Đã xóa bộ nhớ đệm! Hãy dán lại script hoặc F5 để bắt đầu lại.');
      location.reload();
    }
  };

  // Main Loop
  (async () => {
    try {
      dbInstance = await openDB();
      const savedList = await getAllSavedChapters(dbInstance);
      const savedMap = new Map(savedList.map(c => [c.chapterIndex, true]));

      let downloadedCount = savedList.length;
      const totalCount = CHAPTERS.length;

      function updateProgress(currentIdx, currentTitle) {
        const percent = Math.min(100, Math.round((downloadedCount / totalCount) * 100));
        txtStatCount.textContent = \`Đã tải: \${downloadedCount} / \${totalCount} (\${percent}%)\`;
        barProgress.style.width = \`\${percent}%\`;
        if (currentTitle) {
          txtStatus.textContent = \`[\${currentIdx}/\${totalCount}] \${currentTitle}\`;
        }
      }

      updateProgress(0, \`Đã có sẵn \${downloadedCount} chương trong bộ nhớ đệm.\`);

      for (let i = 0; i < CHAPTERS.length; i++) {
        if (isTerminated) break;

        const ch = CHAPTERS[i];

        // Check if skipped by cached checkbox
        if (cbSkipCached.checked && ALREADY_CACHED_SET.has(ch.index) && !savedMap.has(ch.index)) {
          // Chapter already in Mongo Atlas
          continue;
        }

        // Check if already in IndexedDB
        if (savedMap.has(ch.index)) {
          continue;
        }

        while (isPaused) {
          if (isTerminated) break;
          await sleep(500);
        }
        if (isTerminated) break;

        updateProgress(ch.index, \`Đang tải: \${ch.title}...\`);

        let success = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const url = ch.path.startsWith('http') ? ch.path : \`https://wikicv.org\${ch.path}\`;
            const resp = await fetch(url, {
              headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
              }
            });

            if (resp.status === 403) {
              txtStatus.innerHTML = \`<span style="color: #f87171;">⚠️ Cloudflare tạm giữ request (HTTP 403). Tự động nghỉ 30s...</span>\`;
              await sleep(30000);
              continue;
            }

            if (resp.status === 429) {
              txtStatus.innerHTML = \`<span style="color: #fbbf24;">⚠️ Quá tải (HTTP 429). Đang nghỉ 10s...</span>\`;
              await sleep(10000);
              continue;
            }

            if (!resp.ok) {
              throw new Error(\`HTTP \${resp.status}\`);
            }

            const html = await resp.text();
            const content = extractChapterContent(html, ch);

            const record = {
              id: \`\${STORY_ID}-chap-\${ch.index}\`,
              storyId: STORY_ID,
              chapterIndex: ch.index,
              title: ch.title,
              path: ch.path,
              sourceUrl: url,
              sourceVersion: SOURCE_VERSION,
              source: 'wikicv',
              hasAudioFile: false,
              content: content
            };

            await saveChapter(dbInstance, record);
            savedMap.set(ch.index, true);
            downloadedCount++;
            success = true;
            break;
          } catch (err) {
            console.warn(\`Lỗi tải chương \${ch.index} (thử lần \${attempt}):\`, err.message);
            txtStatus.innerHTML = \`<span style="color: #f87171;">Lỗi chương \${ch.index} (\${err.message}). Thử lại sau \${attempt * 3}s...</span>\`;
            await sleep(attempt * 3000);
          }
        }

        updateProgress(ch.index, success ? \`Đã lưu: \${ch.title}\` : \`Không thể tải: \${ch.title}\`);

        // Safe delay 1800ms between chapters to keep Cloudflare happy
        await sleep(1800);
      }

      if (!isTerminated) {
        updateProgress(totalCount, '🎉 HOÀN TẤT TẢI TOÀN BỘ CHƯƠNG!');
        txtStatus.innerHTML = '<span style="color: #4ade80; font-weight: bold;">🎉 Đã hoàn tất tải 100%! Đang tự động xuất file...</span>';
        btnToggle.style.display = 'none';
        btnExport.click();
      }
    } catch (fatal) {
      console.error('Fatal crawler error:', fatal);
      txtStatus.innerHTML = \`<span style="color: #f87171;">Lỗi nghiêm trọng: \${fatal.message}</span>\`;
    }
  })();
})();
`;

await fs.writeFile('scripts/wikicv-bach-the-cau-tien.js', scriptCode, 'utf8');
console.log('Successfully generated scripts/wikicv-bach-the-cau-tien.js');
