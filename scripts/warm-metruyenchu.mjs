import fs from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { getSourceChapters } from '../src/data/storySources.js';
import { parseMeTruyenChapter, fetchMeTruyenChapter } from '../server/meTruyenSource.js';
import { resolvePreferredChapter } from '../server/sourceResolver.js';

process.env.VERCEL = '1';
const { initMongo, getSourceChapterFromMongo, cacheSourceChapterInMongo, getChapterByIndexFromMongo } = await import('../server/mongoService.js');
if (!await initMongo()) process.exit(1);
const reports = [];
for (const index of [1, 100, 101, 514, 515, 652, 653, 654, 722]) {
  const metadata = getSourceChapters('bach-the-cau-tien').find(ch => ch.chapterIndex === index);
  const chapter = await resolvePreferredChapter(metadata.storyId, index, {
    readCache: getSourceChapterFromMongo, readArchive: getChapterByIndexFromMongo, writeCache: cacheSourceChapterInMongo,
    fetchPrimary: async (id, number) => {
      try {
        const html = await fs.readFile(`artifacts/metruyenchu-probe/chapter-${metadata.sourceChapterIndex}.html`, 'utf8');
        return parseMeTruyenChapter(html, metadata);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        await delay(2000);
        return fetchMeTruyenChapter(id, number);
      }
    },
  });
  if (!chapter?.content) throw Error(`Missing readable chapter ${index}`);
  const item = { index, source: chapter.source, sourceChapterIndex: chapter.sourceChapterIndex, characters: chapter.content.length, reason: chapter.sourceFallbackReason };
  reports.push(item); console.log(JSON.stringify(item));
}
await fs.writeFile('artifacts/metruyenchu-probe/warm-report.json', JSON.stringify(reports, null, 2));
process.exit(0);
