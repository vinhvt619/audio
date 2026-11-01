import { execSync } from 'child_process';

const slugs = [
  'moi-ngay-mot-que-tu-phuong-thi-tan-tu-den-truong-sinh-tien-ton',
  'moi-ngay-mot-que',
  'moi-ngay-hoi-que',
  'tu-phuong-thi-tan-tu-den-truong-sinh-tien-ton'
];

for (const s of slugs) {
  try {
    const html = execSync(`curl.exe -sL --compressed -A "Mozilla/5.0" "https://wetruyen.com/${s}/"`).toString();
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'No title';
    console.log(`Slug: ${s} -> Title: ${title}, Len: ${html.length}`);
  } catch (e) {
    console.log(`Slug: ${s} -> Error: ${e.message}`);
  }
}
