# 🎧 AudioRead - Web Đọc Truyện Chữ & Nghe Sách Nói Thông Minh

**AudioRead** là ứng dụng web hiện đại kết hợp giữa **đọc truyện chữ** và **nghe audio** (hỗ trợ cả file âm thanh MP3/M4A thu sẵn và giọng đọc AI - Text-to-Speech). Ứng dụng hoạt động trực tiếp trên trình duyệt, lưu trữ ngoại tuyến bằng IndexedDB, tối ưu hoàn hảo cho cả máy tính và điện thoại di động.

---

## 🌟 Tính Năng Nổi Bật

### 1. 📖 Trải Nghiệm Đọc Sách Chuyên Nghiệp (Reader Mode)
- **5 Bộ Giao Diện Màu Nền (Themes):**
  - **Giấy cổ (Sepia):** Tone màu vàng ấm cổ điển, dịu mắt nhất khi đọc lâu.
  - **Xanh lá (Forest):** Màu xanh thảo mộc bảo vệ thị lực.
  - **Sáng (Light):** Trắng thanh lịch, độ tương phản cao.
  - **Đêm (Night):** Xám than hiện đại, chống chói ban đêm.
  - **OLED (Dark):** Đen tuyền 100%, tiết kiệm pin tối đa cho màn hình OLED/AMOLED.
- **Tùy Chỉnh Typography Đa Dạng:**
  - Kiểu chữ: **Lora** (Serif có chân văn học sang trọng) & **Be Vietnam Pro** (Sans-serif hiện đại, tối ưu tiếng Việt).
  - Cỡ chữ linh hoạt (`A-`, `A+` từ 14px đến 30px).
  - Giãn dòng (`1.6x`, `1.8x`, `2.0x`, `2.2x`).
  - Căn lề: Căn đều 2 bên (Justify) hoặc Căn trái (Left).
  - Độ rộng trang đọc: Hẹp, Chuẩn, Rộng, Tràn viền.
- **Tiến độ & Mục lục:**
  - Thanh đo tiến độ đọc theo phần trăm thời gian thực.
  - Drawer mục lục trượt ra nhanh, tìm kiếm chương tức thì.
  - Chuyển chương tiện lợi (Chương trước / Chương sau).

### 2. 🎙️ Hệ Thống Âm Thanh Kép (File Audio + Giọng Đọc AI TTS)
- **Chế độ 1 - File Audio Thu Sẵn (MP3/M4A/WAV):**
  - Cho phép người dùng gắn trực tiếp file âm thanh cho từng chương.
  - Tua lùi 10 giây, tua tới 30 giây, thanh trượt thời gian mượt mà.
- **Chế độ 2 - Giọng Đọc AI (Text-To-Speech):**
  - Đọc tự động trực tiếp từ văn bản truyện mà không cần chuẩn bị file audio.
  - **Karaoke Sentence & Paragraph Tracker:** Tự động làm nổi bật (highlight) đoạn văn đang đọc và cuộn trang mượt mà theo giọng nói.
  - **Click-to-Speech:** Nhấn vào bất kỳ đoạn văn nào trên trang để nghe đọc ngay từ đoạn đó.
  - Tự động nhận diện và ưu tiên các giọng đọc Tiếng Việt chất lượng cao có trên thiết bị (Google Tiếng Việt, Microsoft Hoài My, Microsoft Nam Minh,...).
- **Thanh Điều Khiển Âm Thanh Ghim Đáy (Docked Bottom Player):**
  - Chạy nền xuyên suốt: Người dùng có thể vừa nghe vừa duyệt tủ sách hoặc chuyển đổi giữa các chương.
  - Điều chỉnh tốc độ phát: `0.75x`, `1.0x`, `1.25x`, `1.5x`, `1.75x`, `2.0x`.
  - **Hẹn giờ tắt thông minh (Sleep Timer):** 15 phút, 30 phút, 45 phút, 60 phút, hết chương kèm đồng hồ đếm ngược trực quan.
  - Điều chỉnh âm lượng và bật/tắt tiếng (Mute).

### 3. 📂 Quản Lý & Nhập Dữ Liệu Mạnh Mẽ
- **Nhập tập tin `.txt` tự động:** Bộ phân tích thông minh nhận diện cấu trúc chương (`Chương X`, `Hồi X`, `Chapter X`,...) để tự động chia chương.
- **Nhập tập tin `.epub`:** Đọc trực tiếp cấu trúc EPUB trên trình duyệt, trích xuất bìa sách, tiêu đề, tác giả và danh sách chương.
- **Tạo truyện thủ công:** Nhập văn bản trực tiếp.
- **Gắn file audio:** Tải file `.mp3`, `.m4a` từ máy tính và lưu trữ an toàn trong IndexedDB của trình duyệt.
- **Có sẵn truyện mẫu kinh điển:** *Dế Mèn Phiêu Lưu Ký (Tô Hoài)* kèm âm thanh mẫu để bạn trải nghiệm ngay lập tức.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

- **Frontend:** React 19 + TypeScript + Vite 8
- **Styling:** Tailwind CSS 3.4 + Custom Reading Tokens
- **Icons:** Lucide React
- **Lưu trữ Offline:** Dexie.js (IndexedDB wrapper) - không giới hạn dung lượng 5MB của localStorage, lưu trữ an toàn cả file âm thanh lớn.
- **Xử lý EPUB:** JSZip
- **Âm thanh & Giọng nói:** HTML5 Audio API + Web Speech API (SpeechSynthesis)

---

## 🚀 Hướng Dẫn Chạy Dự Án

### 1. Khởi động môi trường phát triển (Dev Server)
```bash
npm run dev
```
Trang web sẽ khả dụng tại: [http://localhost:5173/](http://localhost:5173/)

### 2. Xây dựng bản phát hành (Production Build)
```bash
npm run build
```
Kết quả đóng gói tối ưu sẽ nằm trong thư mục `dist/`.
