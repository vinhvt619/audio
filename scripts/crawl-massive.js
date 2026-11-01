import { execFile } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';

const execFileAsync = util.promisify(execFile);

// Helper to run with concurrency limit
async function mapConcurrent(items, limit, fn) {
  const results = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      const item = items[idx];
      try {
        results[idx] = await fn(item, idx);
      } catch (err) {
        console.error(`Error processing item ${idx}:`, err.message);
        results[idx] = null;
      }
    }
  }

  const workers = Array.from({ length: limit }, () => worker());
  await Promise.all(workers);
  return results;
}

async function fetchHH3D(storySlug, chapNum) {
  const url = `https://truyenhh3d.com/truyen/${storySlug}/chuong-${chapNum}/`;
  try {
    const { stdout: html } = await execFileAsync('curl.exe', [
      '-sL',
      '--compressed',
      '-m', '15',
      '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      url
    ], { maxBuffer: 10 * 1024 * 1024 });

    if (!html || html.length < 500) return null;

    let title = `Chương ${chapNum}`;
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      const rawTitle = titleMatch[1].split(' - ')[0].trim();
      if (rawTitle.length > 0 && !rawTitle.toLowerCase().includes('404')) {
        title = rawTitle;
      } else {
        return null;
      }
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
    if (!content || content.length < 50) return null;

    return {
      id: `${storySlug}-chap-${chapNum}`,
      storyId: storySlug,
      chapterIndex: chapNum,
      title,
      content,
      hasAudioFile: false
    };
  } catch (err) {
    return null;
  }
}

async function fetchDichTiengHoa(bookId, chapNum) {
  const chapId = 3449683 + chapNum;
  const url = `https://dichtienghoa.net/truyen/${bookId}/${chapId}`;
  try {
    const { stdout: html } = await execFileAsync('curl.exe', [
      '-sL',
      '--compressed',
      '-m', '15',
      '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      url
    ], { maxBuffer: 10 * 1024 * 1024 });

    if (!html || html.length < 500) return null;

    let title = `Chương ${chapNum}`;
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      const rawTitle = titleMatch[1].split(' - ')[0].trim();
      if (rawTitle.length > 0 && !rawTitle.includes('Đọc chương truyện')) {
        title = rawTitle;
      } else {
        return null;
      }
    }

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
    if (!content || content.length < 50) return null;

    return {
      id: `moi-ngay-chap-${chapNum}`,
      storyId: 'moi-ngay-mot-que',
      chapterIndex: chapNum,
      title,
      content,
      hasAudioFile: false
    };
  } catch (err) {
    return null;
  }
}

async function run() {
  console.log('=== STARTING MASSIVE CHAPTER CRAWLER ===');

  // 1. Mỗi Ngày Một Quẻ (all 65 chapters)
  console.log('\n--> Fetching all 65 chapters of "Mỗi Ngày Một Quẻ"...');
  const moiNgayNums = Array.from({ length: 65 }, (_, i) => i + 1);
  const moiNgayRaw = await mapConcurrent(moiNgayNums, 4, async (num) => {
    process.stdout.write(`.`);
    return await fetchDichTiengHoa(3374, num);
  });
  const moiNgayChapters = moiNgayRaw.filter(Boolean);
  console.log(`\nDone Mỗi Ngày Một Quẻ: ${moiNgayChapters.length}/65 chapters fetched!`);

  // 2. Bách Thế Cầu Tiên (Chapters 1 to 100)
  console.log('\n--> Fetching chapters 1 to 100 of "Bách Thế Cầu Tiên"...');
  const bachTheNums = Array.from({ length: 100 }, (_, i) => i + 1);
  const bachTheRaw = await mapConcurrent(bachTheNums, 4, async (num) => {
    process.stdout.write(`.`);
    return await fetchHH3D('bach-the-cau-tien', num);
  });
  const bachTheChapters = bachTheRaw.filter(Boolean);
  console.log(`\nDone Bách Thế Cầu Tiên: ${bachTheChapters.length}/100 chapters fetched!`);

  // 3. Đế Bá (Chapters 1 to 100)
  console.log('\n--> Fetching chapters 1 to 100 of "Đế Bá"...');
  const deBaNums = Array.from({ length: 100 }, (_, i) => i + 1);
  const deBaRaw = await mapConcurrent(deBaNums, 4, async (num) => {
    process.stdout.write(`.`);
    return await fetchHH3D('de-ba', num);
  });
  const deBaChapters = deBaRaw.filter(Boolean);
  console.log(`\nDone Đế Bá: ${deBaChapters.length}/100 chapters fetched!`);

  const output = {
    bachTheChapters,
    deBaChapters,
    moiNgayChapters
  };

  fs.writeFileSync('scripts/fetched-pack.json', JSON.stringify(output, null, 2), 'utf8');
  console.log(`\nSuccessfully wrote fetched-pack.json! Total chapters: ${bachTheChapters.length + deBaChapters.length + moiNgayChapters.length}`);
}

run();
