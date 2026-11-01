import { execFile } from 'child_process';
import util from 'util';
const execFileAsync = util.promisify(execFile);

async function testChap(url) {
  try {
    const { stdout } = await execFileAsync('curl.exe', [
      '-sL',
      '--compressed',
      '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      url
    ]);

    const titleMatch = stdout.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'No title';
    console.log(`URL: ${url}`);
    console.log(`Title: ${title}, Len: ${stdout.length}`);
    
    // Check chapter body
    const bodyMatch = stdout.match(/<div[^>]*class="chapter-c"[^>]*>([\s\S]*?)<\/div>/i) ||
                      stdout.match(/<div[^>]*id="chapter-c"[^>]*>([\s\S]*?)<\/div>/i) ||
                      stdout.match(/<div[^>]*class="content"[^>]*>([\s\S]*?)<\/div>/i) ||
                      stdout.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    
    if (bodyMatch) {
      console.log('Body matched! Length:', bodyMatch[1].length);
      const sample = bodyMatch[1].replace(/<[^>]+>/g, ' ').slice(0, 200).trim();
      console.log('Sample text:', sample);
    } else {
      console.log('No body match found. Finding possible content containers:');
      const containers = stdout.match(/<div[^>]*class="[^"]*chapter[^"]*"[^>]*>/gi) || [];
      console.log('Chapter divs:', containers);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

async function run() {
  await testChap('https://dtruyen.com/bach-the-cau-tien/chuong-101/');
  await testChap('https://dtruyen.com/de-ba/chuong-101/');
}

run();
