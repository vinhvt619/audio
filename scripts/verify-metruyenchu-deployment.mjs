import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { getSourceChapters } from '../src/data/storySources.js';
import { parseMeTruyenChapter } from '../server/meTruyenSource.js';

const root = 'https://audioread-beta.vercel.app';
const storyId = 'bach-the-cau-tien';
const response = await fetch(`${root}/api/story-chapters?storyId=${storyId}`);
assert.equal(response.status, 200);
assert.equal((await response.json()).length, 722);
const reports = [];
for (const index of [1, 2, 204, 501, 515, 613, 652, 653, 654, 722]) {
  const response = await fetch(`${root}/api/chapter?story=${storyId}&chapter=${index}`, { signal: AbortSignal.timeout(60000) });
  const chapter = await response.json();
  assert.equal(response.status, 200, JSON.stringify(chapter));
  assert.ok(chapter.content.length > 50);
  if ([1, 2, 204, 501, 515, 613, 652].includes(index)) {
    assert.equal(chapter.source, 'metruyenchu', JSON.stringify({ index, source: chapter.source, reason: chapter.sourceFallbackReason }));
    assert.equal(chapter.sourceUrl, getSourceChapters(storyId)[index - 1].sourceUrl);
  } else {
    assert.equal(chapter.source, 'archive');
    assert.equal(chapter.sourceUrl, undefined);
  }
  if (index === 1) {
    const html = await fs.readFile('artifacts/metruyenchu-probe/chapter-1.html', 'utf8');
    assert.equal(chapter.content, parseMeTruyenChapter(html, getSourceChapters(storyId)[0]).content);
  }
  const result = { index, status: response.status, source: chapter.source, sourceChapterIndex: chapter.sourceChapterIndex, characters: chapter.content.length };
  reports.push(result); console.log(JSON.stringify(result));
}
for (const otherId of ['de-ba', 'moi-ngay-mot-que']) {
  const response = await fetch(`${root}/api/chapter?story=${otherId}&chapter=1`);
  assert.equal(response.status, 200);
  assert.ok((await response.json()).content);
}
await fs.writeFile('artifacts/metruyenchu-probe/deployment-report.json', JSON.stringify(reports, null, 2));
console.log('Both unchanged stories remain readable.');
