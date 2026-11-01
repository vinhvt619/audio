import { execSync } from 'child_process';

function test(url) {
  try {
    const html = execSync(`curl.exe -sL --compressed -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" "${url}"`).toString();
    console.log(`\nURL: ${url}`);
    console.log(`Length: ${html.length}`);
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    console.log(`Title: ${titleMatch ? titleMatch[1].trim() : 'No title'}`);

    // Check containers
    const contentMatch = html.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                         html.match(/<div[^>]*id="[^"]*chapter-c[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                         html.match(/<div[^>]*class="[^"]*chapter-c[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (contentMatch) {
      console.log('Matched tag:', contentMatch[0].slice(0, 80));
      const clean = contentMatch[1].replace(/<br\s*[\/]?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
      console.log(`Content sample (${clean.length} chars):`, clean.slice(0, 200));
    } else {
      console.log('No container matched. Looking for chapter divs:');
      const tags = html.match(/<div[^>]*class="[^"]*"[^>]*>/gi) || [];
      console.log('Divs sample:', tags.slice(0, 15));
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

test('https://wetruyen.com/bach-the-cau-tien/chuong-101.html');
test('https://wetruyen.com/de-ba/chuong-101.html');
test('https://wetruyen.com/de-ba/chuong-6976.html');
