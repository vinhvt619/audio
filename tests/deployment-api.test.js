import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/index.js';

async function request(url, method = 'GET') {
  const res = { headers: {}, statusCode: 200,
    setHeader(key, value) { this.headers[key] = value; },
    end(body) { this.body = body; },
  };
  await handler({ url, method }, res);
  return res;
}

test('anonymous requests cannot mutate the shared database or its configuration', async () => {
  for (const [url, method] of [
    ['/api/stories', 'POST'], ['/api/stories?id=example', 'DELETE'],
    ['/api/chapter', 'POST'], ['/api/chapters', 'POST'],
    ['/api/db-config', 'POST'], ['/api/db-sync-seed', 'POST'],
  ]) assert.equal((await request(url, method)).statusCode, 403);
});

test('voice listing supports the production rewrite without a database connection', async () => {
  const res = await request('/api/index?route=tts/voices');
  assert.equal(res.statusCode, 200);
  assert.ok(JSON.parse(res.body).some(voice => voice.id === 'edge:vi-VN-HoaiMyNeural'));
});

test('invalid chapter and TTS requests fail before upstream calls', async () => {
  for (const url of ['/api/chapter?story=example&chapter=-1',
    '/api/chapter?story=example&chapter=1.5', '/api/tts',
    '/api/tts?text=hello&voice=invalid']) {
    assert.equal((await request(url)).statusCode, 400);
  }
  assert.equal((await request('/api/unknown')).statusCode, 404);
});

test('TTS accepts the new client chunk limit and rejects oversized input before synthesis', async () => {
  const allowedLength = await request(`/api/tts?text=${'a'.repeat(1200)}&voice=invalid`);
  assert.equal(allowedLength.statusCode, 400);
  assert.equal(JSON.parse(allowedLength.body).error, 'Giọng đọc không hợp lệ.');
  const oversized = await request(`/api/tts?text=${'a'.repeat(1201)}&voice=invalid`);
  assert.equal(oversized.statusCode, 400);
  assert.equal(JSON.parse(oversized.body).error, 'Văn bản phải có từ 1 đến 1200 ký tự.');
});
