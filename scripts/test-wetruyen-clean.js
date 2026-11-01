import { execSync } from 'child_process';

function fetchWetruyen(url) {
  const html = execSync(`curl.exe -sL --compressed -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" "${url}"`).toString();
  
  let title = '';
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch) {
    title = titleMatch[1].replace(/của truyện.*$/i, '').trim();
  }

  // The content container in wetruyen
  const contentMatch = html.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (!contentMatch) return null;

  let raw = contentMatch[1];
  // Remove ads or scripts if any
  raw = raw.replace(/<script[\s\S]*?<\/script>/gi, '');
  raw = raw.replace(/<div[\s\S]*?<\/div>/gi, '');
  
  // Format paragraphs
  const clean = raw
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&#13;/g, '')
    .replace(/\r/g, '')
    .split('\n')
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .join('\n\n');

  return { title, length: clean.length, sample: clean.slice(0, 300) };
}

console.log('Bach The 101:', fetchWetruyen('https://wetruyen.com/bach-the-cau-tien/chuong-101.html'));
console.log('\nDe Ba 1:', fetchWetruyen('https://wetruyen.com/de-ba/chuong-1.html'));
console.log('\nDe Ba 6976:', fetchWetruyen('https://wetruyen.com/de-ba/chuong-6976.html'));
