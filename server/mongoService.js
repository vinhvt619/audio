import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { WIKI_SOURCE_VERSION } from '../src/data/wikiCatalog.js';
import { storySources } from '../src/data/storySources.js';

dotenv.config({ quiet: true });

let client = null;
let db = null;
let isConnected = false;
let currentUri = process.env.MONGODB_URI || '';

const ENV_PATH = path.resolve(process.cwd(), '.env');

export function getCurrentMongoUri() {
  return currentUri;
}

export function isMongoReady() {
  return isConnected && !!db;
}

export async function initMongo(customUri) {
  const uri = customUri || process.env.MONGODB_URI || '';
  if (!uri) {
    console.log('[MongoDB] No MONGODB_URI found. Waiting for configuration.');
    isConnected = false;
    db = null;
    return false;
  }

  try {
    if (client) {
      try {
        await client.close();
      } catch {}
    }

    console.log('[MongoDB] Connecting to MongoDB Atlas...');
    client = new MongoClient(uri, {
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
    });

    await client.connect();
    // Default db name or parsed from URI, fallback to 'audio_novel_db'
    db = client.db(uri.split('?')[0].split('/').pop() || 'audio_novel_db');
    isConnected = true;
    currentUri = uri;
    console.log(`[MongoDB] Connected successfully to database: ${db.databaseName}`);

    // Hosted requests only read the shared library. Do not seed or create
    // indexes as a side effect of a visitor opening the public website.
    if (process.env.VERCEL) return true;

    // Create unique indexes
    await db.collection('stories').createIndex({ id: 1 }, { unique: true });
    await db.collection('chapters').createIndex({ storyId: 1, chapterIndex: 1 });
    await db.collection('chapters').createIndex({ id: 1 }, { unique: true });
    await db.collection('readingProgress').createIndex({ storyId: 1 }, { unique: true });

    // Seed if empty
    await seedMongoIfEmpty();

    return true;
  } catch (err) {
    console.error('[MongoDB] Connection error:', err.message);
    isConnected = false;
    db = null;
    return false;
  }
}

export async function saveMongoUri(uri) {
  // Test connection first
  const success = await initMongo(uri);
  if (!success) {
    throw new Error('Không thể kết nối tới MongoDB với chuỗi kết nối vừa nhập. Vui lòng kiểm tra lại username, password và IP whitelist trên MongoDB Atlas!');
  }

  // Save to .env
  let envContent = '';
  if (fs.existsSync(ENV_PATH)) {
    envContent = fs.readFileSync(ENV_PATH, 'utf8');
  }

  if (envContent.includes('MONGODB_URI=')) {
    envContent = envContent.replace(/MONGODB_URI=.*/g, `MONGODB_URI="${uri}"`);
  } else {
    envContent += `\nMONGODB_URI="${uri}"\n`;
  }

  fs.writeFileSync(ENV_PATH, envContent.trim() + '\n', 'utf8');
  return true;
}

