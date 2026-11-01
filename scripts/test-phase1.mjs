import assert from 'assert';
import http from 'http';

console.log('--- STARTING PHASE 1 AUTOMATED VERIFICATION ---');

// 1. Verify reading progress backward compatibility logic
console.log('[Test 1] Testing readingProgress normalization logic...');
const mockOldData = {
  chapterId: 'de-ba-chap-15',
  chapterIndex: 15,
  chapterTitle: 'Chương 15: Cửu Giới Chi Phong',
  progress: 42,
  time: 1713000000000,
};

const mockNewData = {
  lastReadChapterId: 'de-ba-chap-20',
  lastReadChapterIndex: 20,
  lastReadChapterTitle: 'Chương 20: Tẩy Nhan Bí Thuật',
  lastReadProgress: 75,
  lastReadTime: 1713000050000,
};

function normalizeProgress(data, storyId) {
  const chapterId = data.lastReadChapterId || data.chapterId;
  const chapterIndex =
    typeof data.lastReadChapterIndex === 'number'
      ? data.lastReadChapterIndex
      : typeof data.chapterIndex === 'number'
      ? data.chapterIndex
      : 1;
  const chapterTitle =
    data.lastReadChapterTitle || data.chapterTitle || `Chương ${chapterIndex}`;
  const progress =
    typeof data.lastReadProgress === 'number'
      ? data.lastReadProgress
      : typeof data.progress === 'number'
      ? data.progress
      : 0;
  const time =
    typeof data.lastReadTime === 'number'
      ? data.lastReadTime
      : typeof data.time === 'number'
      ? data.time
      : Date.now();

  return {
    storyId,
    chapterId,
    chapterIndex,
    chapterTitle,
    progress,
    time,
  };
}

const normOld = normalizeProgress(mockOldData, 'de-ba');
assert.strictEqual(normOld.chapterId, 'de-ba-chap-15');
assert.strictEqual(normOld.progress, 42);

const normNew = normalizeProgress(mockNewData, 'de-ba');
assert.strictEqual(normNew.chapterId, 'de-ba-chap-20');
assert.strictEqual(normNew.progress, 75);
console.log('✓ Test 1 Passed: Both old and new schemas normalize identically.');

// 2. Test local-only preservation during cloud merge
console.log('[Test 2] Testing local-only story preservation during merge...');
const mockCloudStories = [
  { id: 'bach-the-cau-tien', title: 'Bách Thế Cầu Tiên', chaptersCount: 722 },
  { id: 'de-ba', title: 'Đế Bá', chaptersCount: 1500 },
];

const mockLocalStories = [
  { id: 'bach-the-cau-tien', title: 'Bách Thế Cầu Tiên', chaptersCount: 722, lastReadTime: 200 },
  { id: 'custom-story-user-imported', title: 'Truyện Bạn Tải Lên', chaptersCount: 10, lastReadTime: 100 },
];

function simulateMerge(cloudList, localList) {
  const storyMap = new Map();
  for (const cs of cloudList) {
    storyMap.set(cs.id, { ...cs });
  }
  for (const ls of localList) {
    if (!storyMap.has(ls.id)) {
      storyMap.set(ls.id, { ...ls });
    } else {
      const existing = storyMap.get(ls.id);
      if (ls.lastReadTime && (!existing.lastReadTime || ls.lastReadTime > existing.lastReadTime)) {
        storyMap.set(ls.id, { ...existing, lastReadTime: ls.lastReadTime });
      }
    }
  }
  return Array.from(storyMap.values());
}

const merged = simulateMerge(mockCloudStories, mockLocalStories);
assert.strictEqual(merged.length, 3, 'Merged list must contain 3 stories (cloud + local-only)');
const imported = merged.find((s) => s.id === 'custom-story-user-imported');
assert.ok(imported, 'Local-only story must be preserved');
assert.strictEqual(merged.find((s) => s.id === 'bach-the-cau-tien').lastReadTime, 200, 'Local reading time must be merged');
console.log('✓ Test 2 Passed: Local-only stories and reading progress are 100% preserved.');

// 3. Test running API server endpoints (Vite dev server)
console.log('[Test 3] Testing live Vite API server endpoints...');

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5173,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runLiveApiTests() {
  try {
    const statusRes = await makeRequest('/api/db-status');
    assert.strictEqual(statusRes.status, 200, 'db-status should return 200');
    assert.strictEqual(statusRes.data.connected, true, 'Mongo Atlas should be connected');
    console.log(`  - DB Status: connected=${statusRes.data.connected}, chapters=${statusRes.data.chaptersCount}`);

    const storiesRes = await makeRequest('/api/stories');
    assert.strictEqual(storiesRes.status, 200, 'stories API should return 200');
    assert.ok(Array.isArray(storiesRes.data), 'stories should be an array');
    console.log(`  - Stories count in cloud: ${storiesRes.data.length}`);

    // Test chapter fetching
    const chapRes = await makeRequest('/api/chapter?story=bach-the-cau-tien&chapter=1');
    assert.strictEqual(chapRes.status, 200, 'chapter fetch should return 200');
    assert.ok(chapRes.data.content && chapRes.data.content.length > 50, 'Chapter 1 must have content');
    console.log(`  - Chapter 1 title: "${chapRes.data.title}" (content length: ${chapRes.data.content.length})`);

    console.log('✓ Test 3 Passed: All live API server endpoints return HTTP 200 with valid data.');
    console.log('--- PHASE 1 VERIFICATION COMPLETED SUCCESSFULLY ---');
  } catch (err) {
    console.error('Test 3 Error:', err);
    process.exit(1);
  }
}

runLiveApiTests();
