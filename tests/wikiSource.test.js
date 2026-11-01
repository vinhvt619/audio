import test from 'node:test';
import assert from 'node:assert/strict';
import { wikiCatalog, getWikiChapters, isCurrentChapterSource } from '../src/data/wikiCatalog.js';
import { parseWikiChapter, fetchWikiChapter } from '../server/wikiSource.js';
import handler from '../api/index.js';

test('WikiCV catalog preserves numbered chapter IDs and excludes notices without shifting progress', () => {
  for (const [storyId, count] of [['bach-the-cau-tien', 723], ['moi-ngay-mot-que', 509]]) {
    const chapters = getWikiChapters(storyId);
    assert.equal(chapters.length, count);
    assert.deepEqual(chapters.map(ch => ch.chapterIndex), Array.from({ length: count }, (_, i) => i + 1));
    assert.ok(chapters.every(ch => isCurrentChapterSource(ch) && new URL(ch.sourceUrl).hostname === 'wikicv.org'));
  }
  assert.equal(getWikiChapters('moi-ngay-mot-que')[0].id, 'moi-ngay-chap-1');
  assert.equal(getWikiChapters('bach-the-cau-tien')[514].id, 'bach-the-cau-tien-chap-515');
  assert.equal(wikiCatalog['de-ba'], undefined);
});

test('previous source, outdated versions, and wrong chapter URLs cannot masquerade as WikiCV cache', () => {
  const current = getWikiChapters('bach-the-cau-tien')[0];
  assert.equal(isCurrentChapterSource({ ...current, source: undefined }), false);
  assert.equal(isCurrentChapterSource({ ...current, sourceVersion: 'old' }), false);
  assert.equal(isCurrentChapterSource({ ...current, sourceUrl: 'https://wetruyen.com/example' }), false);
  assert.equal(isCurrentChapterSource({ storyId: 'custom-import' }), true);
});

test('chapter parser keeps paragraphs and entities, drops duplicate heading, and excludes page chrome', () => {
  const metadata = getWikiChapters('bach-the-cau-tien')[0];
  const chapter = parseWikiChapter(`<p>Outside navigation</p><div id="bookContentBody"><p>Chương 1 Bách Thế Bia</p><p>${'Đoạn văn đầu tiên. '.repeat(4)}&amp; &#x1F600;</p><p>Đoạn thứ hai.<br>Xuống dòng.</p></div><p>Comments</p>`, metadata);
  assert.ok(chapter.content.includes('& 😀'));
  assert.ok(chapter.content.includes('\n\nĐoạn thứ hai.\n\nXuống dòng.'));
  assert.ok(!/Chương 1|Outside|Comments/.test(chapter.content));
  assert.ok(isCurrentChapterSource(chapter));
});

test('login pages, empty chapters and corrupted source text fail visibly instead of being cached', () => {
  const metadata = getWikiChapters('moi-ngay-mot-que')[280];
  for (const html of ['<p>Đăng nhập</p>', '<div id="bookContentBody"></div>', `<div id="bookContentBody"><p>${'\uFFFD'.repeat(100)}</p></div>`]) {
    assert.throws(() => parseWikiChapter(html, metadata));
  }
});

test('concurrent chapter reads share one fixed upstream request and preserve the source URL', async () => {
  const originalFetch = globalThis.fetch;
  const metadata = getWikiChapters('bach-the-cau-tien')[1];
  let calls = 0;
  globalThis.fetch = async url => {
    calls++;
    assert.equal(url, metadata.sourceUrl);
    return { ok: true, text: async () => `<div id="bookContentBody"><p>${'Nội dung chương mẫu. '.repeat(6)}</p></div>` };
  };
  try {
    const chapters = await Promise.all([fetchWikiChapter(metadata.storyId, 2), fetchWikiChapter(metadata.storyId, 2)]);
    assert.equal(calls, 1);
    assert.equal(chapters[0].sourceUrl, metadata.sourceUrl);
    assert.equal(await fetchWikiChapter('https://untrusted.example', 1), null);
    assert.equal(await fetchWikiChapter('moi-ngay-mot-que', 510), null);
  } finally { globalThis.fetch = originalFetch; }
});

test('production only activates the selected MeTruyenChu source and rejects chapters outside the preserved catalog', async () => {
  const request = async url => {
    const res = { statusCode: 200, setHeader() {}, end(body) { this.body = body; } };
    await handler({ url, method: 'GET' }, res);
    return res;
  };
  const list = await request('/api/story-chapters?storyId=bach-the-cau-tien');
  assert.equal(list.statusCode, 200);
  assert.equal(JSON.parse(list.body).length, 722);
  assert.equal(JSON.parse(list.body)[0].source, 'metruyenchu');
  assert.equal((await request('/api/chapter?story=bach-the-cau-tien&chapter=723')).statusCode, 404);
});
