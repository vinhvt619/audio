import fs from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { wikiCatalog, getWikiChapters, WIKI_SOURCE_VERSION, isCurrentChapterSource } from '../src/data/wikiCatalog.js';
import { parseWikiChapter } from '../server/wikiSource.js';

// This is an owner-run import, never an anonymous API mutation.
// Use the existing environment connection without displaying credentials.
process.env.VERCEL = '1';
const { initMongo, getStoriesFromMongo, saveStoryToMongo, getWikiChapterFromMongo, cacheWikiChapterInMongo } = await import('../server/mongoService.js');
if (!await initMongo()) process.exit(1);
await fs.mkdir('backups', { recursive: true });
await fs.mkdir('artifacts/wiki-source', { recursive: true });
const stories = (await getStoriesFromMongo()).filter(story => wikiCatalog[story.id]);
await fs.writeFile(`backups/wiki-stories-before-${Date.now()}.json`, JSON.stringify(stories, null, 2));
for (const story of stories) {
  const book = wikiCatalog[story.id];
  await saveStoryToMongo({ ...story, sourceUrl: book.sourceUrl, chaptersCount: book.chapters.length, description: book.description });
}
const priority = new Set(['bach-the-cau-tien:1', 'bach-the-cau-tien:515', 'bach-the-cau-tien:516', 'moi-ngay-mot-que:1', 'moi-ngay-mot-que:509']);
const chapters = Object.keys(wikiCatalog).flatMap(getWikiChapters)
  .sort((a, b) => Number(priority.has(`${b.storyId}:${b.chapterIndex}`)) - Number(priority.has(`${a.storyId}:${a.chapterIndex}`)));
const report = { sourceVersion: WIKI_SOURCE_VERSION, total: chapters.length, done: 0, imported: 0, cached: 0, errors: [], startedAt: new Date().toISOString() };
const reportPath = 'artifacts/wiki-source/import-report.json';
for (const metadata of chapters) {
  const label = `${metadata.storyId}:${metadata.chapterIndex}`;
  const cached = await getWikiChapterFromMongo(metadata.storyId, metadata.chapterIndex);
  if (cached?.content && isCurrentChapterSource(cached)) {
    report.cached++;
  } else {
    let result;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        let html;
        try {
          html = await fs.readFile(`artifacts/wiki-source/${metadata.storyId}-${metadata.chapterIndex}.html`, 'utf8');
        } catch {
          const response = await fetch(metadata.sourceUrl, {
            signal: AbortSignal.timeout(25000), redirect: 'error',
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AudioRead/1.0)' },
          });
          if (response.status === 403) {
            report.blocked = { chapter: label, reason: 'WikiCV refused access. Import stopped; no further requests are sent.' };
            await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
            const error = new Error('WikiCV từ chối truy cập. Đã dừng nhập dữ liệu.');
            error.code = 'SOURCE_ACCESS_DENIED';
            throw error;
          }
          if (response.status === 429) {
            if (attempt === 2) throw Error(`WikiCV HTTP ${response.status}`);
            await delay(30000 * (attempt + 1));
            continue;
          }
          if (!response.ok) throw Error(`WikiCV HTTP ${response.status}`);
          html = await response.text();
        }
        result = parseWikiChapter(html, metadata);
        break;
      } catch (error) {
        if (error.code === 'SOURCE_ACCESS_DENIED') {
          console.error(error.message);
          process.exit(2);
        }
        if (/mã hóa|thiếu/.test(error.message) || attempt === 2) {
          report.errors.push({ chapter: label, error: error.message });
          console.log(JSON.stringify({ chapter: label, sourceError: error.message }));
          break;
        }
        await delay(2000 * (attempt + 1));
      }
    }
    if (result) {
      await cacheWikiChapterInMongo(result);
      report.imported++;
    }
    await delay(250);
  }
  report.done++;
  report.lastChapter = label;
  report.updatedAt = new Date().toISOString();
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  if (report.done <= 5 || report.done % 50 === 0) console.log(JSON.stringify({ done: report.done, total: report.total, imported: report.imported, cached: report.cached, errors: report.errors.length, last: label }));
}
report.completedAt = new Date().toISOString();
await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ completed: true, imported: report.imported, cached: report.cached, errors: report.errors }));
process.exit(0);
