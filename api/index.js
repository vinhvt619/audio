import {
  initMongo,
  isMongoReady,
  getMongoStatus,
  getStoriesFromMongo,
  getChaptersForStoryFromMongo,
  getChapterByIndexFromMongo,
  getSourceChapterFromMongo,
  cacheSourceChapterInMongo,
} from '../server/mongoService.js';
import { storySources, getSourceChapters } from '../src/data/storySources.js';
import { resolvePreferredChapter } from '../server/sourceResolver.js';
import { fetchLiveChapter } from '../server/chapterSource.js';
import { synthesizeSpeech, VIETNAMESE_VOICES } from '../server/ttsEdgeService.js';

let connection;
async function ensureMongo() {
  if (isMongoReady()) return true;
  if (!connection) {
    connection = initMongo().finally(() => { connection = undefined; });
  }
  return connection;
}

function json(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  const url = new URL(req.url, 'https://audioread.local');
  const route = url.searchParams.get('route');
  const pathname = route !== null ? `/api/${route.replace(/^\/+|\/+$/g, '')}` : url.pathname;

  // There is no account system in this app. Never expose mutations of the
  // owner's shared database or connection configuration to anonymous visitors.
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return json(res, 403, { error: 'Thư viện Cloud chỉ đọc trên bản online. Thay đổi cá nhân được lưu trên thiết bị.' });
  }

  try {
    if (pathname === '/api/tts/voices') {
      return json(res, 200, VIETNAMESE_VOICES);
    }

    if (pathname === '/api/tts') {
      const text = url.searchParams.get('text') || '';
      if (!text.trim() || text.length > 1200) {
        return json(res, 400, { error: 'Văn bản phải có từ 1 đến 1200 ký tự.' });
      }
      const voice = url.searchParams.get('voice') || 'edge:vi-VN-HoaiMyNeural';
      if (!VIETNAMESE_VOICES.some(v => v.id === voice)) {
        return json(res, 400, { error: 'Giọng đọc không hợp lệ.' });
      }
      const buffer = await synthesizeSpeech(text, voice);
      if (!buffer.length || buffer.length > 4 * 1024 * 1024) {
        return json(res, 502, { error: 'Không thể tạo âm thanh cho đoạn văn này.' });
      }
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', buffer.length);
      return res.end(buffer);
    }

    if (pathname === '/api/db-status') {
      await ensureMongo();
      return json(res, 200, { ...await getMongoStatus(), readOnly: true, hosted: true });
    }

    if (pathname === '/api/stories') {
      if (!await ensureMongo()) return json(res, 503, { error: 'Cloud tạm thời chưa kết nối.' });
      const stories = await getStoriesFromMongo();
      // Reading progress belongs to the visitor's browser, not the shared library.
      return json(res, 200, stories.map(source => {
        const story = { ...source };
        const sourceBook = storySources[story.id];
        if (sourceBook) {
          story.chaptersCount = sourceBook.chapters.length;
          story.sourceUrl = sourceBook.sourceUrl;
        }
        for (const key of ['_id', 'lastReadChapterId', 'lastReadChapterIndex',
          'lastReadChapterTitle', 'lastReadProgress', 'lastReadTime']) delete story[key];
        return story;
      }));
    }

    if (pathname === '/api/story-chapters') {
      const storyId = url.searchParams.get('storyId') || '';
      if (!storyId || storyId.length > 200) return json(res, 400, { error: 'Thiếu mã truyện.' });
      if (storySources[storyId]) return json(res, 200, getSourceChapters(storyId));
      if (!await ensureMongo()) return json(res, 503, { error: 'Cloud tạm thời chưa kết nối.' });
      return json(res, 200, await getChaptersForStoryFromMongo(storyId));
    }

    if (pathname === '/api/chapter') {
      const story = url.searchParams.get('story') || '';
      const chapter = Number(url.searchParams.get('chapter'));
      if (!story || story.length > 200 || !Number.isSafeInteger(chapter) || chapter < 1 || chapter > 100000) {
        return json(res, 400, { error: 'Mã truyện hoặc số chương không hợp lệ.' });
      }
      if (storySources[story]) {
        if (!storySources[story].chapters.some(ch => ch.chapterIndex === chapter)) {
          return json(res, 404, { error: 'Chương này chưa có trong mục lục truyện.' });
        }
        await ensureMongo();
        const data = await resolvePreferredChapter(story, chapter, {
          readCache: getSourceChapterFromMongo, writeCache: cacheSourceChapterInMongo,
          readArchive: getChapterByIndexFromMongo,
        });
        if (!data) return json(res, 404, { error: 'Không tải được nội dung chương. Vui lòng thử lại sau.' });
        return json(res, 200, data);
      }
      if (await ensureMongo()) {
        const cached = await getChapterByIndexFromMongo(story, chapter);
        if (cached?.content) {
          const { _id, ...data } = cached;
          return json(res, 200, data);
        }
      }
      const data = await fetchLiveChapter(story, chapter);
      if (!data) return json(res, 404, { error: 'Không tìm thấy chương.' });
      return json(res, 200, data);
    }

    return json(res, 404, { error: 'API không tồn tại.' });
  } catch {
    // Do not expose driver errors or connection strings in public responses.
    return json(res, 502, { error: 'Dịch vụ tạm thời không khả dụng. Vui lòng thử lại.' });
  }
}
