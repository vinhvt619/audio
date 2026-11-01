import test from 'node:test';
import assert from 'node:assert/strict';
import { splitReadingParagraphs } from '../src/services/readingText.ts';

test('preserves intentional short paragraphs with all common line endings', () => {
  assert.deepEqual(splitReadingParagraphs(' Đoạn một.\r\n\r\nĐoạn hai.\rĐoạn ba.\nĐoạn bốn. '),
    ['Đoạn một.', 'Đoạn hai.', 'Đoạn ba.', 'Đoạn bốn.']);
});

test('a flattened chapter becomes readable blocks without losing text', () => {
  const text = '“Đây là một câu chuyện tiếng Việt.” Câu tiếp theo vẫn còn nguyên dấu! '.repeat(180).trim();
  const paragraphs = splitReadingParagraphs(text);
  assert.ok(paragraphs.length > 10);
  assert.ok(paragraphs.every(p => p.length <= 600));
  assert.equal(paragraphs.join(' '), text);
});

test('a very long sentence splits only at word boundaries', () => {
  const text = 'trường sinh '.repeat(200).trim();
  const paragraphs = splitReadingParagraphs(text);
  assert.ok(paragraphs.every(p => p.length <= 600));
  assert.equal(paragraphs.join(' '), text);
});

test('empty content does not create a fake TTS paragraph', () => {
  assert.deepEqual(splitReadingParagraphs(' \r\n\n '), []);
});

test('buildAudioBlocks groups short consecutive paragraphs into cohesive speaking blocks', async () => {
  const { buildAudioBlocks } = await import('../src/services/ttsService.ts');
  const paragraphs = [
    'Xảo sĩ quan.',
    'Viên lãnh.',
    'Tay áo bào.',
    'Không mang theo nửa điểm hồ tra tướng mạo, thấm ra một tia âm nhu chi bạch.',
    'Đồng thau kính trước, Lý Thanh xem kỹ này thân giả dạng, thấy thế nào đều là một cái thái giám.',
  ];
  const blocks = buildAudioBlocks(paragraphs, 0, 'edge:vi-VN-HoaiMyNeural');
  assert.equal(blocks.length, 1);
  assert.ok(blocks[0].text.length < 1000);
  assert.equal(blocks[0].spans.length, 5);
  assert.equal(blocks[0].startParagraphIndex, 0);
  assert.equal(blocks[0].endParagraphIndex, 4);
  assert.ok(blocks[0].spans[0].ratioStart === 0);
  assert.ok(blocks[0].spans[4].ratioEnd <= 1.05);
});

