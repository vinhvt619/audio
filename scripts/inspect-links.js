import { execSync } from 'child_process';

const html = execSync('curl.exe -sL --compressed -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36" https://dtruyen.com/bach-the-cau-tien/').toString();
const matches = Array.from(html.matchAll(/<a[^>]*href="([^"]*chuong[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi));
console.log('Total chapter links found on bach-the-cau-tien:', matches.length);
matches.slice(0, 10).forEach(m => console.log('Href:', m[1], 'Text:', m[2].trim().replace(/\s+/g, ' ')));

const htmlDeBa = execSync('curl.exe -sL --compressed -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36" https://dtruyen.com/de-ba/').toString();
const matchesDeBa = Array.from(htmlDeBa.matchAll(/<a[^>]*href="([^"]*chuong[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi));
console.log('\nTotal chapter links found on de-ba:', matchesDeBa.length);
matchesDeBa.slice(0, 10).forEach(m => console.log('Href:', m[1], 'Text:', m[2].trim().replace(/\s+/g, ' ')));
