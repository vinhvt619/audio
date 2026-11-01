import { execFile } from 'child_process';
import util from 'util';
const execFileAsync = util.promisify(execFile);

async function testSlug(name, url) {
  try {
    const { stdout } = await execFileAsync('curl.exe', [
      '-sL',
      '--compressed',
      '-m', '8',
      '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      url
    ]);
    const titleMatch = stdout.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'No title';
    console.log(`[${name}] ${url} -> TITLE: "${title}", len=${stdout.length}`);
    return stdout;
  } catch (err) {
    console.log(`[${name}] ${url} -> ERROR: ${err.message}`);
    return null;
  }
}

async function run() {
  await testSlug('XTruyen Bach The', 'https://xtruyen.vn/bach-the-cau-tien');
  await testSlug('XTruyen De Ba', 'https://xtruyen.vn/de-ba');
  await testSlug('DTruyen Bach The', 'https://dtruyen.com/bach-the-cau-tien/');
  await testSlug('DTruyen De Ba', 'https://dtruyen.com/de-ba/');
  await testSlug('DichTiengHoa 3374', 'https://dichtienghoa.net/truyen/3374');
}

run();
