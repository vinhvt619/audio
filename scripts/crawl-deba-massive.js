import { MongoClient } from 'mongodb';
import { execFile } from 'child_process';
import util from 'util';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const execFileAsync = util.promisify(execFile);
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI not found in .env!');
  process.exit(1);
}

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
        results[idx] = null;
      }
    }
  }

  const workers = Array.from({ length: limit }, () => worker());
  await Promise.all(workers);
  return results;
}

async function fetchWetruyenChap(chapNum) {
  const url = `https://wetruyen.com/de-ba/chuong-${chapNum}.html`;
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
      id: `de-ba-chap-${chapNum}`,
      storyId: 'de-ba',
      chapterIndex: chapNum,
      title,
      content: cleaned,
      hasAudioFile: false
    };
  } catch {
    return null;
  }
}

async function run() {
  console.log('Connecting to MongoDB Atlas...');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('audio_novel_db');
  console.log('Connected! Starting continuous chapter loader for Đế Bá...');

  const chaptersCol = db.collection('chapters');

  // Find all existing chapter indexes for de-ba
  const existing = new Set(
    (await chaptersCol.find({ storyId: 'de-ba' }, { projection: { chapterIndex: 1 } }).toArray())
      .map(c => c.chapterIndex)
  );

  console.log(`Current chapters of Đế Bá in Mongo: ${existing.size}`);

  // Target: up to 1500 in this run (can be adjusted or run further)
  const maxTarget = 1500;
  const missing = [];
  for (let i = 1; i <= maxTarget; i++) {
    if (!existing.has(i)) missing.push(i);
  }

  console.log(`Remaining chapters to fetch up to ${maxTarget}: ${missing.length}`);

  const CHUNK_SIZE = 25;
  let totalSaved = 0;

  for (let i = 0; i < missing.length; i += CHUNK_SIZE) {
    const chunk = missing.slice(i, i + CHUNK_SIZE);
    const results = await mapConcurrent(chunk, 6, async (chapNum) => {
      process.stdout.write('.');
      return await fetchWetruyenChap(chapNum);
    });

    const valid = results.filter(Boolean);
    if (valid.length > 0) {
      const ops = valid.map(ch => ({
        updateOne: {
          filter: { id: ch.id },
          update: { $set: ch },
          upsert: true
        }
      }));
      await chaptersCol.bulkWrite(ops);
      totalSaved += valid.length;
      console.log(` [Batch ${Math.floor(i / CHUNK_SIZE) + 1}] Saved ${valid.length} chapters (Total so far: ${existing.size + totalSaved}/${maxTarget})`);
    } else {
      console.log(` [Batch ${Math.floor(i / CHUNK_SIZE) + 1}] 0 chapters fetched`);
    }

    // Brief gentle pause between batches
    await new Promise(r => setTimeout(r, 200));
  }

  const finalCount = await chaptersCol.countDocuments({ storyId: 'de-ba' });
  const totalDbCount = await chaptersCol.countDocuments();
  console.log(`\n==============================================`);
  console.log(`Đế Bá now has ${finalCount} chapters in MongoDB Atlas!`);
  console.log(`Total chapters across all stories in Atlas: ${totalDbCount}`);
  console.log(`==============================================`);

  await client.close();
}

run().catch(err => {
  console.error('Crawler error:', err);
  process.exit(1);
});
