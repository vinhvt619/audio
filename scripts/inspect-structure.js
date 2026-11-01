import { execFile } from 'child_process';
import util from 'util';
const execFileAsync = util.promisify(execFile);

async function inspectDTruyen(slug) {
  const url = `https://dtruyen.com/${slug}/`;
  const { stdout } = await execFileAsync('curl.exe', [
    '-sL',
    '--compressed',
    '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    url
  ]);

  console.log(`=== DTruyen: ${slug} ===`);
  const chapLinks = stdout.match(/href="https:\/\/dtruyen\.com\/[^"]*\/chuong-[^"]*"/gi) || 
                    stdout.match(/href="\/[^"]*\/chuong-[^"]*"/gi) ||
                    stdout.match(/chuong-\d+/gi) || [];
  console.log('Sample links found:', chapLinks.slice(0, 10));

  // Find chapter list or total chapters
  const totalMatch = stdout.match(/(\d+)\s*(chương|Chương)/gi);
  console.log('Chapter mentions:', totalMatch);

  // Check last chapter link
  const lastChaps = stdout.match(/chuong-\d+/gi) || [];
  const numbers = lastChaps.map(c => parseInt(c.replace('chuong-', ''), 10)).filter(n => !isNaN(n));
  if (numbers.length > 0) {
    console.log(`Numbers found: min=${Math.min(...numbers)}, max=${Math.max(...numbers)}`);
  }
}

async function inspectDTH() {
  const url = 'https://dichtienghoa.net/truyen/3374';
  const { stdout } = await execFileAsync('curl.exe', [
    '-sL',
    '--compressed',
    '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    url
  ]);

  console.log(`=== DichTiengHoa 3374 ===`);
  // Check chapter URLs in HTML
  const matches = Array.from(stdout.matchAll(/\/truyen\/3374\/(\d+)/g)).map(m => m[1]);
  console.log(`Found ${matches.length} chapter links in DTH. Unique: ${[...new Set(matches)].length}`);
  console.log('First 5:', matches.slice(0, 5), 'Last 5:', matches.slice(-5));
}

async function run() {
  await inspectDTruyen('bach-the-cau-tien');
  await inspectDTruyen('de-ba');
  await inspectDTH();
}

run();
