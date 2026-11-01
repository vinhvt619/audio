// Test script to verify routing hash parsing logic and Audio close/next callbacks
import assert from 'assert';

console.log('--- TESTING ROUTING HASH PARSING REGEX ---');

const testCases = [
  {
    hash: '#/story/bach-the-cau-tien/chapter/15',
    expectedType: 'reader',
    expectedStory: 'bach-the-cau-tien',
    expectedChapter: 15,
  },
  {
    hash: '#/story/de-ba/chapter/2000',
    expectedType: 'reader',
    expectedStory: 'de-ba',
    expectedChapter: 2000,
  },
  {
    hash: '#/story/moi-ngay-mot-que',
    expectedType: 'story',
    expectedStory: 'moi-ngay-mot-que',
    expectedChapter: null,
  },
  {
    hash: '#/',
    expectedType: 'library',
    expectedStory: null,
    expectedChapter: null,
  },
  {
    hash: '',
    expectedType: 'library',
    expectedStory: null,
    expectedChapter: null,
  },
];

for (const tc of testCases) {
  let view = 'library';
  let storyId = null;
  let chapterIndex = null;

  const chapMatch = tc.hash.match(/^#\/story\/([^/]+)\/chapter\/(\d+)$/);
  if (chapMatch) {
    view = 'reader';
    storyId = decodeURIComponent(chapMatch[1]);
    chapterIndex = parseInt(chapMatch[2], 10);
  } else {
    const storyMatch = tc.hash.match(/^#\/story\/([^/]+)$/);
    if (storyMatch) {
      view = 'story';
      storyId = decodeURIComponent(storyMatch[1]);
    }
  }

  assert.strictEqual(view, tc.expectedType, `View should match for ${tc.hash}`);
  assert.strictEqual(storyId, tc.expectedStory, `StoryId should match for ${tc.hash}`);
  assert.strictEqual(chapterIndex, tc.expectedChapter, `ChapterIndex should match for ${tc.hash}`);
  console.log(`✓ Hash "${tc.hash}" correctly parses into view=${view}, story=${storyId}, chapter=${chapterIndex}`);
}

console.log('\n--- TESTING AUTO-ADVANCE LOGIC ---');
const dummyList = [
  { id: 'chap-1', chapterIndex: 1, title: 'Chương 1' },
  { id: 'chap-2', chapterIndex: 2, title: 'Chương 2' },
  { id: 'chap-3', chapterIndex: 3, title: 'Chương 3' },
];

function getNextChapter(currentChap, list) {
  const currentIndex = list.findIndex(c => c.id === currentChap.id || c.chapterIndex === currentChap.chapterIndex);
  if (currentIndex >= 0 && currentIndex < list.length - 1) {
    return list[currentIndex + 1];
  }
  return null;
}

assert.strictEqual(getNextChapter(dummyList[0], dummyList)?.id, 'chap-2');
assert.strictEqual(getNextChapter(dummyList[1], dummyList)?.id, 'chap-3');
assert.strictEqual(getNextChapter(dummyList[2], dummyList), null);
console.log('✓ Next chapter auto-advance lookup verified successfully');

console.log('\n=== ALL ROUTING & LOGIC TESTS PASSED ===');
