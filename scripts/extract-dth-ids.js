import { execSync } from 'child_process';

const html = execSync('curl.exe -sL --compressed -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" https://dichtienghoa.net/truyen/3374').toString();

// Match all occurrences of 3449XXX
const ids = Array.from(html.matchAll(/3449\d{3}/g)).map(m => m[0]);
console.log('Total 3449XXX IDs found:', ids.length, 'Unique:', [...new Set(ids)].length);
const sortedUnique = [...new Set(ids)].sort();
console.log('Sorted Unique IDs:', sortedUnique);

// Let's check titles around them
for (const id of sortedUnique.slice(0, 10)) {
  const pos = html.indexOf(id);
  console.log(`Context for ${id}:`, html.slice(pos - 40, pos + 100));
}
