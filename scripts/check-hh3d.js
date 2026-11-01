import { execFile } from 'child_process';
import util from 'util';
const execFileAsync = util.promisify(execFile);

async function checkStoryInfo(slug) {
  const url = `https://truyenhh3d.com/truyen/${slug}/`;
  try {
    const { stdout } = await execFileAsync('curl.exe', [
      '-sL',
      '--compressed',
      '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      url
    ], { maxBuffer: 10 * 1024 * 1024 });

    console.log(`[${slug}] Length: ${stdout.length}`);
    const matches = Array.from(stdout.matchAll(/chuong-(\d+)/g)).map(m => parseInt(m[1], 10));
    if (matches.length > 0) {
      console.log(`[${slug}] Found chapter numbers in HTML: min=${Math.min(...matches)}, max=${Math.max(...matches)}`);
    } else {
      console.log(`[${slug}] No chuong-X found in HTML directly.`);
    }

    // Check pagination or chapter list links
    const links = stdout.match(/href="[^"]*chuong-[^"]*"/g) || [];
    console.log(`[${slug}] Chapter links found: ${links.length}. Samples:`, links.slice(0, 5));
    
    // Check total chapters text
    const textMatches = stdout.match(/(\d+)\s*(chương|Chương)/g) || [];
    console.log(`[${slug}] Text mentions of chapters:`, textMatches);
  } catch (err) {
    console.error(`[${slug}] Error:`, err.message);
  }
}

async function run() {
  await checkStoryInfo('bach-the-cau-tien');
  await checkStoryInfo('de-ba');
}

run();
