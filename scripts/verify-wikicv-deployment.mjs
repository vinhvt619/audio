import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { getWikiChapters } from '../src/data/wikiCatalog.js';
import { parseWikiChapter } from '../server/wikiSource.js';

const base = 'https://audioread-beta.vercel.app';
const storiesResponse = await fetch(`${base}/api/stories`);
assert.equal(storiesResponse.status, 200);
const stories = await storiesResponse.json();
for (const [storyId, count] of [['bach-the-cau-tien', 723], ['moi-ngay-mot-que', 509]]) {
  const story = stories.find(story => story.id === storyId);
  assert.equal(story.chaptersCount, count);
  assert.equal(new URL(story.sourceUrl).hostname, 'wikicv.org');
  const response = await fetch(`${base}/api/story-chapters?storyId=${storyId}`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).length, count);
}
for (const [storyId, index] of [['bach-the-cau-tien', 1], ['bach-the-cau-tien', 515], ['moi-ngay-mot-que', 1]]) {
  const metadata = getWikiChapters(storyId).find(ch => ch.chapterIndex === index);
  const html = await fs.readFile(`artifacts/wiki-source/${storyId}-${index}.html`, 'utf8');
  const expected = parseWikiChapter(html, metadata);
  const response = await fetch(`${base}/api/chapter?story=${storyId}&chapter=${index}`, { signal: AbortSignal.timeout(60000) });
  const chapter = await response.json();
  assert.equal(response.status, 200, JSON.stringify(chapter));
  assert.equal(chapter.sourceUrl, expected.sourceUrl);
  assert.equal(chapter.content, expected.content);
  console.log(JSON.stringify({ storyId, index, exactMatchWithWikiCV: true, characters: chapter.content.length }));
}
assert.equal(stories.find(story => story.id === 'de-ba').sourceUrl, undefined);
console.log('Both WikiCV catalogs and sampled content match; De Ba source unchanged.');