export async function seedMongoIfEmpty() {
  if (!db) return;
  try {
    const storiesCount = await db.collection('stories').countDocuments();
    if (storiesCount > 0) {
      return;
    }
    const packPath = path.resolve(process.cwd(), 'scripts/fetched-pack.json');
    if (!fs.existsSync(packPath)) return;

    const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
    const seedStories = [
      {
        id: 'bach-the-cau-tien',
        title: 'Bách Thế Cầu Tiên',
        author: 'Hắc Gia Nhưỡng Ti Tửu',
        category: 'Tiên Hiệp • Trường Sinh Lưu',
        description: 'Muôn đời nhập phàm trần, không tranh một thế chi cảnh xuân tươi đẹp, chỉ tranh muôn đời chi sớm chiều. Tại trong hồng trần cầu tiên.\n\nTa gọi Lý Thanh, tam thế thoát phàm, cửu thế nhập đạo, muôn đời thành tiên.\n\nMỗi một kiếp nhân sinh đều trải qua sinh lão bệnh tử, đến đại nạn thọ tận lại phản lão hoàn đồng trở lại thiếu niên. Không tranh đấu ngông cuồng, cẩn trọng cẩu đạo, từng bước trường sinh trong hồng trần cuồn cuộn.',
        coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
        chaptersCount: pack.bachTheChapters?.length || 100,
        createdAt: Date.now() - 3000,
        updatedAt: Date.now() - 3000,
      },
      {
        id: 'moi-ngay-mot-que',
        title: 'Mỗi Ngày Một Quẻ, Từ Phường Thị Tán Tu Đến Trường Sinh Tiên Tôn',
        author: 'Bắc Cảnh Nam Phong',
        category: 'Tiên Hiệp • Cẩu Đạo • Hệ Thống',
        description: 'Lý Trường An chuyển thế đến tu tiên giới tàn khốc, bắt đầu từ một tán tu tầm thường nơi phường thị, không tông môn, không gia thế, linh căn bậc thấp, cơ duyên trường sinh xa vời vợi.\n\nMay mắn thay, hắn thức tỉnh hệ thống 【Mỗi Ngày Hỏi Quẻ】: Mỗi ngày có thể gieo một quẻ để biết trước cát hung! Nhờ cẩu đạo vững vàng và kết thiện duyên, Lý Trường An từng bước tích lũy tu vi, chứng kiến vô số thiên kiêu chôn vùi theo tuế nguyệt, cuối cùng trở thành Trường Sinh Tiên Tôn.',
        coverUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80',
        chaptersCount: pack.moiNgayChapters?.length || 56,
        createdAt: Date.now() - 2000,
        updatedAt: Date.now() - 2000,
      },
      {
        id: 'de-ba',
        title: 'Đế Bá',
        author: 'Yếm Bút Tiêu Sinh',
        category: 'Huyền Huyễn • Vô Địch Lưu',
        description: 'Ngàn vạn năm trước, Lý Thất Dạ vì đi tìm một con dê lạc mà lọt vào Tiên Ma Động, bị tước đoạt thể xác, hồn phách bị phong ấn vào thân xác một con quạ đen Âm Nha bất tử bay lượn khắp Cửu Giới.\n\nHắn từng chỉ điểm Dược Thần, bồi dưỡng Minh Nhân Tiên Đế, bồi dưỡng vô số Nữ Đế, Yêu Thần, Ma Hoàng chấn động vạn cổ. Sau triệu năm đằng đẵng, hắn đoạt lại nhục thân thiếu niên, bước vào Tẩy Nhan Cổ Phái đã suy tàn, mở ra con đường vô địch hoành tảo chư thiên vạn giới!',
        coverUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
        chaptersCount: pack.deBaChapters?.length || 100,
        createdAt: Date.now() - 1000,
        updatedAt: Date.now() - 1000,
      }
    ];

    for (const story of seedStories) {
      await db.collection('stories').updateOne(
        { id: story.id },
        { $set: story },
        { upsert: true }
      );
    }

    // Insert chapters in bulk
    const allChapters = [
      ...(pack.bachTheChapters || []),
      ...(pack.moiNgayChapters || []),
      ...(pack.deBaChapters || [])
    ];

    if (allChapters.length > 0) {
      const operations = allChapters.map((ch) => ({
        updateOne: {
          filter: { id: ch.id },
          update: { $set: ch },
          upsert: true,
        },
      }));
      await db.collection('chapters').bulkWrite(operations);
      console.log(`[MongoDB] Seeded ${allChapters.length} chapters to MongoDB Cloud successfully!`);
    }
  } catch (err) {
    console.error('[MongoDB] Error seeding:', err.message);
  }
}

// Data access operations
export async function getStoriesFromMongo() {
  if (!db) return [];
  const stories = await db.collection('stories').find({}).sort({ updatedAt: -1 }).toArray();
  for (const s of stories) {
    const actualCount = await db.collection('chapters').countDocuments({ storyId: s.id });
    if (actualCount > 0) {
      s.chaptersCount = Math.max(actualCount, s.chaptersCount || 0);
    }
  }
  return stories;
}

export async function getStoryByIdFromMongo(id) {
  if (!db) return null;
  return await db.collection('stories').findOne({ id });
}

export async function saveStoryToMongo(story) {
  if (!db) return null;
  const { _id, ...cleanStory } = story;
  await db.collection('stories').updateOne(
    { id: cleanStory.id },
    { $set: { ...cleanStory, updatedAt: Date.now() } },
    { upsert: true }
  );
  return story;
}

