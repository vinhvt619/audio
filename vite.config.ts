import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { synthesizeSpeech, VIETNAMESE_VOICES } from './server/ttsEdgeService.js'

function corsPlugin(): Plugin {
  const handler = (req: any, res: any, next: any) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE, PUT');
    res.setHeader('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    next();
  };

  return {
    name: 'cors-plugin',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

function ttsProxyPlugin(): Plugin {
  const handler = async (req: any, res: any, next: any) => {
    if (!req.url || !req.url.startsWith('/api/tts')) {
      return next();
    }

    const urlObj = new URL(req.url, 'http://localhost:5173');

    // 1. List voices endpoint
    if (urlObj.pathname === '/api/tts/voices') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(VIETNAMESE_VOICES));
      return;
    }

    // 2. TTS synthesis endpoint
    if (urlObj.pathname === '/api/tts') {
      const text = urlObj.searchParams.get('text') || '';
      const voice = urlObj.searchParams.get('voice') || 'edge:vi-VN-HoaiMyNeural';

      if (!text) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: 'Missing text parameter' }));
        return;
      }

      try {
        const audioBuffer = await synthesizeSpeech(text, voice);
        res.writeHead(200, {
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBuffer.length,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=86400',
        });
        res.end(audioBuffer);
      } catch (err: any) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    next();
  };

  return {
    name: 'tts-proxy-plugin',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

import { fetchLiveChapter } from './server/chapterSource.js'
import { storySources, getSourceChapters } from './src/data/storySources.js'
import { resolvePreferredChapter } from './server/sourceResolver.js'

// @ts-ignore
import {
  initMongo,
  isMongoReady,
  saveMongoUri,
  getMongoStatus,
  getStoriesFromMongo,
  saveStoryToMongo,
  deleteStoryFromMongo,
  getChaptersForStoryFromMongo,
  getChapterByIndexFromMongo,
  getSourceChapterFromMongo,
  cacheSourceChapterInMongo,
  saveChapterToMongo,
  saveChaptersBatchToMongo,
  seedMongoIfEmpty,
} from './server/mongoService.js'

// Database initialization belongs to the dev server, never to a production build.

function parseJsonBody(req: any): Promise<any> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk: any) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function mongoApiPlugin(): Plugin {
  return {
    name: 'mongo-api-plugin',
    configureServer(server) {
      initMongo().catch(() => {});
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) {
          return next();
        }

        const urlObj = new URL(req.url, 'http://localhost:5173');
        const pathname = urlObj.pathname;

        // 1. DB Status
        if (pathname === '/api/db-status') {
          const status = await getMongoStatus();
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify(status));
          return;
        }

        // 2. Configure MongoDB URI
        if (pathname === '/api/db-config' && req.method === 'POST') {
          const body = await parseJsonBody(req);
          try {
            await saveMongoUri(body.uri);
            const status = await getMongoStatus();
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ ok: true, status }));
          } catch (err: any) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ ok: false, error: err.message }));
          }
          return;
        }

        // 3. Sync seeds to Mongo
        if (pathname === '/api/db-sync-seed' && req.method === 'POST') {
          await seedMongoIfEmpty();
          const status = await getMongoStatus();
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: true, status }));
          return;
        }

        // 4. Stories API
        if (pathname === '/api/stories') {
          if (req.method === 'GET') {
            if (isMongoReady()) {
              const stories = await getStoriesFromMongo();
              res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify(stories));
              return;
            }
            res.statusCode = 503;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'MongoDB not ready' }));
            return;
          }

          if (req.method === 'POST') {
            const body = await parseJsonBody(req);
            if (isMongoReady()) {
              const saved = await saveStoryToMongo(body);
              res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify(saved));
              return;
            }
            res.statusCode = 503;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'MongoDB not ready' }));
            return;
          }

          if (req.method === 'DELETE') {
            const id = urlObj.searchParams.get('id') || '';
            if (isMongoReady()) {
              await deleteStoryFromMongo(id);
              res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ ok: true }));
              return;
            }
            res.statusCode = 503;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'MongoDB not ready' }));
            return;
          }
        }

        // 5. Story chapters list
        if (pathname === '/api/story-chapters') {
          const wikiStoryId = urlObj.searchParams.get('storyId') || '';
          if (storySources[wikiStoryId]) {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(getSourceChapters(wikiStoryId)));
            return;
          }
          const storyId = urlObj.searchParams.get('storyId') || '';
          if (isMongoReady()) {
            const chaps = await getChaptersForStoryFromMongo(storyId);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(chaps));
            return;
          }
          res.statusCode = 503;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: 'MongoDB not ready' }));
          return;
        }

        // 6. Save batch chapters
        if (pathname === '/api/chapters' && req.method === 'POST') {
          const body = await parseJsonBody(req);
          const chapters = Array.isArray(body) ? body : body.chapters || [];
          if (isMongoReady()) {
            const count = await saveChaptersBatchToMongo(chapters);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ ok: true, count }));
            return;
          }
          res.statusCode = 503;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: 'MongoDB not ready' }));
          return;
        }

        // 7. Save single chapter
        if (pathname === '/api/chapter' && req.method === 'POST') {
          const body = await parseJsonBody(req);
          if (isMongoReady()) {
            const saved = await saveChapterToMongo(body);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ ok: true, chapter: saved }));
            return;
          }
          res.statusCode = 503;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: 'MongoDB not ready' }));
          return;
        }

        next();
      });
    },
  };
}

function chapterProxyPlugin(): Plugin {
  return {
    name: 'chapter-proxy-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/chapter')) {
          const urlObj = new URL(req.url, 'http://localhost:5173');
          const story = urlObj.searchParams.get('story') || '';
          const chapter = parseInt(urlObj.searchParams.get('chapter') || '1', 10);

          if (!story || isNaN(chapter)) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: 'Missing story or chapter parameter' }));
            return;
          }

          try {
            if (storySources[story]) {
              const data = await resolvePreferredChapter(story, chapter, {
                readCache: getSourceChapterFromMongo, writeCache: cacheSourceChapterInMongo,
                readArchive: getChapterByIndexFromMongo,
              });
              if (!data) {
                res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: 'Chưa tải được nội dung chương.' }));
                return;
              }
              res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
              res.end(JSON.stringify(data));
              return;
            }
            // First check if chapter already exists in MongoDB Atlas!
            if (isMongoReady()) {
              const fromMongo = await getChapterByIndexFromMongo(story, chapter);
              if (fromMongo && fromMongo.content) {
                res.writeHead(200, {
                  'Content-Type': 'application/json; charset=utf-8',
                  'Cache-Control': 'public, max-age=86400',
                });
                res.end(JSON.stringify(fromMongo));
                return;
              }
            }

            // Otherwise, fetch live from upstream source
            const chapData = await fetchLiveChapter(story, chapter);
            if (!chapData) {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'Chapter not found' }));
              return;
            }

            // Save to MongoDB Atlas if connected
            if (isMongoReady()) {
              await saveChapterToMongo(chapData);
            }

            res.writeHead(200, {
              'Content-Type': 'application/json; charset=utf-8',
              'Cache-Control': 'public, max-age=86400',
            });
            res.end(JSON.stringify(chapData));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), corsPlugin(), ttsProxyPlugin(), mongoApiPlugin(), chapterProxyPlugin()],
})

