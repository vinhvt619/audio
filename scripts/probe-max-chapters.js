import { execFile } from 'child_process';
import util from 'util';
const execFileAsync = util.promisify(execFile);

async function testHH3D(slug, chap) {
  const url = `https://truyenhh3d.com/truyen/${slug}/chuong-${chap}/`;
  try {
    const { stdout } = await execFileAsync('curl.exe', ['-sL', '-m', '10', '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', url]);
    const is404 = stdout.includes('404') || stdout.length < 500 || !stdout.includes('class="art"');
    const titleMatch = stdout.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].split(' - ')[0].trim() : '';
    return { chap, exists: !is404, title };
  } catch (e) {
    return { chap, exists: false, err: e.message };
  }
}

async function testDTH(bookId, chap) {
  const chapId = 3449683 + chap;
  const url = `https://dichtienghoa.net/truyen/${bookId}/${chapId}`;
  try {
    const { stdout } = await execFileAsync('curl.exe', ['-sL', '-m', '10', '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', url]);
    const is404 = stdout.includes('404') || stdout.length < 500 || !stdout.includes('chapter-body');
    const titleMatch = stdout.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].split(' - ')[0].trim() : '';
    return { chap, exists: !is404, title };
  } catch (e) {
    return { chap, exists: false, err: e.message };
  }
}

async function main() {
  console.log('Testing bach-the-cau-tien:');
  for (const c of [100, 150, 200, 300, 400, 500, 600, 700, 800, 1000]) {
    const r = await testHH3D('bach-the-cau-tien', c);
    console.log(`  Chap ${c}:`, r.exists ? r.title : 'NOT FOUND');
  }

  console.log('\nTesting de-ba:');
  for (const c of [100, 500, 1000, 2000, 3000, 4000, 5000, 5500, 6000]) {
    const r = await testHH3D('de-ba', c);
    console.log(`  Chap ${c}:`, r.exists ? r.title : 'NOT FOUND');
  }

  console.log('\nTesting moi-ngay-mot-que (dichtienghoa):');
  for (const c of [65, 66, 70, 80, 100, 120]) {
    const r = await testDTH(3374, c);
    console.log(`  Chap ${c}:`, r.exists ? r.title : 'NOT FOUND');
  }
}

main();
