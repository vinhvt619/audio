async function run() {
  for (const c of [550, 600, 700, 800, 1000, 1500]) {
    const url = `https://wetruyen.com/moi-ngay-mot-que-tu-tan-tu-phuong-thi-den-truong-sinh-c/chuong-${c}.html`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await res.text();
    const title = html.match(/<title>([^<]+)<\/title>/i)?.[1];
    const is404 = !title || title.includes('404') || title.includes('Trang đọc truyện online');
    console.log(`Chap ${c}:`, is404 ? 'NOT FOUND' : title.slice(0, 50));
  }
}
run();
