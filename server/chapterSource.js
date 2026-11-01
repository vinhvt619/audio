import { storySources } from '../src/data/storySources.js';
import { fetchMeTruyenChapter } from './meTruyenSource.js';

export async function fetchLiveChapter(story, chapNum) {
  if (storySources[story]) return fetchMeTruyenChapter(story, chapNum);
  if (story === 'bach-the-cau-tien' || story === 'de-ba') {
    const url = `https://wetruyen.com/${story}/chuong-${chapNum}.html`;
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(15000),
        headers: { 'User-Agent': 'Mozilla/5.0 AudioRead/1.0' },
      });
      if (!response.ok) return null;
      const html = await response.text();

      if (!html || html.length < 500) return null;

      let title = `Chương ${chapNum}`;
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch) {
        const rawTitle = titleMatch[1].replace(/của truyện.*$/i, '').split(' - ')[0].trim();
        if (rawTitle.length > 0 && !rawTitle.toLowerCase().includes('404 not found') && !rawTitle.toLowerCase().includes('không tìm thấy')) {
          title = rawTitle;
        } else {
          return null;
        }
      }

      const contentMatch = html.match(/<div[^>]*id="chapter-c"[^>]*>([\s\S]*?)<\/div>/i) ||
                           html.match(/<div[^>]*class="[^"]*chapter-c[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      if (!contentMatch) return null;

      const cleaned = contentMatch[1]
        .replace(/<br\s*[\/]?>/gi, '\n')
        .replace(/<p[^>]*>/gi, '')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&#13;/g, '')
        .replace(/\r/g, '')
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0)
        .join('\n\n');

      if (!cleaned || cleaned.length < 50) return null;

      return {
        id: `${story}-chap-${chapNum}`,
        storyId: story,
        chapterIndex: chapNum,
        title,
        content: cleaned,
        hasAudioFile: false
      };
    } catch {
      return null;
    }
  } else if (story === 'moi-ngay-mot-que') {
    const url = `https://wetruyen.com/moi-ngay-mot-que-tu-tan-tu-phuong-thi-den-truong-sinh-c/chuong-${chapNum}.html`;
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(15000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
      });
      if (!response.ok) return null;
      const html = await response.text();

      if (!html || html.length < 500) return null;

      let title = `Chương ${chapNum}`;
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch) {
        const rawTitle = titleMatch[1].replace(/của truyện.*$/i, '').split(' - ')[0].trim();
        if (rawTitle.length > 0 && !rawTitle.toLowerCase().includes('404 not found') && !rawTitle.toLowerCase().includes('không tìm thấy') && !rawTitle.toLowerCase().includes('trang đọc truyện online')) {
          title = rawTitle;
        } else {
          return null;
        }
      }

      const contentMatch = html.match(/<div[^>]*id="chapter-c"[^>]*>([\s\S]*?)<\/div>/i) ||
                           html.match(/<div[^>]*class="[^"]*chapter-c[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      if (!contentMatch) return null;

      const cleaned = contentMatch[1]
        .replace(/<br\s*[\/]?>/gi, '\n')
        .replace(/<p[^>]*>/gi, '')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&#13;/g, '')
        .replace(/\r/g, '')
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0)
        .join('\n\n');

      if (!cleaned || cleaned.length < 50) return null;

      return {
        id: `moi-ngay-chap-${chapNum}`,
        storyId: 'moi-ngay-mot-que',
        chapterIndex: chapNum,
        title,
        content: cleaned,
        hasAudioFile: false
      };
    } catch {
      return null;
    }
  }
  return null;
}

