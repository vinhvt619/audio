import { execSync } from 'child_process';

try {
  const html = execSync('curl.exe -sL --compressed -m 12 -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" "https://itruyen.org/tim-kiem?q=moi-ngay-mot-que"').toString();
  console.log('Search response len:', html.length);
  const links = html.match(/href="[^"]*truyen[^"]*"/g) || [];
  console.log('Found story links:', [...new Set(links)]);
} catch (e) {
  console.log('Error:', e.message);
}
