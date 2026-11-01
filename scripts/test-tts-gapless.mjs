// Test script to verify smart chunking and TTS preloading logic
import assert from 'assert';

function hasSpeakableText(text) {
  return /[a-zA-Z0-9\u00C0-\u024F\u1EA0-\u1EF9]/.test(text);
}

function splitParagraphIntoChunks(text, voiceURI) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean || !hasSpeakableText(clean)) return [];

  const isGoogle = voiceURI === 'vi-natural-google';
  const maxLen = isGoogle ? 170 : 1200;

  if (clean.length <= maxLen) return [clean];

  const sentences = clean.split(/(?<=[.!?…;:])\s+/);
  const chunks = [];
  let current = '';

  for (const s of sentences) {
    if ((current + ' ' + s).trim().length <= maxLen) {
      current = (current ? current + ' ' + s : s).trim();
    } else {
      if (current && hasSpeakableText(current)) chunks.push(current);
      if (s.length <= maxLen) {
        current = s;
      } else {
        const subWords = s.split(/\s+/);
        let subChunk = '';
        for (const w of subWords) {
          if ((subChunk + ' ' + w).trim().length <= maxLen) {
            subChunk = (subChunk ? subChunk + ' ' + w : w).trim();
          } else {
            if (subChunk && hasSpeakableText(subChunk)) chunks.push(subChunk);
            subChunk = w;
          }
        }
        current = subChunk;
      }
    }
  }
  if (current && hasSpeakableText(current)) chunks.push(current);
  return chunks.filter((c) => hasSpeakableText(c));
}

console.log('--- TESTING SMART CHUNKING ---');
const sampleParagraph = 'Lục Trường Sinh mở mắt ra, nhìn thấy bốn phía quen thuộc gian phòng. Đây là một gian đơn sơ phòng nhỏ, bên trong chỉ có một cái giường gỗ, một cái bàn, còn có một cái bồ đoàn. Hắn đứng dậy đi tới bên cửa sổ, đẩy cửa sổ ra nhìn về phía bên ngoài. Bên ngoài là một mảnh xanh um tươi tốt rừng trúc, gió nhẹ thổi qua, lá trúc phát ra sàn sạt tiếng vang. Nơi này là Cửu Phong tông Ngoại môn đệ tử nơi ở.';

// For Edge TTS, it should NOT be chopped into pieces!
const edgeChunks = splitParagraphIntoChunks(sampleParagraph, 'edge:vi-VN-HoaiMyNeural');
console.log('Edge TTS chunk count (length=' + sampleParagraph.length + '):', edgeChunks.length);
assert.strictEqual(edgeChunks.length, 1, 'Edge TTS should keep complete paragraph as 1 chunk to avoid stuttering');

// For Google TTS, it should be chunked around 170 chars
const googleChunks = splitParagraphIntoChunks(sampleParagraph, 'vi-natural-google');
console.log('Google TTS chunk count:', googleChunks.length);
assert.ok(googleChunks.length > 1, 'Google TTS should be split into smaller safe chunks');
for (const gc of googleChunks) {
  assert.ok(gc.length <= 170, `Chunk length should be <= 170 for Google TTS, got ${gc.length}`);
}

console.log('✓ Smart chunking tests passed successfully!');
