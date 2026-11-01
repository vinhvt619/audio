import fs from 'fs';

const raw = JSON.parse(fs.readFileSync('scripts/extracted.json', 'utf8'));

const bachTheChapters = raw.bachThe;
const moiNgayChapters = raw.moiNgayMotQue;
const deBaChapters = raw.deBa;

const content = `import type { Story, Chapter } from '../types';

export const seededStories: { story: Story; chapters: Chapter[] }[] = [
  {
    story: {
      id: 'bach-the-cau-tien',
      title: 'Bách Thế Cầu Tiên',
      author: 'Hắc Gia Nhưỡng Ti Tửu',
      category: 'Tiên Hiệp • Trường Sinh Lưu',
      description: 'Muôn đời nhập phàm trần, không tranh một thế chi cảnh xuân tươi đẹp, chỉ tranh muôn đời chi sớm chiều. Tại trong hồng trần cầu tiên.\\n\\nTa gọi Lý Thanh, tam thế thoát phàm, cửu thế nhập đạo, muôn đời thành tiên.\\n\\nMỗi một kiếp nhân sinh đều trải qua sinh lão bệnh tử, đến đại nạn thọ tận lại phản lão hoàn đồng trở lại thiếu niên. Không tranh đấu ngông cuồng, cẩn trọng cẩu đạo, từng bước trường sinh trong hồng trần cuồn cuộn.',
      coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
      createdAt: Date.now() - 3000,
      updatedAt: Date.now() - 3000,
      chaptersCount: ${bachTheChapters.length},
    },
    chapters: ${JSON.stringify(bachTheChapters.map((c, idx) => ({
      id: `bach-the-chap-${idx + 1}`,
      storyId: 'bach-the-cau-tien',
      chapterIndex: idx + 1,
      title: c.title,
      content: c.content,
      hasAudioFile: false,
    })), null, 2)}
  },
  {
    story: {
      id: 'moi-ngay-mot-que',
      title: 'Mỗi Ngày Một Quẻ, Từ Phường Thị Tán Tu Đến Trường Sinh Tiên Tôn',
      author: 'Bắc Cảnh Nam Phong',
      category: 'Tiên Hiệp • Cẩu Đạo • Hệ Thống',
      description: 'Lý Trường An chuyển thế đến tu tiên giới tàn khốc, bắt đầu từ một tán tu tầm thường nơi phường thị, không tông môn, không gia thế, linh căn bậc thấp, cơ duyên trường sinh xa vời vợi.\\n\\nMay mắn thay, hắn thức tỉnh hệ thống 【Mỗi Ngày Hỏi Quẻ】: Mỗi ngày có thể gieo một quẻ để biết trước cát hung! Nhờ cẩu đạo vững vàng và kết thiện duyên, Lý Trường An từng bước tích lũy tu vi, chứng kiến vô số thiên kiêu chôn vùi theo tuế nguyệt, cuối cùng trở thành Trường Sinh Tiên Tôn.',
      coverUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80',
      createdAt: Date.now() - 2000,
      updatedAt: Date.now() - 2000,
      chaptersCount: ${moiNgayChapters.length},
    },
    chapters: ${JSON.stringify(moiNgayChapters.map((c, idx) => ({
      id: `moi-ngay-chap-${idx + 1}`,
      storyId: 'moi-ngay-mot-que',
      chapterIndex: idx + 1,
      title: c.title,
      content: c.content,
      hasAudioFile: false,
    })), null, 2)}
  },
  {
    story: {
      id: 'de-ba',
      title: 'Đế Bá',
      author: 'Yếm Bút Tiêu Sinh',
      category: 'Huyền Huyễn • Vô Địch Lưu',
      description: 'Ngàn vạn năm trước, Lý Thất Dạ vì đi tìm một con dê lạc mà lọt vào Tiên Ma Động, bị tước đoạt thể xác, hồn phách bị phong ấn vào thân xác một con quạ đen Âm Nha bất tử bay lượn khắp Cửu Giới.\\n\\nHắn từng chỉ điểm Dược Thần, bồi dưỡng Minh Nhân Tiên Đế, bồi dưỡng vô số Nữ Đế, Yêu Thần, Ma Hoàng chấn động vạn cổ. Sau triệu năm đằng đẵng, hắn đoạt lại nhục thân thiếu niên, bước vào Tẩy Nhan Cổ Phái đã suy tàn, mở ra con đường vô địch hoành tảo chư thiên vạn giới!',
      coverUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
      createdAt: Date.now() - 1000,
      updatedAt: Date.now() - 1000,
      chaptersCount: ${deBaChapters.length},
    },
    chapters: ${JSON.stringify(deBaChapters.map((c, idx) => ({
      id: `de-ba-chap-${idx + 1}`,
      storyId: 'de-ba',
      chapterIndex: idx + 1,
      title: c.title,
      content: c.content,
      hasAudioFile: false,
    })), null, 2)}
  }
];
`;

fs.mkdirSync('src/data', { recursive: true });
fs.writeFileSync('src/data/seedStories.ts', content, 'utf8');
console.log('Successfully wrote src/data/seedStories.ts');
