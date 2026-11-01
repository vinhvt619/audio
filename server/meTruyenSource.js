import { storySources, getSourceChapters } from '../src/data/storySources.js';

let blockedUntil = 0;
const pending = new Map();

export function parseMeTruyenChapter(html, metadata) {
  const match = html.match(/<div\b[^>]*\bclass=["']truyen["'][^>]*>([\s\S]*?)<\/div>/i);
  if (!match) throw Object.assign(new Error('Nguồn chưa trả nội dung chương.'), { code: 'SOURCE_EMPTY' });
  const blocks = match[1].replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?\s*>|<\/(?:p|div)>/gi, '\n\n').replace(/<[^>]*>/g, '')
    .replace(/&#(x[\da-f]+|\d+);/gi, (_, value) => {
      const point = value[0].toLowerCase() === 'x' ? parseInt(value.slice(1), 16) : Number(value);
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : '';
    })
    .replace(/&(nbsp|quot|apos|lt|gt|amp);/gi, (_, name) => ({
      nbsp: ' ', quot: '"', apos: "'", lt: '<', gt: '>', amp: '&',
    })[name.toLowerCase()])
    .replace(/\r/g, '').split('\n').map(text => text.trim()).filter(Boolean);
  if (/^Chương\s+\d+/i.test(blocks[0] || '')) blocks.shift();
  const content = blocks.join('\n\n');
  if (content.length < 50 || (content.match(/\uFFFD/g) || []).length > content.length * 0.02) {
    throw Object.assign(new Error('Nguồn chưa có nội dung đọc được.'), { code: 'SOURCE_EMPTY' });
  }
  return { ...metadata, content, source: 'metruyenchu', sourceCheckedAt: Date.now() };
}

export async function fetchMeTruyenChapter(storyId, chapterIndex) {
  if (!storySources[storyId]) return null;
  const metadata = getSourceChapters(storyId).find(ch => ch.chapterIndex === chapterIndex);
  if (!metadata?.sourceUrl) return null;
  if (Date.now() < blockedUntil) throw Object.assign(new Error('Nguồn đang từ chối truy cập.'), { code: 'SOURCE_UNAVAILABLE' });
  if (pending.has(metadata.sourceUrl)) return pending.get(metadata.sourceUrl);
  const work = (async () => {
    const response = await fetch(metadata.sourceUrl, {
      signal: AbortSignal.timeout(12000), redirect: 'error', headers: { Accept: 'text/html' },
    });
    if (!response.ok) {
      if (response.status === 403 || response.status === 429) blockedUntil = Date.now() + 15 * 60 * 1000;
      throw Object.assign(new Error('Nguồn tạm thời không tải được.'), { code: 'SOURCE_UNAVAILABLE' });
    }
    return parseMeTruyenChapter(await response.text(), metadata);
  })();
  pending.set(metadata.sourceUrl, work);
  try { return await work; } finally { pending.delete(metadata.sourceUrl); }
}
