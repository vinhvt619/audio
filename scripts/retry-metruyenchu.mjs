import fs from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { getSourceChapters } from '../src/data/storySources.js';
import { fetchMeTruyenChapter } from '../server/meTruyenSource.js';

process.env.VERCEL = '1';
const { initMongo, cacheSourceChapterInMongo } = await import('../server/mongoService.js');
const path = 'artifacts/metruyenchu-probe/import-report.json';
const report = JSON.parse(await fs.readFile(path, 'utf8'));
if (!report.completedAt || report.blocked) throw Error('Import must finish normally before retrying failed chapters.');
if (!await initMongo()) process.exit(1);
const stillFailed = [];
for (const failed of report.failed) {
  const metadata = getSourceChapters('bach-the-cau-tien').find(ch => ch.chapterIndex === failed.index);
  await delay(2000);
  try {
    const chapter = await fetchMeTruyenChapter(metadata.storyId, metadata.chapterIndex);
    if (!chapter?.content) throw Error('Missing content');
    await cacheSourceChapterInMongo(chapter);
    report.imported++;
    console.log(JSON.stringify({ recovered: failed.index, sourceChapterIndex: metadata.sourceChapterIndex }));
  } catch (error) {
    stillFailed.push({ ...failed, error: error.message });
    console.log(JSON.stringify({ failed: failed.index, error: error.message }));
  }
}
report.failed = stillFailed;
report.recheckedAt = new Date().toISOString();
await fs.writeFile(path, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ imported: report.imported, cached: report.cached, remainingFailures: report.failed }));
process.exit(0);
