import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('No MONGODB_URI found in .env');
  process.exit(1);
}

const STORY_ID = 'de-ba';
// Command line argument for target max chapter or default 2000
const targetArg = process.argv[2] ? parseInt(process.argv[2], 10) : 2000;
const MAX_CHAPTER = isNaN(targetArg) ? 2000 : targetArg;

async function fetchChapterFromWetruyen(chapNum) {
  const url = `https://wetruyen.com/de-ba/chuong-${chapNum}.html`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (!html || html.length < 500) return null;

    let title = `Chương ${chapNum}`;
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      const rawTitle = titleMatch[1].replace(/của truyện.*$/i, '').split(' - ')[0].trim();
      if (
        rawTitle.length > 0 &&
        !rawTitle.toLowerCase().includes('404') &&
        !rawTitle.toLowerCase().includes('không tìm thấy') &&
        !rawTitle.toLowerCase().includes('trang đọc truyện online')
      ) {
        title = rawTitle;
      } else {
        return null;
      }
    }

    const contentMatch =
      html.match(/<div[^>]*id="chapter-c"[^>]*>([\s\S]*?)<\/div>/i) ||
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
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .join('\n\n');

    if (!cleaned || cleaned.length < 50) return null;

    return {
      id: `${STORY_ID}-chap-${chapNum}`,
      storyId: STORY_ID,
      chapterIndex: chapNum,
      title,
      content: cleaned,
      hasAudioFile: false,
    };
  } catch {
    return null;
  }
}

async function run() {
  console.log(`[Sync De Ba] Connecting to MongoDB Atlas (Target: up to ${MAX_CHAPTER})...`);
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('audio_novel_db');

  const existingChaps = await db
    .collection('chapters')
    .find({ storyId: STORY_ID }, { projection: { chapterIndex: 1 } })
    .toArray();
  const existingSet = new Set(existingChaps.map((c) => c.chapterIndex));
  console.log(`[Sync De Ba] Currently in Mongo: ${existingSet.size} chapters.`);

  const missing = [];
  for (let i = 1; i <= MAX_CHAPTER; i++) {
    if (!existingSet.has(i)) {
      missing.push(i);
    }
  }

  console.log(`[Sync De Ba] Missing chapters up to ${MAX_CHAPTER}: ${missing.length}`);
  if (missing.length === 0) {
    console.log('[Sync De Ba] All chapters are already present in MongoDB Atlas!');
    await client.close();
    return;
  }

  const BATCH_SIZE = 25;
  const CONCURRENCY = 5;
  let totalSaved = 0;

  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const chunk = missing.slice(i, i + BATCH_SIZE);
    const results = [];

    for (let c = 0; c < chunk.length; c += CONCURRENCY) {
      const sub = chunk.slice(c, c + CONCURRENCY);
      const subRes = await Promise.all(sub.map((n) => fetchChapterFromWetruyen(n)));
      results.push(...subRes);
      await new Promise((r) => setTimeout(r, 120));
    }

    const valid = results.filter(Boolean);
    if (valid.length > 0) {
      const ops = valid.map((ch) => ({
        updateOne: {
          filter: { id: ch.id },
          update: { $set: ch },
          upsert: true,
        },
      }));
      await db.collection('chapters').bulkWrite(ops);
      totalSaved += valid.length;
      console.log(
        `[Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(missing.length / BATCH_SIZE)}] Saved ${valid.length} chapters (Total in DB: ${existingSet.size + totalSaved}/${MAX_CHAPTER})`
      );
    }

    await new Promise((r) => setTimeout(r, 200));
  }

  const finalCount = await db.collection('chapters').countDocuments({ storyId: STORY_ID });
  console.log(`[Sync De Ba] Done! Total chapters of ${STORY_ID} in Atlas: ${finalCount}`);
  await client.close();
}

run().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
