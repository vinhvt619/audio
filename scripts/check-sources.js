async function fetchUrl(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    return await res.text();
  } catch (err) {
    return null;
  }
}

async function run() {
  const sources = [
    { name: 'Bách Thế Cầu Tiên (TruyenFull)', url: 'https://truyenfull.io/bach-the-cau-tien/' },
    { name: 'Đế Bá (TruyenFull)', url: 'https://truyenfull.io/de-ba/' },
    { name: 'Mỗi Ngày Một Quẻ (TruyenFull)', url: 'https://truyenfull.io/moi-ngay-mot-que-tu-phuong-thi-tan-tu-den-truong-sinh-tien-ton/' },
    { name: 'Mỗi Ngày Một Quẻ (TruyenHH3D)', url: 'https://truyenhh3d.com/truyen/moi-ngay-mot-que-tu-phuong-thi-tan-tu-den-truong-sinh-tien-ton/' }
  ];

  for (const s of sources) {
    const html = await fetchUrl(s.url);
    if (!html) {
      console.log(`[${s.name}]: Failed to fetch`);
      continue;
    }
    const pageMatch = html.match(/id="total-page"[^>]*value="(\d+)"/i) || html.match(/class="total-page"[^>]*>(\d+)</i);
    const totalPages = pageMatch ? pageMatch[1] : 'unknown';
    const chaps = html.match(/chuong-\d+/g) || [];
    console.log(`[${s.name}]: HTML len: ${html.length}, Total pages: ${totalPages}, chapters found on p1: ${chaps.length}`);
  }
}

run();
