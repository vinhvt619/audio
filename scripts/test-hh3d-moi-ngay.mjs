import { execSync } from 'child_process';

const url = 'https://truyenhh3d.com/truyen/moi-ngay-mot-que-tu-phuong-thi-tan-tu-den-truong-sinh-tien-ton/chuong-61/';
try {
  const html = execSync(`curl.exe -sL --compressed -m 15 -A "Mozilla/5.0" "${url}"`).toString();
  console.log('Len:', html.length);
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1];
  console.log('Title:', title);
  const art = html.match(/<article[^>]*class="art"[^>]*>([\s\S]*?)<\/article>/i);
  if (art) {
    console.log('Article found, len:', art[1].length);
  } else {
    console.log('No article found');
  }
} catch (e) {
  console.log('Error:', e.message);
}
