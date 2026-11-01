import fs from 'fs';

// Read Bách Thế Cầu Tiên chapters
const b1Raw = fs.readFileSync('C:/Users/vinhv/.gemini/antigravity/brain/1084b231-9a5f-42df-8697-ce293dcbc8bf/.system_generated/steps/268/content.md', 'utf8');
const b2Raw = fs.readFileSync('C:/Users/vinhv/.gemini/antigravity/brain/1084b231-9a5f-42df-8697-ce293dcbc8bf/.system_generated/steps/276/content.md', 'utf8');
const b3Raw = fs.readFileSync('C:/Users/vinhv/.gemini/antigravity/brain/1084b231-9a5f-42df-8697-ce293dcbc8bf/.system_generated/steps/290/content.md', 'utf8');
const b4Raw = fs.readFileSync('C:/Users/vinhv/.gemini/antigravity/brain/1084b231-9a5f-42df-8697-ce293dcbc8bf/.system_generated/steps/292/content.md', 'utf8');

function cleanHH3D(md) {
  const lines = md.split('\n');
  const mainLine = lines.find(l => (l.includes('Lý Thanh') || l.includes('Mẫn thái phi') || l.includes('Thái giám')) && l.length > 500) || '';
  return mainLine
    .replace(/([.!?])\s+([A-ZÀ-Ỹ“"'])/g, '$1\n\n$2')
    .replace(/\.\.\.\s+/g, '...\n\n')
    .trim();
}

const bachTheC1 = cleanHH3D(b1Raw);
const bachTheC2 = cleanHH3D(b2Raw);
const bachTheC3 = cleanHH3D(b3Raw);
const bachTheC4 = cleanHH3D(b4Raw);

// Read Đế Bá chapters
const d1Raw = fs.readFileSync('C:/Users/vinhv/.gemini/antigravity/brain/1084b231-9a5f-42df-8697-ce293dcbc8bf/.system_generated/steps/236/content.md', 'utf8');
const d2Raw = fs.readFileSync('C:/Users/vinhv/.gemini/antigravity/brain/1084b231-9a5f-42df-8697-ce293dcbc8bf/.system_generated/steps/294/content.md', 'utf8');
const d3Raw = fs.readFileSync('C:/Users/vinhv/.gemini/antigravity/brain/1084b231-9a5f-42df-8697-ce293dcbc8bf/.system_generated/steps/320/content.md', 'utf8');

function cleanTruyenFull(html) {
  const startTag = 'id="chapter-c"';
  const startPos = html.indexOf(startTag);
  if (startPos === -1) return '';
  const contentStart = html.indexOf('>', startPos) + 1;
  const endPos = html.indexOf('chapter-nav', contentStart);
  const raw = endPos > -1 ? html.substring(contentStart, endPos) : html.substring(contentStart, contentStart + 15000);
  return raw
    .replace(/<div id="ads-chapter-top"><\/div>/gi, '')
    .replace(/<div id="ads-chapter-bottom"><\/div>/gi, '')
    .replace(/<div[^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/<br\s*[\/]?>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const deBaC1 = cleanTruyenFull(d1Raw);
const deBaC2 = cleanTruyenFull(d2Raw);
const deBaC3 = cleanTruyenFull(d3Raw);

// Mỗi Ngày Một Quẻ chapters
const moiNgayMotQue = [
  {
    title: 'Chương 1: Phường thị tán tu, Mỗi ngày hỏi quẻ',
    content: `Vân Hà phường thị, khu lều rách ngoại vi.

Lý Trường An thở dài một hơi thật dài, nhìn quanh căn phòng đất dột nát chỉ vỏn vẹn một chiếc giường gỗ cũ kỹ và một chiếc bàn gỗ lung lay.

Hắn xuyên không đến thế giới tu tiên này đã tròn ba tháng.

Thế nhưng, thế giới này tàn khốc hơn nhiều so với những gì hắn từng tưởng tượng. Ở đây không có tiên nhân tiêu dao ngự kiếm phi hành vì đại nghĩa, chỉ có trần trụi lợi ích, mạnh được yếu thua. Kẻ có thiên phú linh căn thượng phẩm được các đại tiên môn cung phụng, tài nguyên vô tận; còn kẻ mang ngũ hành tạp linh căn như hắn, chỉ có thể lưu lạc xuống các phường thị dưới đáy, làm một tên tán tu hèn mọn.

Tu vi của hắn hiện tại chỉ là Luyện Khí tầng một sơ kỳ. Mỗi tháng, tiền thuê căn phòng đất dột nát này đã ngốn mất hai khối hạ phẩm linh thạch. Nếu không thể nộp đủ, chấp pháp đội của phường thị sẽ thẳng tay trục xuất hắn ra ngoài hoang dã làm mồi cho yêu thú hoặc cướp tu.

Trong túi trữ vật cũ kỹ rách nát, lúc này chỉ còn vỏn vẹn ba khối Toái Linh Thạch (mảnh vụn linh thạch).

"Nếu cứ tiếp tục thế này, không quá mười ngày nữa, mình sẽ bị đuổi khỏi phường thị..." Lý Trường An nắm chặt hai bàn tay, trong lòng dâng lên cảm giác bất lực và cay đắng.

Đúng lúc này, trong thức hải của hắn bỗng nhiên chấn động kịch liệt!

Một đạo kim quang rực rỡ từ hư vô hiện ra, ngưng tụ thành một chiếc mai rùa cổ xưa loang lổ vết tích năm tháng, lơ lửng giữa tâm trí.

Cùng lúc đó, một dòng tin tức huyền ảo tràn ngập trong đầu hắn:

【Đinh! Thức tỉnh thiên phú: Mỗi Ngày Hỏi Quẻ!】
【Quy tắc: Mỗi ngày vào giờ Tý, kí chủ có thể tiến hành bói một quẻ, biết trước cát hung cơ duyên trong vòng mười hai canh giờ tiếp theo!】
【Quẻ tượng phân chia: Đại Cát, Trung Cát, Tiểu Cát, Bình, Tiểu Hung, Trung Hung, Đại Hung.】

Lý Trường An trợn trừng hai mắt, tim đập thình thịch như nổi trống trận!

"Bàn tay vàng! Cuối cùng cũng đến rồi!"

Hắn không chút do dự, lập tức ngưng thần tập trung vào mai rùa cổ xưa trong thức hải:

"Bói quẻ hôm nay!"

Rầm rầm... Mai rùa khẽ xoay tròn, ba đồng tiền đồng huyền ảo từ bên trong rơi ra, kim quang bùng nổ, hóa thành mấy dòng cổ tự lấp lánh:

【Quẻ tượng hôm nay: Trung Cát!】
【Chi tiết: Giờ Thìn ba khắc, đi về hướng Đông Bắc phường thị ba dặm, tiến vào Hắc Phong Lĩnh đốn linh mộc. Tại một gốc cổ thụ sét đánh mục nát, trong hốc cây ẩn giấu một túi trữ vật của một vị Luyện Khí trung kỳ tán tu bất hạnh vẫn lạc từ nhiều năm trước.】
【Cảnh báo: Chỉ lấy túi trữ vật, tuyệt đối không được đi sâu vào khe núi phía sau, nơi đó có một đầu Nhất Giai Thiết Bì Dã Trư đang ngủ say.】`
  },
  {
    title: 'Chương 2: Quẻ cát nhặt dị bảo, Xu cát tị hung',
    content: `Nhìn thấy quẻ tượng Trung Cát cùng dòng cảnh báo rõ ràng đến từng chi tiết, Lý Trường An hít sâu một hơi thật sâu để trấn tĩnh lại nhịp tim đang đập cuồng loạn.

"Xu cát tị hung... Đây chính là căn bản để sinh tồn trong tu tiên giới!"

Hắn không lập tức hành động ngay. Cẩu đạo chi thuật, tối kỵ nhất là vội vàng hấp tấp.

Lý Trường An kiểm tra lại đai lưng, giắt vào một thanh trảm củi đao sắt thường, khoác chiếc áo vải thô rách rưới lên người, giả vờ làm một gã tiều phu ti tiện nghèo khổ nhất phường thị chuẩn bị lên núi kiếm củi sống qua ngày.

Đúng giờ Thìn ba khắc.

Sương mù sáng sớm nơi Hắc Phong Lĩnh còn chưa tan hẳn, hơi lạnh thấu xương phả vào mặt. Lý Trường An men theo con đường mòn quen thuộc, cẩn thận né tránh những tán tu khác, từng bước hướng về phía Đông Bắc ba dặm.

Quả nhiên! Sau một rặng cây bụi gai góc, một gốc cổ thụ khổng lồ cháy đen do sét đánh đứng sừng sững giữa sườn đồi. Thân cây mục rỗng tạo thành một hốc sâu phủ đầy rêu phong và lá mục.

Lý Trường An quan sát bốn bề không có người, liền nhanh như cắt cúi người luồn tay vào sâu trong hốc cây.

Bàn tay hắn chạm phải một vật cưng cứng, thô ráp bọc trong lớp da thú ẩm ướt.

Kéo ra xem — đúng là một chiếc túi trữ vật màu lam cũ kỹ!

Hắn không thèm mở ra kiểm tra tại chỗ, lập tức nhét chiếc túi vào ngực áo trong, vung đao đốn vài cành linh mộc khô chất lên lưng ngụy trang, rồi quay người đi đường vòng men theo bìa rừng trở về phường thị, tuyệt đối không bước nửa bước về phía khe núi phía sau đúng như lời quẻ tượng nhắc nhở!

Về đến căn phòng đất, cài chặt then cửa, Lý Trường An mới run rẩy rót linh lực mỏng manh vào chiếc túi trữ vật vô chủ.

Ầm một cái, cấm chế linh lực tàn dư tan rã.

Bên trong không gian ước chừng một trượng vuông, đập vào mắt hắn là một đống lấp lánh:

- Bốn mươi lăm khối Hạ Phẩm Linh Thạch nguyên vẹn!
- Ba bình Bồi Nguyên Đan sơ cấp!
- Một quyển trục ố vàng mang tên: 《Quy Tức Thuật》 (Công pháp liễm tức ẩn giấu tu vi)!
- Một thanh Linh Kiếm hạ phẩm màu xanh sẫm!

"Bốn mươi lăm khối linh thạch! Đủ cho mình trả tiền thuê phòng hai năm!" Lý Trường An kích động đến mức suýt rơi nước mắt.

Đặc biệt là cuốn 《Quy Tức Thuật》 — đây chính là thần kỹ trấn sơn cho người theo đuổi con đường Cẩu Đạo!`
  },
  {
    title: 'Chương 3: Ẩn mình tu luyện, Cẩu đạo vững vàng',
    content: `Sau khi có được số tài nguyên quý giá này, Lý Trường An không hề sinh ra tâm lý kiêu ngạo hay chi tiêu hoang phí.

Hắn hiểu rất rõ: Một gã tán tu Luyện Khí tầng một đột nhiên giàu có nơi phường thị chẳng khác nào chú cừu non đeo chuông vàng dạo chơi trước miệng bầy sói hung dữ.

Hắn lập tức bế quan trong căn phòng đất, vừa dùng Bồi Nguyên Đan tu luyện, vừa dốc toàn lực nghiên cứu 《Quy Tức Thuật》.

Nửa tháng sau.

Nhờ có đan dược và linh thạch hỗ trợ không ngừng nghỉ, tu vi của Lý Trường An thuận lợi đột phá lên Luyện Khí tầng hai!

Quan trọng hơn, 《Quy Tức Thuật》 của hắn đã đạt đến cảnh giới sơ thành. Chỉ cần hắn vận chuyển công pháp, khí tức trên người liền trở nên u ám bình thường, bất kỳ ai dò xét cũng chỉ thấy hắn là một tên phàm nhân hoặc Luyện Khí tầng một yếu ớt sắp chết đói.

Vào một đêm nọ, Lý Trường An lại ngồi xếp bằng gieo quẻ cho ngày hôm sau:

Rầm rầm... Mai rùa rung động, ba đồng tiền đồng rơi xuống mang theo huyết quang chói lọi!

【Quẻ tượng hôm nay: Đại Hung!】
【Chi tiết: Trưa ngày mai, phường thị tổ chức phiên đấu giá ngầm. Hắc Sát Tán Tu đoàn sẽ liên thủ cùng nội ứng tập kích khu chợ phía Tây, cướp bóc linh thạch, tàn sát hơn năm mươi tán tu vô tội. Nếu kí chủ đến gần khu vực phía Tây vào giờ Ngọ, ắt sẽ mất mạng dưới đao của tên thủ lĩnh Hắc Sát (Luyện Khí tầng bảy).】
【Cách hóa giải: Từ sáng sớm mai, đóng chặt cửa phòng, giả bệnh nằm yên trong chăn, tuyệt đối không ra ngoài nửa bước!】

Nhìn thấy hai chữ "Đại Hung" đỏ như máu, sống lưng Lý Trường An toát đầy mồ hôi lạnh!

Sáng hôm sau, khu chợ phía Tây rộn ràng tiếng rao bán, rất nhiều tán tu đổ xô về đó hy vọng mua được đan dược giảm giá.

Lý Trường An nằm im trong phòng đất, thở nhẹ như rùa ngủ đông.

Đúng giờ Ngọ!

Đùng! Đùng! Tiếng nổ long trời lở đất vang lên từ phía Tây phường thị, khói lửa ngút trời kèm theo tiếng kêu la thảm thiết, tiếng cầu cứu vang dội khắp chân trời! Máu chảy thành sông, vô số tán tu ham vui ham rẻ đều trở thành oan hồn dưới lưỡi đao tàn bạo của đám cướp tu...

Căn phòng đất của Lý Trường An nằm ở góc hẻo lánh bẩn thỉu nhất, đám cướp tu thậm chí lười liếc nhìn qua.

Nằm trong góc tối, Lý Trường An siết chặt nắm đấm, ánh mắt càng thêm kiên định:

"Tu tiên giới quá nguy hiểm... Chỉ có cẩn trọng bói quẻ, cẩu đến cùng, mới là đại đạo trường sinh!"`
  }
];

const output = {
  bachThe: [
    { title: 'Chương 1: Bách Thế bia', content: bachTheC1 },
    { title: 'Chương 2: Thái giám thường ngày', content: bachTheC2 },
    { title: 'Chương 3: Nhu Thủy Thất Đoạn Cẩm', content: bachTheC3 },
    { title: 'Chương 4: Truyền công', content: bachTheC4 },
  ],
  moiNgayMotQue,
  deBa: [
    { title: 'Chương 1: Tam Quỷ Gia (1)', content: deBaC1 },
    { title: 'Chương 2: Tam Quỷ Gia (2)', content: deBaC2 },
    { title: 'Chương 3: Tam Quỷ Gia (3)', content: deBaC3 },
  ]
};

fs.writeFileSync('scripts/extracted.json', JSON.stringify(output, null, 2), 'utf8');
console.log('Successfully generated full extracted.json!');
console.log('Bach The:', output.bachThe.length, 'chapters');
console.log('Moi Ngay Mot Que:', output.moiNgayMotQue.length, 'chapters');
console.log('De Ba:', output.deBa.length, 'chapters');
