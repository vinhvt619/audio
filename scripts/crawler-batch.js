import { execFile } from 'child_process';
import util from 'util';

const execFileAsync = util.promisify(execFile);

async function fetchChapterHH3D(storySlug, chapNum) {
  const url = `https://truyenhh3d.com/truyen/${storySlug}/chuong-${chapNum}/`;
  try {
    const { stdout: html } = await execFileAsync('curl.exe', [
      '-sL',
      '--compressed',
      '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      url
    ], { maxBuffer: 10 * 1024 * 1024 });

    if (!html || html.length < 500) return null;

    // Extract title
    let title = `Chương ${chapNum}`;
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      const rawTitle = titleMatch[1].split(' - ')[0].trim();
      if (rawTitle.length > 0) title = rawTitle;
    }

    // Extract article content
    const artMatch = html.match(/<article[^>]*class="art"[^>]*>([\s\S]*?)<\/article>/i);
    if (!artMatch) return null;

    let body = artMatch[1];
    // Convert <p> to paragraphs
    const paragraphs = [];
    const pMatches = body.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
    if (pMatches) {
      for (const p of pMatches) {
        const cleaned = p
          .replace(/<br\s*[\/]?>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&#39;/g, "'")
          .trim();
        if (cleaned.length > 0) {
          paragraphs.push(cleaned);
        }
      }
    } else {
      // Fallback
      const text = body.replace(/<[^>]+>/g, '').trim();
      paragraphs.push(text);
    }

    const content = paragraphs.join('\n\n');
    return {
      chapNum,
      title,
      content,
      length: content.length,
      paragraphsCount: paragraphs.length
    };
  } catch (err) {
    console.error(`Error chap ${chapNum}:`, err.message);
    return null;
  }
}

async function run() {
  console.log('Testing crawl for Bach The Cau Tien chap 5 and 6...');
  const c5 = await fetchChapterHH3D('bach-the-cau-tien', 5);
  const c6 = await fetchChapterHH3D('bach-the-cau-tien', 6);
  console.log('C5 title:', c5?.title, 'len:', c5?.length, 'paragraphs:', c5?.paragraphsCount);
  console.log('C6 title:', c6?.title, 'len:', c6?.length, 'paragraphs:', c6?.paragraphsCount);

  console.log('Testing crawl for De Ba chap 4 and 5...');
  const d4 = await fetchChapterHH3D('de-ba', 4);
  const d5 = await fetchChapterHH3D('de-ba', 5);
  console.log('D4 title:', d4?.title, 'len:', d4?.length, 'paragraphs:', d4?.paragraphsCount);
  console.log('D5 title:', d5?.title, 'len:', d5?.length, 'paragraphs:', d5?.paragraphsCount);
}

run();
