import { execSync } from 'child_process';

for (const id of [3449743, 3449744, 3449745]) {
  try {
    const html = execSync(`curl.exe -sL --compressed -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" "https://dichtienghoa.net/truyen/3374/${id}"`).toString();
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].split(' - ')[0].trim() : '';
    const bodyMatch = html.match(/<div[^>]*class="chapter-body"[^>]*>([\s\S]*?)<\/div>/i);
    const body = bodyMatch ? bodyMatch[1].length : 0;
    console.log(`ID ${id} -> Title: "${title}", Body len: ${body}`);
  } catch (e) {
    console.error(`ID ${id} -> Error: ${e.message}`);
  }
}
