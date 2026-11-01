import { execSync } from 'child_process';

const html = execSync('curl.exe -sL --compressed -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" https://dichtienghoa.net/truyen/3374').toString();

const idx = html.indexOf('chapter-list');
if (idx > -1) {
  console.log('Snippet around chapter-list:');
  console.log(html.slice(idx - 100, idx + 1000));
} else {
  console.log('chapter-list not found verbatim');
}
