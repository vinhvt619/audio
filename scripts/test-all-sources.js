import { execFile } from 'child_process';
import util from 'util';
const execFileAsync = util.promisify(execFile);

const testUrls = [
  { name: 'TruyenFull', url: 'https://truyenfull.io/' },
  { name: 'DTruyen', url: 'https://dtruyen.com/' },
  { name: 'TangThuVien', url: 'https://tangthuvien.net/' },
  { name: 'DichTiengHoa', url: 'https://dichtienghoa.net/' },
  { name: 'XTruyen', url: 'https://xtruyen.vn/' },
  { name: 'VTruyen', url: 'https://vtruyen.com/' },
  { name: 'TruyenCV', url: 'https://metruyencv.com/' },
  { name: 'TruyenPlus', url: 'https://truyenplus.vn/' },
  { name: 'TruyenChu', url: 'https://truyenchu.vn/' },
];

async function testSource(item) {
  const start = Date.now();
  try {
    const { stdout } = await execFileAsync('curl.exe', [
      '-sL',
      '--compressed',
      '-m', '6',
      '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      item.url
    ]);
    const duration = Date.now() - start;
    console.log(`[${item.name}]: SUCCESS in ${duration}ms, length=${stdout.length}`);
    return { name: item.name, ok: true, duration };
  } catch (err) {
    const duration = Date.now() - start;
    console.log(`[${item.name}]: FAILED in ${duration}ms (${err.message.split('\n')[0]})`);
    return { name: item.name, ok: false, duration };
  }
}

async function run() {
  console.log('Testing sources accessibility...');
  for (const s of testUrls) {
    await testSource(s);
  }
}

run();
