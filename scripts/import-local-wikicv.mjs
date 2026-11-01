import fs from 'node:fs/promises';
import path from 'node:path';
import { wikiCatalog, WIKI_SOURCE_VERSION } from '../src/data/wikiCatalog.js';

process.env.VERCEL = '1'; // prevent modifying public indexes
const {
  initMongo,
  getCurrentMongoUri,
  getStoriesFromMongo,
  saveStoryToMongo,
  getMongoStatus
} = await import('../server/mongoService.js');
const { MongoClient } = await import('mongodb');

if (!await initMongo()) {
  console.error('[Error] Could not initialize MongoDB connection.');
  process.exit(1);
}

// 1. Find json export file in potential directories
const possibleDirs = ['.', 'artifacts', 'artifacts/wiki-source', 'backups'];
let targetFile = null;

for (const dir of possibleDirs) {
  try {
    const files = await fs.readdir(dir);
    const found = files.find(f => /^bach-the-cau-tien-wikicv.*\.json$/i.test(f));
    if (found) {
      targetFile = path.join(dir, found);
      break;
    }
  } catch {}
}

if (!targetFile) {
  console.log(`[Waiting] Chưa tìm thấy file 'bach-the-cau-tien-wikicv-*.json'.`);
  console.log(`Hãy copy file tải từ trình duyệt vào thư mục dự án 'D:\\Github\\audio' hoặc 'artifacts/wiki-source/' rồi chạy lại lệnh:`);
  console.log(`node scripts/import-local-wikicv.mjs`);
  process.exit(0);
}

console.log(`[Found] Đang đọc file dữ liệu: ${targetFile}`);
const rawData = await fs.readFile(targetFile, 'utf8');
const chapters = JSON.parse(rawData);

if (!Array.isArray(chapters) || chapters.length === 0) {
  console.error('[Error] File JSON rỗng hoặc không đúng định dạng mảng chương.');
  process.exit(1);
}

console.log(`[Import] Tìm thấy ${chapters.length} chương trong file JSON. Bắt đầu đối chiếu và nạp vào MongoDB...`);

const client = new MongoClient(getCurrentMongoUri());
await client.connect();
const db = client.db('audio_novel_db');
const wikiCacheCol = db.collection('wikiChapterCache');

const operations = [];
let validCount = 0;
let invalidCount = 0;

for (const ch of chapters) {
  if (!ch.chapterIndex || !ch.content || ch.content.length < 50) {
    invalidCount++;
    continue;
  }

  const cleanRecord = {
    id: `bach-the-cau-tien-chap-${ch.chapterIndex}`,
    storyId: 'bach-the-cau-tien',
    chapterIndex: ch.chapterIndex,
    title: ch.title || `Chương ${ch.chapterIndex}`,
    path: ch.path || '',
    sourceUrl: ch.sourceUrl || `https://wikicv.org/truyen/muon-doi-cau-tien`,
    sourceVersion: WIKI_SOURCE_VERSION,
    source: 'wikicv',
    hasAudioFile: false,
    content: ch.content.trim(),
    importedAt: new Date().toISOString()
  };

  operations.push({
    updateOne: {
      filter: {
        storyId: 'bach-the-cau-tien',
        chapterIndex: cleanRecord.chapterIndex,
        sourceVersion: WIKI_SOURCE_VERSION
      },
      update: { $set: cleanRecord },
      upsert: true
    }
  });
  validCount++;
}

if (operations.length > 0) {
  const result = await wikiCacheCol.bulkWrite(operations);
  console.log(`[MongoDB] BulkWrite thành công: ${result.upsertedCount} chương thêm mới, ${result.modifiedCount} chương cập nhật.`);
}

// Check total in wikiChapterCache for bach-the-cau-tien
const totalInCache = await wikiCacheCol.countDocuments({
  storyId: 'bach-the-cau-tien',
  sourceVersion: WIKI_SOURCE_VERSION
});

console.log(`[Summary] Tổng số chương Bách Thế Cầu Tiên hiện có trong wikiChapterCache: ${totalInCache} / 723 chương.`);

// Update story metadata in stories collection if complete or substantial
if (totalInCache >= 720) {
  console.log('[Update] Dữ liệu đã đầy đủ! Cập nhật thông tin truyện Bách Thế Cầu Tiên sang nguồn WikiCV...');
  const stories = await getStoriesFromMongo();
  const story = stories.find(s => s.id === 'bach-the-cau-tien');
  if (story) {
    const book = wikiCatalog['bach-the-cau-tien'];
    await saveStoryToMongo({
      ...story,
      sourceUrl: book.sourceUrl,
      chaptersCount: book.chapters.length,
      description: book.description,
      status: book.status
    });
    console.log(`[Success] Đã cập nhật truyện 'Bách Thế Cầu Tiên' (723 chương).`);
  }
} else {
  console.log(`[Notice] Hiện có ${totalInCache}/723 chương trong cache. Bạn có thể tiếp tục tải thêm các chương còn lại.`);
}

await client.close();
process.exit(0);
