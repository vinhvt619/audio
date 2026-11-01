import { execSync } from 'child_process';

const html = execSync('curl.exe -sL --compressed -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" https://dichtienghoa.net/truyen/3374').toString();

// Look for chapter list or pagination or api
console.log('HTML size:', html.length);
const apiMatch = html.match(/\/api\/[^"']*/g) || [];
console.log('API matches:', [...new Set(apiMatch)]);

// Look for mucluc or list-chapter
const chapterLinks = html.match(/\/truyen\/3374\/\d+/g) || [];
console.log('Chapter links count:', chapterLinks.length, 'sample:', chapterLinks.slice(0, 10));

// Check if there is an ajax URL for chapters
const ajaxMatch = html.match(/loadChapter|ajax|chapter-list|mucluc|pagination/gi) || [];
console.log('Ajax keywords:', ajaxMatch);
