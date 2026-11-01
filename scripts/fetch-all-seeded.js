import { execFile } from 'child_process';
import util from 'util';
import fs from 'fs';

const execFileAsync = util.promisify(execFile);

async function fetchHH3D(storySlug, chapNum) {
  const url = `https://truyenhh3d.com/truyen/${storySlug}/chuong-${chapNum}/`;
  try {
    const { stdout: html } = await execFileAsync('curl.exe', [
      '-sL',
      '--compressed',
      '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      url
    ], { maxBuffer: 10 * 1024 * 1024 });

    if (!html || html.length < 500) return null;

    let title = `Chương ${chapNum}`;
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      const rawTitle = titleMatch[1].split(' - ')[0].trim();
      if (rawTitle.length > 0) title = rawTitle;
    }

    const artMatch = html.match(/<article[^>]*class="art"[^>]*>([\s\S]*?)<\/article>/i);
    if (!artMatch) return null;

    let body = artMatch[1];
    const paragraphs = [];
    const pMatches = body.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
    if (pMatches) {
      for (const p of pMatches) {
        let cleaned = p
          .replace(/<br\s*[\/]?>/gi, '\n\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&#39;/g, "'")
          .trim();

        // If HH3D joined sentences together without paragraphs
        if (cleaned.length > 300 && !cleaned.includes('\n\n')) {
          cleaned = cleaned
            .replace(/\s{2,}/g, '\n\n')
            .replace(/([.!?…])\s+([A-ZÀ-Ỹ“"'])/g, '$1\n\n$2')
            .replace(/([”"'])\s+([A-ZÀ-Ỹ“"'])/g, '$1\n\n$2');
        }

        const sub = cleaned.split('\n\n').map(s => s.trim()).filter(s => s.length > 0);
        paragraphs.push(...sub);
      }
    }

    const content = paragraphs.join('\n\n');
    return {
      id: `${storySlug}-chap-${chapNum}`,
      storyId: storySlug,
      chapterIndex: chapNum,
      title,
      content,
      hasAudioFile: false
    };
  } catch (err) {
    console.error(`Error ${storySlug} chap ${chapNum}:`, err.message);
    return null;
  }
}

async function fetchDichTiengHoa(bookId, chapNum) {
  // 3449683 + chapNum
  const chapId = 3449683 + chapNum;
  const url = `https://dichtienghoa.net/truyen/${bookId}/${chapId}`;
  try {
    const { stdout: html } = await execFileAsync('curl.exe', [
      '-sL',
      '--compressed',
      '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      url
    ], { maxBuffer: 10 * 1024 * 1024 });

    if (!html || html.length < 500) return null;

    let title = `Chương ${chapNum}`;
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      const rawTitle = titleMatch[1].split(' - ')[0].trim();
      if (rawTitle.length > 0) title = rawTitle;
    }

    // In dichtienghoa.net, words are wrapped in <div class="chapter-body"...>
    const contentMatch = html.match(/<div[^>]*class="chapter-body"[^>]*>([\s\S]*?)<\/div>/i);
    if (!contentMatch) return null;

    let raw = contentMatch[1];
    let text = raw
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'")
      .replace(/\r\n/g, '\n');

    const paragraphs = text
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    const content = paragraphs.join('\n\n');
    return {
      id: `moi-ngay-chap-${chapNum}`,
      storyId: 'moi-ngay-mot-que',
      chapterIndex: chapNum,
      title,
      content,
      hasAudioFile: false
    };
  } catch (err) {
    console.error(`Error dichtienghoa chap ${chapNum}:`, err.message);
    return null;
  }
}

async function run() {
  console.log('--- Fetching Bách Thế Cầu Tiên chapters 1 to 12 ---');
  const bachTheChapters = [];
  for (let i = 1; i <= 12; i++) {
    const ch = await fetchHH3D('bach-the-cau-tien', i);
    if (ch && ch.content.length > 100) {
      console.log(`[Bách Thế] Chapter ${i}: ${ch.title} (${ch.content.length} chars)`);
      bachTheChapters.push(ch);
    } else {
      console.warn(`[Bách Thế] Failed chap ${i}`);
    }
  }

  console.log('\n--- Fetching Đế Bá chapters 1 to 12 ---');
  const deBaChapters = [];
  for (let i = 1; i <= 12; i++) {
    const ch = await fetchHH3D('de-ba', i);
    if (ch && ch.content.length > 100) {
      console.log(`[Đế Bá] Chapter ${i}: ${ch.title} (${ch.content.length} chars)`);
      deBaChapters.push(ch);
    } else {
      console.warn(`[Đế Bá] Failed chap ${i}`);
    }
  }

  console.log('\n--- Fetching Mỗi Ngày Một Quẻ chapters 1 to 10 ---');
  const moiNgayChapters = [];
  for (let i = 1; i <= 10; i++) {
    const ch = await fetchDichTiengHoa(3374, i);
    if (ch && ch.content.length > 100) {
      console.log(`[Mỗi Ngày] Chapter ${i}: ${ch.title} (${ch.content.length} chars)`);
      moiNgayChapters.push(ch);
    } else {
      console.warn(`[Mỗi Ngày] Failed chap ${i}`);
    }
  }

  const result = {
    bachTheChapters,
    deBaChapters,
    moiNgayChapters
  };

  fs.writeFileSync('scripts/fetched-pack.json', JSON.stringify(result, null, 2), 'utf8');
  console.log('\nSaved all to scripts/fetched-pack.json successfully!');
}

run();
