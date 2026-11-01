import test from 'node:test';
import assert from 'node:assert/strict';
import { storySources, getSourceChapters, isCurrentChapterSource } from '../src/data/storySources.js';
import { parseMeTruyenChapter } from '../server/meTruyenSource.js';
import { resolvePreferredChapter } from '../server/sourceResolver.js';

const storyId = 'bach-the-cau-tien';
const storage = (values = {}) => ({
  readCache: async () => null, readArchive: async () => null,
  writeCache: async () => {}, ...values,
});

test('source mapping excludes notice 101 and preserves the same story at saved chapter 515', () => {
  const chapters = getSourceChapters(storyId);
  assert.equal(chapters.length, 722);
  assert.equal(chapters[99].sourceChapterIndex, 100);
  assert.equal(chapters[100].sourceChapterIndex, 102);
  assert.equal(chapters[514].sourceChapterIndex, 516);
  assert.equal(chapters[514].id, 'bach-the-cau-tien-chap-515');
  assert.equal(chapters[652].source, 'archive');
  assert.equal(chapters[721].source, 'archive');
  assert.equal(storySources['moi-ngay-mot-que'], undefined);
  assert.equal(storySources['de-ba'], undefined);
});

test('MeTruyenChu parser preserves paragraphs, decodes entities and excludes heading and navigation', () => {
  const metadata = getSourceChapters(storyId)[0];
  const parsed = parseMeTruyenChapter(`<header>Navigation</header><div class="truyen">Chương 1: Bách Thế Bia<br>${'Đoạn đầu tiên. '.repeat(6)}&amp; &#x1F600;<br>Đoạn tiếp theo.</div><footer>Comments</footer>`, metadata);
  assert.equal(parsed.source, 'metruyenchu');
  assert.ok(parsed.content.includes('& 😀\n\nĐoạn tiếp theo.'));
  assert.ok(!/Chương 1|Navigation|Comments/.test(parsed.content));
  assert.throws(() => parseMeTruyenChapter('<div class="truyen"></div>', metadata), { code: 'SOURCE_EMPTY' });
  assert.throws(() => parseMeTruyenChapter('<p>Access denied</p>', metadata));
});

test('untagged old local chapters cannot mask the new primary source', () => {
  const metadata = getSourceChapters(storyId)[0];
  assert.equal(isCurrentChapterSource({ ...metadata, sourceVersion: undefined }), false);
  assert.equal(isCurrentChapterSource({ ...metadata, sourceUrl: 'https://untrusted.example' }), false);
  assert.equal(isCurrentChapterSource({ ...metadata, content: 'cached primary' }), true);
});

test('resolver chooses new content ahead of the archived chapter and caches its provenance', async () => {
  const primary = { ...getSourceChapters(storyId)[0], content: 'Primary content', sourceCheckedAt: Date.now() };
  let saved;
  const chapter = await resolvePreferredChapter(storyId, 1, storage({
    fetchPrimary: async () => primary,
    readArchive: async () => { throw Error('Archive should not be read'); },
    writeCache: async chapter => { saved = chapter; },
  }));
  assert.equal(chapter.content, primary.content);
  assert.equal(saved.sourceUrl, primary.sourceUrl);
});

test('empty source keeps previous chapter with explicit archive label and retries after its cache expires', async () => {
  const previous = { id: `${storyId}-chap-515`, storyId, chapterIndex: 515, title: 'Saved title', content: 'Saved text' };
  const chapter = await resolvePreferredChapter(storyId, 515, storage({
    fetchPrimary: async () => { throw Object.assign(Error('Empty'), { code: 'SOURCE_EMPTY' }); },
    readArchive: async () => previous,
  }));
  assert.equal(chapter.content, 'Saved text');
  assert.equal(chapter.source, 'archive');
  assert.equal(chapter.sourceUrl, undefined);
  assert.equal(chapter.sourceFallbackReason, 'empty');
  assert.equal(isCurrentChapterSource(chapter), true);
  // Provenance remains valid for offline reading; the server decides when to retry upstream.
  assert.equal(isCurrentChapterSource({ ...chapter, sourceCheckedAt: Date.now() - 61 * 60 * 1000 }), true);
  const refreshed = await resolvePreferredChapter(storyId, 515, storage({
    readCache: async () => ({ ...chapter, sourceCheckedAt: Date.now() - 61 * 60 * 1000 }),
    fetchPrimary: async () => ({ ...getSourceChapters(storyId)[514], content: 'New source restored' }),
  }));
  assert.equal(refreshed.source, 'metruyenchu');
});

test('unlisted/known empty source chapters use archive without an upstream request', async () => {
  for (const index of [653, 654, 722]) {
    const chapter = await resolvePreferredChapter(storyId, index, storage({
      fetchPrimary: async () => { throw Error('No request should be sent'); },
      readArchive: async () => ({ id: `${storyId}-chap-${index}`, storyId, chapterIndex: index, title: 'Saved', content: 'Saved text' }),
    }));
    assert.equal(chapter.source, 'archive');
    assert.equal(chapter.sourceFallbackReason, index === 653 ? 'empty' : 'not-listed');
  }
});

test('valid source cache is read without touching upstream; missing content returns null', async () => {
  const cached = { ...getSourceChapters(storyId)[0], content: 'Cached' };
  assert.equal((await resolvePreferredChapter(storyId, 1, storage({
    readCache: async () => cached, fetchPrimary: async () => { throw Error('Unexpected fetch'); },
  }))).content, 'Cached');
  assert.equal(await resolvePreferredChapter(storyId, 722, storage()), null);
});
