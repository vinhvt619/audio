import fs from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { getSourceChapters } from '../src/data/storySources.js';
import { parseMeTruyenChapter } from '../server/meTruyenSource.js';

process.env.VERCEL = '1';
const { initMongo, getSourceChapterFromMongo, cacheSourceChapterInMongo } = await import('../server/mongoService.js');
if (!await initMongo()) process.exit(1);
const chapters = getSourceChapters('bach-the-cau-tien').filter(ch => ch.sourceUrl);
const report = { total: chapters.length, done: 0, imported: 0, cached: 0, empty: [], failed: [], startedAt: new Date().toISOString() };
const reportPath = 'artifacts/metruyenchu-probe/import-report.json';
for (const metadata of chapters) {
  const cached = await getSourceChapterFromMongo(metadata.storyId, metadata.chapterIndex);
  if (cached?.source === 'metruyenchu' && cached.content) report.cached++;
  else {
    await delay(1000);
    try {
      const response = await fetch(metadata.sourceUrl, { signal: AbortSignal.timeout(20000), redirect: 'error' });
      if (response.status === 403 || response.status === 429) {
        report.blocked = { index: metadata.chapterIndex, status: response.status };
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        console.error(JSON.stringify({ stopped: true, blocked: report.blocked }));
        process.exit(2);
      }
      if (!response.ok) throw Error(`HTTP ${response.status}`);
      const chapter = parseMeTruyenChapter(await response.text(), metadata);
      await cacheSourceChapterInMongo(chapter);
      report.imported++;
    } catch (error) {
      const item = { index: metadata.chapterIndex, sourceChapterIndex: metadata.sourceChapterIndex, error: error.message };
      if (error.code === 'SOURCE_EMPTY') report.empty.push(item);
      else report.failed.push(item);
      console.log(JSON.stringify(item));
    }
  }
  report.done++;
  report.lastChapter = metadata.chapterIndex;
  report.updatedAt = new Date().toISOString();
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  if (report.done % 25 === 0) console.log(JSON.stringify({ done: report.done, total: report.total, imported: report.imported, cached: report.cached, empty: report.empty.length, failed: report.failed.length }));
}
report.completedAt = new Date().toISOString();
await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ complete: true, ...report }));
process.exit(0);
