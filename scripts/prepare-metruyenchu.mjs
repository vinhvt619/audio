import fs from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

const directory = 'artifacts/metruyenchu-probe';
const decode = html => html.replace(/<[^>]+>/g, '').replace(/&#(x[\da-f]+|\d+);/gi, (_, value) =>
  String.fromCodePoint(value[0].toLowerCase() === 'x' ? parseInt(value.slice(1), 16) : Number(value)))
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim();
const indexed = new Map();
for (let page = 1; page <= 7; page++) {
  let html;
  if (page === 1) html = await fs.readFile(`${directory}/index.html`, 'utf8');
  else {
    const file = `${directory}/index-page-${page}.html`;
    try { html = await fs.readFile(file, 'utf8'); }
    catch {
      await delay(2000);
      const response = await fetch(`https://metruyenchu.com.vn/get/listchap/36398?page=${page}`, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw Error(`Mục lục trang ${page}: HTTP ${response.status}. Dừng tải.`);
      html = (await response.json()).data;
      await fs.writeFile(file, html);
    }
  }
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']*\/muon-doi-cau-tien\/chuong-(\d+)-[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const number = Number(match[2]);
    const title = decode(match[3]).replace(/^•/, '');
    if (!/^Chương\s+\d+/i.test(title)) continue;
    const url = new URL(match[1], 'https://metruyenchu.com.vn');
    url.hostname = 'metruyenchu.com.vn';
    indexed.set(number, { sourceChapterIndex: number, title, sourceUrl: url.href });
  }
  console.log(`Mục lục ${page}/7: ${indexed.size} chương`);
}
if (indexed.size !== 654 || !/thượng giá/i.test(indexed.get(101)?.title || '')) {
  throw Error('Mục lục khác kết quả đã kiểm tra. Chưa ghi catalog.');
}
const archived = JSON.parse(await fs.readFile(`${directory}/previous-chapters.json`, 'utf8'));
const chapters = archived.map(previous => {
  const sourceIndex = previous.chapterIndex <= 100 ? previous.chapterIndex : previous.chapterIndex + 1;
  const current = indexed.get(sourceIndex);
  const usable = !!current && sourceIndex !== 654;
  return {
    chapterIndex: previous.chapterIndex,
    title: usable ? current.title.replace(/^Chương\s+\d+\s*:?\s*/i, `Chương ${previous.chapterIndex}: `) : previous.title,
    ...(usable ? { sourceChapterIndex: sourceIndex, sourceUrl: current.sourceUrl } : {}),
    fallbackReason: sourceIndex === 654 ? 'empty' : !current ? 'not-listed' : undefined,
  };
});
const book = {
  source: 'metruyenchu', sourceLabel: 'Mê Truyện Chữ', sourceVersion: 'metruyenchu-2026-10-15',
  sourceUrl: 'https://metruyenchu.com.vn/muon-doi-cau-tien', upstreamChapterCount: 654,
  status: 'Mê Truyện Chữ • giữ chương chưa có từ bản đã lưu', chapters,
};
await fs.writeFile('src/data/meTruyenCatalog.js', `// Verified source catalog. Notice 101 is excluded to preserve the existing 722 chapter IDs and reading positions.\nexport const meTruyenBook = ${JSON.stringify(book, null, 2)};\n`);
console.log(JSON.stringify({ total: chapters.length, mapped: chapters.filter(ch => ch.sourceUrl).length,
  current515: chapters.find(ch => ch.chapterIndex === 515), excludedNotice: indexed.get(101)?.title }));
