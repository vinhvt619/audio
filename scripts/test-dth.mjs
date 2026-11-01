import { execSync } from 'child_process';
import fs from 'fs';

try {
  const html = execSync('curl.exe -sL --compressed -m 15 -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" https://dichtienghoa.net/truyen/3374/3449744').toString();
  console.log('HTML total length:', html.length);
  console.log('Contains chapter-body:', html.includes('chapter-body'));
  
  const m = html.match(/class="chapter-body"[^>]*>([\s\S]*?)<\/div>/i);
  if (m) {
    console.log('Found chapter-body, len:', m[1].length);
    console.log('Snippet:', m[1].slice(0, 300));
  } else {
    console.log('No chapter-body found. Searching for text content in script or article...');
    const article = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    if (article) console.log('Found <article>, len:', article[1].length);
    
    // Check if Cloudflare turnstile or challenge was triggered
    if (html.includes('challenge-platform') || html.includes('Just a moment')) {
      console.log('Cloudflare protection detected!');
    }
  }
} catch (err) {
  console.error('Error:', err.message);
}
