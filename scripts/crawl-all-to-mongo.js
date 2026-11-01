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

// Concurrency helper
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

// Fetch Wetruyen chapter (Bach The Cau Tien & De Ba)
async function fetchWetruyen(storySlug, chapNum) {
  const url = `https://wetruyen.com/${storySlug}/chuong-${chapNum}.html`;
  try {
    const { stdout: html } = await execFileAsync('curl.exe', [
      '-sL',
      '--compressed',
      '-m', '12',
      '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      url
    ], { maxBuffer: 10 * 1024 * 1024 });

    if (!html || html.length < 500) return null;

    let title = `Chương ${chapNum}`;
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      const rawTitle = titleMatch[1].replace(/của truyện.*$/i, '').split(' - ')[0].trim();
      if (rawTitle.length > 0 && !rawTitle.toLowerCase().includes('404')) {
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
      id: `${storySlug}-chap-${chapNum}`,
      storyId: storySlug,
      chapterIndex: chapNum,
      title,
      content: cleaned,
      hasAudioFile: false
    };
  } catch (err) {
    return null;
  }
}

// Fetch DichTiengHoa chapter (Moi Ngay Mot Que)
async function fetchDTH(chapNum) {
  const chapId = 3449683 + chapNum;
  const url = `https://dichtienghoa.net/truyen/3374/${chapId}`;
  try {
    const { stdout: html } = await execFileAsync('curl.exe', [
      '-sL',
      '--compressed',
      '-m', '12',
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
  console.log('Connecting to MongoDB Atlas...');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('audio_novel_db');
  console.log('Connected to MongoDB Atlas!');

  const storiesCol = db.collection('stories');
  const chaptersCol = db.collection('chapters');

  // 1. Update Stories info
  console.log('Updating stories metadata in MongoDB...');
  await storiesCol.updateOne(
    { id: 'bach-the-cau-tien' },
    {
      $set: {
        title: 'Bách Thế Cầu Tiên',
        author: 'Hắc Gia Nhưỡng Ti Tửu',
        category: 'Tiên Hiệp • Trường Sinh Lưu',
        description: 'Muôn đời nhập phàm trần, không tranh một thế chi cảnh xuân tươi đẹp, chỉ tranh muôn đời chi sớm chiều. Tại trong hồng trần cầu tiên.\n\nTa gọi Lý Thanh, tam thế thoát phàm, cửu thế nhập đạo, muôn đời thành tiên.\n\nMỗi một kiếp nhân sinh đều trải qua sinh lão bệnh tử, đến đại nạn thọ tận lại phản lão hoàn đồng trở lại thiếu niên. Không tranh đấu ngông cuồng, cẩn trọng cẩu đạo, từng bước trường sinh trong hồng trần cuồn cuộn.',
        coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
        chaptersCount: 722,
        updatedAt: Date.now()
      }
    },
    { upsert: true }
  );

  await storiesCol.updateOne(
    { id: 'de-ba' },
    {
      $set: {
        title: 'Đế Bá',
        author: 'Yếm Bút Tiêu Sinh',
        category: 'Huyền Huyễn • Vô Địch Lưu',
        description: 'Ngàn vạn năm trước, Lý Thất Dạ vì đi tìm một con dê lạc mà lọt vào Tiên Ma Động, bị tước đoạt thể xác, hồn phách bị phong ấn vào thân xác một con quạ đen Âm Nha bất tử bay lượn khắp Cửu Giới.\n\nHắn từng chỉ điểm Dược Thần, bồi dưỡng Minh Nhân Tiên Đế, bồi dưỡng vô số Nữ Đế, Yêu Thần, Ma Hoàng chấn động vạn cổ. Sau triệu năm đằng đẵng, hắn đoạt lại nhục thân thiếu niên, bước vào Tẩy Nhan Cổ Phái đã suy tàn, mở ra con đường vô địch hoành tảo chư thiên vạn giới!',
        coverUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
        chaptersCount: 6976,
        updatedAt: Date.now()
      }
    },
    { upsert: true }
  );

  await storiesCol.updateOne(
    { id: 'moi-ngay-mot-que' },
    {
      $set: {
        title: 'Mỗi Ngày Một Quẻ, Từ Phường Thị Tán Tu Đến Trường Sinh Tiên Tôn',
        author: 'Bắc Cảnh Nam Phong',
        category: 'Tiên Hiệp • Cẩu Đạo • Hệ Thống',
        description: 'Lý Trường An chuyển thế đến tu tiên giới tàn khốc, bắt đầu từ một tán tu tầm thường nơi phường thị, không tông môn, không gia thế, linh căn bậc thấp, cơ duyên trường sinh xa vời vợi.\n\nMay mắn thay, hắn thức tỉnh hệ thống 【Mỗi Ngày Hỏi Quẻ】: Mỗi ngày có thể gieo một quẻ để biết trước cát hung! Nhờ cẩu đạo vững vàng và kết thiện duyên, Lý Trường An từng bước tích lũy tu vi, chứng kiến vô số thiên kiêu chôn vùi theo tuế nguyệt, cuối cùng trở thành Trường Sinh Tiên Tôn.',
        coverUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80',
        chaptersCount: 300,
        updatedAt: Date.now()
      }
    },
    { upsert: true }
  );

  // Helper to save batch of chapters to Mongo
  async function saveChapters(chapters) {
    const valid = chapters.filter(Boolean);
    if (valid.length === 0) return 0;
    const ops = valid.map(ch => ({
      updateOne: {
        filter: { id: ch.id },
        update: { $set: ch },
        upsert: true
      }
    }));
    const res = await chaptersCol.bulkWrite(ops);
    return res.upsertedCount + res.modifiedCount;
  }

  // 2. Fetch all missing chapters of "Mỗi Ngày Một Quẻ" (chaps 1 to 300)
  console.log('\n--- Checking & Fetching "Mỗi Ngày Một Quẻ" (Chương 1 đến 300) ---');
  const existingMoiNgay = new Set(
    (await chaptersCol.find({ storyId: 'moi-ngay-mot-que' }, { projection: { chapterIndex: 1 } }).toArray())
      .map(c => c.chapterIndex)
  );
  console.log(`Already in Mongo: ${existingMoiNgay.size}/300 chapters`);
  const needMoiNgay = Array.from({ length: 300 }, (_, i) => i + 1).filter(idx => !existingMoiNgay.has(idx));
  console.log(`Need to fetch: ${needMoiNgay.length} chapters`);

  if (needMoiNgay.length > 0) {
    let savedTotal = 0;
    // Process in batches of 20
    for (let i = 0; i < needMoiNgay.length; i += 20) {
      const chunk = needMoiNgay.slice(i, i + 20);
      const chaps = await mapConcurrent(chunk, 5, async (idx) => {
        process.stdout.write(`.`);
        return await fetchDTH(idx);
      });
      const saved = await saveChapters(chaps);
      savedTotal += saved;
      console.log(` [Batch ${Math.floor(i / 20) + 1}] Saved ${saved} chapters to Mongo`);
    }
    console.log(`\nFinished Mỗi Ngày Một Quẻ! Total new saved: ${savedTotal}`);
  }

  // 3. Fetch missing chapters of "Bách Thế Cầu Tiên" (Chương 1 đến 722)
  console.log('\n--- Checking & Fetching "Bách Thế Cầu Tiên" (Chương 1 đến 722) ---');
  const existingBachThe = new Set(
    (await chaptersCol.find({ storyId: 'bach-the-cau-tien' }, { projection: { chapterIndex: 1 } }).toArray())
      .map(c => c.chapterIndex)
  );
  console.log(`Already in Mongo: ${existingBachThe.size}/722 chapters`);
  const needBachThe = Array.from({ length: 722 }, (_, i) => i + 1).filter(idx => !existingBachThe.has(idx));
  console.log(`Need to fetch: ${needBachThe.length} chapters`);

  if (needBachThe.length > 0) {
    let savedTotal = 0;
    for (let i = 0; i < needBachThe.length; i += 25) {
      const chunk = needBachThe.slice(i, i + 25);
      const chaps = await mapConcurrent(chunk, 6, async (idx) => {
        process.stdout.write(`.`);
        return await fetchWetruyen('bach-the-cau-tien', idx);
      });
      const saved = await saveChapters(chaps);
      savedTotal += saved;
      console.log(` [Batch ${Math.floor(i / 25) + 1}] Saved ${saved} chapters to Mongo`);
    }
    console.log(`\nFinished Bách Thế Cầu Tiên! Total new saved: ${savedTotal}`);
  }

  // 4. Fetch next batch of "Đế Bá" (Chương 101 đến 500)
  console.log('\n--- Checking & Fetching "Đế Bá" (Chương 1 đến 500) ---');
  const existingDeBa = new Set(
    (await chaptersCol.find({ storyId: 'de-ba' }, { projection: { chapterIndex: 1 } }).toArray())
      .map(c => c.chapterIndex)
  );
  console.log(`Already in Mongo: ${existingDeBa.size} chapters`);
  const targetDeBaCount = 500;
  const needDeBa = Array.from({ length: targetDeBaCount }, (_, i) => i + 1).filter(idx => !existingDeBa.has(idx));
  console.log(`Need to fetch up to chap 500: ${needDeBa.length} chapters`);

  if (needDeBa.length > 0) {
    let savedTotal = 0;
    for (let i = 0; i < needDeBa.length; i += 25) {
      const chunk = needDeBa.slice(i, i + 25);
      const chaps = await mapConcurrent(chunk, 6, async (idx) => {
        process.stdout.write(`.`);
        return await fetchWetruyen('de-ba', idx);
      });
      const saved = await saveChapters(chaps);
      savedTotal += saved;
      console.log(` [Batch ${Math.floor(i / 25) + 1}] Saved ${saved} chapters to Mongo`);
    }
    console.log(`\nFinished Đế Bá batch up to 500! Total new saved: ${savedTotal}`);
  }

  const finalTotal = await chaptersCol.countDocuments();
  console.log(`\n========================================`);
  console.log(`ALL DONE! Total chapters in MongoDB Atlas: ${finalTotal}`);
  console.log(`========================================`);

  await client.close();
}

run().catch(err => {
  console.error('Migration crawler error:', err);
  process.exit(1);
});
