import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('No MONGODB_URI found in .env');
  process.exit(1);
}

const STORY_ID = 'moi-ngay-mot-que';
const MAX_CHAPTER = 549;

async function fetchChapterFromWetruyen(chapNum) {
  const url = `https://wetruyen.com/moi-ngay-mot-que-tu-tan-tu-phuong-thi-den-truong-sinh-c/chuong-${chapNum}.html`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
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
  console.log('[Sync] Connecting to MongoDB Atlas...');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('audio_novel_db');

  // Find existing chapters
  const existingChaps = await db
    .collection('chapters')
    .find({ storyId: STORY_ID }, { projection: { chapterIndex: 1 } })
    .toArray();
  const existingSet = new Set(existingChaps.map((c) => c.chapterIndex));
  console.log(`[Sync] Currently in Mongo: ${existingSet.size} chapters.`);

  const missing = [];
  for (let i = 1; i <= MAX_CHAPTER; i++) {
    if (!existingSet.has(i)) {
      missing.push(i);
    }
  }

  console.log(`[Sync] Total missing chapters to download: ${missing.length}`);
  if (missing.length === 0) {
    console.log('[Sync] Story is already 100% synchronized!');
    await client.close();
    return;
  }

  let downloaded = 0;
  let batchBuffer = [];

  // Process in batches with concurrency 5
  const concurrency = 5;
  for (let i = 0; i < missing.length; i += concurrency) {
    const chunk = missing.slice(i, i + concurrency);
    const results = await Promise.all(
      chunk.map((chapNum) => fetchChapterFromWetruyen(chapNum))
    );

    for (const res of results) {
      if (res) {
        batchBuffer.push(res);
        downloaded++;
      }
    }

    if (batchBuffer.length >= 25 || i + concurrency >= missing.length) {
      if (batchBuffer.length > 0) {
        const operations = batchBuffer.map((ch) => ({
          updateOne: {
            filter: { id: ch.id },
            update: { $set: ch },
            upsert: true,
          },
        }));
        await db.collection('chapters').bulkWrite(operations);
        console.log(
          `[Sync Progress] Saved ${downloaded}/${missing.length} chapters into MongoDB Atlas...`
        );
        batchBuffer = [];
      }
    }

    // Polite delay
    await new Promise((r) => setTimeout(r, 150));
  }

  // Update story chapters count
  const finalCount = await db
    .collection('chapters')
    .countDocuments({ storyId: STORY_ID });
  await db
    .collection('stories')
    .updateOne(
      { id: STORY_ID },
      { $set: { chaptersCount: finalCount, updatedAt: Date.now() } }
    );

  console.log(
    `[Sync Complete] 'Mỗi Ngày Một Quẻ' now has ${finalCount} chapters in MongoDB Atlas!`
  );
  await client.close();
}

run().catch((err) => {
  console.error('[Sync Error]:', err);
  process.exit(1);
});
