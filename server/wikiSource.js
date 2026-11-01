import { wikiCatalog, getWikiChapters } from '../src/data/wikiCatalog.js';

const chapterCache = new Map();
const pending = new Map();

function plainText(html) {
  return html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(?:p|div|li)>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&#(x[\da-f]+|\d+);/gi, (_, code) => {
      const point = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code);
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : '';
    })
    .replace(/&(nbsp|quot|apos|lt|gt|amp);/gi, (_, name) => ({
      nbsp: ' ', quot: '"', apos: "'", lt: '<', gt: '>', amp: '&',
    })[name.toLowerCase()])
    .replace(/\r/g, '').split('\n').map(line => line.trim()).filter(Boolean).join('\n\n');
}

export function parseWikiChapter(html, metadata) {
  const body = html.match(/<div\b[^>]*\bid=["']bookContentBody["'][^>]*>([\s\S]*?)<\/div>/i);
  if (!body) throw new Error('WikiCV chưa trả nội dung chương. Vui lòng thử lại sau.');
  const blocks = plainText(body[1]).split('\n\n');
  // WikiCV repeats the heading inside its content container.
  if (blocks[0]?.match(/^Chương\s+\d+/i)) blocks.shift();
  const content = blocks.join('\n\n').trim();
  const replacementCount = (content.match(/\uFFFD/g) || []).length;
  if (content.length < 50 || (replacementCount > 20 && replacementCount / content.length > 0.02)) {
    throw new Error('Nội dung chương này trên WikiCV đang thiếu hoặc bị lỗi mã hóa.');
  }
  return { ...metadata, content };
}

export async function fetchWikiChapter(storyId, chapterIndex) {
  if (!wikiCatalog[storyId]) return null;
  const metadata = getWikiChapters(storyId).find(ch => ch.chapterIndex === chapterIndex);
  if (!metadata) return null;
  if (chapterCache.has(metadata.sourceUrl)) return chapterCache.get(metadata.sourceUrl);
  if (pending.has(metadata.sourceUrl)) return pending.get(metadata.sourceUrl);
  const work = (async () => {
    // Only fixed chapter URLs in the owner's verified catalog are fetched.
    const response = await fetch(metadata.sourceUrl, {
      signal: AbortSignal.timeout(20000), redirect: 'error',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AudioRead/1.0)', Accept: 'text/html' },
    });
    if (!response.ok) throw new Error('WikiCV tạm thời không tải được chương. Vui lòng thử lại sau.');
    const chapter = parseWikiChapter(await response.text(), metadata);
    if (chapterCache.size >= 100) chapterCache.delete(chapterCache.keys().next().value);
    chapterCache.set(metadata.sourceUrl, chapter);
    return chapter;
  })();
  pending.set(metadata.sourceUrl, work);
  try { return await work; }
  finally { pending.delete(metadata.sourceUrl); }
}