export async function deleteStoryFromMongo(storyId) {
  if (!db) return false;
  await db.collection('stories').deleteOne({ id: storyId });
  await db.collection('chapters').deleteMany({ storyId });
  await db.collection('readingProgress').deleteOne({ storyId });
  return true;
}

export async function getChaptersForStoryFromMongo(storyId) {
  if (!db) return [];
  return await db.collection('chapters')
    .find({ storyId })
    .project({ id: 1, storyId: 1, chapterIndex: 1, title: 1, hasAudioFile: 1 })
    .sort({ chapterIndex: 1 })
    .toArray();
}

export async function getChapterByIdFromMongo(id) {
  if (!db) return null;
  return await db.collection('chapters').findOne({ id });
}

export async function getChapterByIndexFromMongo(storyId, chapterIndex) {
  if (!db) return null;
  return await db.collection('chapters').findOne({ storyId, chapterIndex });
}

export async function getSourceChapterFromMongo(storyId, chapterIndex) {
  if (!db || !storySources[storyId]) return null;
  return db.collection('chapterSourceCache').findOne({ storyId, chapterIndex, sourceVersion: storySources[storyId].sourceVersion });
}

export async function cacheSourceChapterInMongo(chapter) {
  if (!db) return;
  const { _id, ...data } = chapter;
  await db.collection('chapterSourceCache').replaceOne(
    { storyId: data.storyId, chapterIndex: data.chapterIndex, sourceVersion: data.sourceVersion },
    data, { upsert: true }
  );
}

// Source-versioned cache keeps the previous library recoverable during migration.
// Only validated content from the fixed WikiCV catalog is written here.
export async function getWikiChapterFromMongo(storyId, chapterIndex) {
  if (!db) return null;
  return db.collection('wikiChapterCache').findOne({ storyId, chapterIndex, sourceVersion: WIKI_SOURCE_VERSION });
}

export async function cacheWikiChapterInMongo(chapter) {
  if (!db) return;
  const { _id, ...data } = chapter;
  await db.collection('wikiChapterCache').updateOne(
    { storyId: data.storyId, chapterIndex: data.chapterIndex, sourceVersion: data.sourceVersion },
    { $set: data }, { upsert: true }
  );
}

export async function saveChapterToMongo(chapter) {
  if (!db) return null;
  const { _id, ...cleanChapter } = chapter;
  await db.collection('chapters').updateOne(
    { id: cleanChapter.id },
    { $set: cleanChapter },
    { upsert: true }
  );

  // Update story chaptersCount if higher
  await db.collection('stories').updateOne(
    { id: cleanChapter.storyId, chaptersCount: { $lt: cleanChapter.chapterIndex } },
    { $set: { chaptersCount: cleanChapter.chapterIndex, updatedAt: Date.now() } }
  );
  return chapter;
}

export async function saveChaptersBatchToMongo(chapters) {
  if (!db || !Array.isArray(chapters) || chapters.length === 0) return 0;
  const operations = chapters.map((ch) => {
    const { _id, ...cleanCh } = ch;
    return {
      updateOne: {
        filter: { id: cleanCh.id },
        update: { $set: cleanCh },
        upsert: true,
      },
    };
  });
  const res = await db.collection('chapters').bulkWrite(operations);
  const storyId = chapters[0]?.storyId;
  if (storyId) {
    const maxIndex = Math.max(...chapters.map((c) => c.chapterIndex || 0));
    await db.collection('stories').updateOne(
      { id: storyId, chaptersCount: { $lt: maxIndex } },
      { $set: { chaptersCount: maxIndex, updatedAt: Date.now() } }
    );
  }
  return (res.upsertedCount || 0) + (res.modifiedCount || 0);
}


export async function getMongoStatus() {
  if (!isConnected || !db) {
    return {
      connected: false,
      uriConfigured: !!currentUri,
      databaseName: null,
      storiesCount: 0,
      chaptersCount: 0,
    };
  }

  const [storiesCount, chaptersCount] = await Promise.all([
    db.collection('stories').countDocuments(),
    db.collection('chapters').countDocuments(),
  ]);

  return {
    connected: true,
    uriConfigured: true,
    databaseName: db.databaseName,
    storiesCount,
    chaptersCount,
  };
}
