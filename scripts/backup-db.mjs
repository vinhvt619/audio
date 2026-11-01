import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('No MONGODB_URI found in .env');
  process.exit(1);
}

async function runBackup() {
  console.log('[Backup] Connecting to MongoDB Atlas...');
  const client = new MongoClient(uri);
  await client.connect();

  const dbName = uri.split('?')[0].split('/').pop() || 'audio_novel_db';
  const db = client.db(dbName);

  console.log(`[Backup] Connected to database: ${dbName}`);

  const backupDir = path.resolve(process.cwd(), 'scripts/backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const stories = await db.collection('stories').find({}).toArray();
  const chapters = await db.collection('chapters').find({}).toArray();
  const readingProgress = await db.collection('readingProgress').find({}).toArray();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `atlas-backup-${timestamp}.json`);
  const latestFile = path.join(backupDir, 'atlas-snapshot.json');

  const payload = {
    backupDate: new Date().toISOString(),
    databaseName: dbName,
    counts: {
      stories: stories.length,
      chapters: chapters.length,
      readingProgress: readingProgress.length,
    },
    stories,
    chapters,
    readingProgress,
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  fs.writeFileSync(backupFile, jsonStr, 'utf8');
  fs.writeFileSync(latestFile, jsonStr, 'utf8');

  console.log(`[Backup] Successfully exported:`);
  console.log(`  - Stories: ${stories.length}`);
  console.log(`  - Chapters: ${chapters.length}`);
  console.log(`  - Reading Progress: ${readingProgress.length}`);
  console.log(`  - File 1: ${backupFile}`);
  console.log(`  - File 2: ${latestFile}`);

  await client.close();
}

runBackup().catch((err) => {
  console.error('[Backup Error]:', err);
  process.exit(1);
});
