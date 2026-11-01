import { execSync } from 'child_process';

const html = execSync('curl.exe -sL --compressed -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" https://dichtienghoa.net/truyen/3374').toString();

const nextMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
if (nextMatch) {
  console.log('FOUND __NEXT_DATA__! Parsing JSON...');
  try {
    const data = JSON.parse(nextMatch[1]);
    console.log('Props keys:', Object.keys(data.props || {}));
    console.log('pageProps keys:', Object.keys(data.props?.pageProps || {}));
    const chapters = data.props?.pageProps?.chapters || data.props?.pageProps?.book?.chapters || [];
    console.log('Found chapters in __NEXT_DATA__:', chapters.length);
    if (chapters.length > 0) {
      console.log('Sample chapter:', chapters[0]);
    }
  } catch (e) {
    console.error('Error parsing __NEXT_DATA__:', e.message);
  }
} else {
  console.log('No __NEXT_DATA__ found. Checking window.__INITIAL_STATE__ or other script tags...');
  const scripts = Array.from(html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi))
    .map(m => m[1])
    .filter(s => s.includes('3449') || s.includes('chương') || s.includes('chapters'));
  console.log('Scripts with chapters count:', scripts.length);
  scripts.forEach((s, idx) => console.log(`Script ${idx} len: ${s.length}, snippet:`, s.slice(0, 200)));
}
