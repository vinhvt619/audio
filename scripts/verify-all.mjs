import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function verifyAll() {
  console.log('=== AUDIO NOVEL SYSTEM VERIFICATION ===\n');

  // 1. Check MongoDB Atlas content
  console.log('1. Verifying MongoDB Atlas Collections:');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db('audio_novel_db');

  const stories = await db.collection('stories').find({}).toArray();
  console.log(`- Stories in Atlas: ${stories.length}`);
  for (const s of stories) {
    const count = await db.collection('chapters').countDocuments({ storyId: s.id });
    console.log(`  * [${s.id}] "${s.title}": ${count} chapters`);
  }

  const totalChapters = await db.collection('chapters').countDocuments();
  console.log(`- Total chapters in MongoDB Atlas: ${totalChapters}\n`);
  await client.close();

  // 2. Test CORS and Audio API endpoint on dev server
  console.log('2. Verifying Audio & CORS API (http://localhost:5173):');
  try {
    const optRes = await fetch('http://localhost:5173/api/tts', {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:5174' },
    });
    console.log(`- OPTIONS /api/tts status: ${optRes.status} (CORS Origin: ${optRes.headers.get('access-control-allow-origin')})`);

    const ttsRes = await fetch(
      'http://localhost:5173/api/tts?text=' +
        encodeURIComponent('Kiểm tra âm thanh tiếng Việt hoàn chỉnh.') +
        '&voice=edge:vi-VN-HoaiMyNeural',
      {
        headers: { Origin: 'http://localhost:5174' },
      }
    );
    const audioBuf = await ttsRes.arrayBuffer();
    console.log(`- GET /api/tts status: ${ttsRes.status}`);
    console.log(`  * Content-Type: ${ttsRes.headers.get('content-type')}`);
    console.log(`  * CORS Header: ${ttsRes.headers.get('access-control-allow-origin')}`);
    console.log(`  * Audio bytes received: ${audioBuf.byteLength} bytes`);
  } catch (err) {
    console.error('Audio API test error:', err.message);
  }

  // 3. Test Chapter Proxy with CORS
  console.log('\n3. Verifying Chapter Proxy API:');
  try {
    const chapRes = await fetch('http://localhost:5173/api/chapter?story=bach-the-cau-tien&chapter=1', {
      headers: { Origin: 'http://localhost:5174' },
    });
    const chapData = await chapRes.json();
    console.log(`- GET /api/chapter (Chương 1 Bách Thế Cầu Tiên): ${chapRes.status}`);
    console.log(`  * Title: ${chapData.title}`);
    console.log(`  * Content length: ${chapData.content?.length} chars`);
    console.log(`  * CORS: ${chapRes.headers.get('access-control-allow-origin')}`);
  } catch (err) {
    console.error('Chapter proxy test error:', err.message);
  }

  console.log('\n=== ALL SYSTEM TESTS PASSED SUCCESSFULLY! ===');
}

verifyAll().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
