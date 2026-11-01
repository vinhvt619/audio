# AudioRead trên Vercel

- Production: https://audioread-beta.vercel.app
- Project alias: https://audioread-vinhvt619s-projects.vercel.app
- Dashboard: https://vercel.com/vinhvt619s-projects/audioread
- Project ID: `prj_Ywb2ETtrdeKu8b3qiz3zVaGYFQEh`
- Team ID: `team_zujrOPg6RvXzmYG15K3iuJYO`
- Current deployment: `dpl_Gpj3zH3A8kiQtPbEmQZGE1xDwCfx`, production, READY (15/10/2026: ưu tiên Mê Truyện Chữ cho Bách Thế Cầu Tiên).

## Cấu hình

Vite build xuất frontend vào `dist`. `api/index.js` cung cấp API qua Vercel Functions; `vercel.json` định tuyến `/api/*` vào function và các trang còn lại vào SPA. Node.js 24.

API bản online chỉ cho phép đọc thư viện Cloud, tải chương và tổng hợp giọng nói. Không cho khách truy cập sửa/xóa thư viện chung, thay chuỗi kết nối hay seed database. Tiến độ, truyện nhập riêng và file audio lưu trong trình duyệt. Chương đã tải được cache vào IndexedDB.

`MONGODB_URI` đã được cấu hình dưới dạng Secret/Sensitive, chỉ cho Production, theo xác nhận của người dùng, rồi redeploy. Không dùng tiền tố `VITE_`. Không đưa `.env` vào source upload, Git hoặc frontend.

Deployment Protection giữ nguyên theo mặc định tài khoản. Khi mở link nếu gặp trang Vercel Login, cần đăng nhập tài khoản có quyền. Không tự động tắt bảo vệ. Kiểm tra tự động qua link xác thực tạm thời đã được người dùng cho phép; không ghi link này vào source hoặc tài liệu.

## Kiểm tra đã thực hiện

- `npm run build`: thành công local và trên Vercel; còn cảnh báo bundle lớn.
- `npm run lint`: không có lỗi chặn ở lần kiểm tra trước deploy; còn cảnh báo trong mã hiện có.
- `node --test tests/deployment-api.test.js`: 3/3 thành công.
- Vercel trả deployment READY; build log có Deployment completed.
- MongoDB production đã kết nối: 3 truyện, 2.770 chương tại thời điểm kiểm tra.
- API `/api/chapter?story=bach-the-cau-tien&chapter=1`: HTTP 200, trả tiêu đề và 4.657 ký tự nội dung.
- API `/api/tts/voices`: HTTP 200; tổng hợp mẫu Hoài My qua `/api/tts`: HTTP 200, `audio/mpeg`, 19.584 byte.
- Giao diện đã tải thư viện Cloud, mở chương trong reader và chạy player TTS từ đoạn 1 đến đoạn 9; đã tạm dừng sau kiểm tra. Chưa đánh giá chủ quan chất lượng âm thanh hoặc nghe hết chương.
- Log error/fatal của deployment trong cửa sổ 10 phút không có bản ghi tại thời điểm kiểm tra; chưa cấu hình drains/giám sát bổ sung.
- Bản sửa mobile: 7 tests qua; xem `MOBILE_FIX.md` để biết thay đổi và kết quả kiểm tra responsive.
- Bản cập nhật Gemini mới: giữ bản sửa mobile; đã sửa dependency gây vòng lặp khởi tạo/refresh khi chọn truyện. Kiểm tra local việc khôi phục chương 515 từ URL, chuyển audio sang 516 và đồng bộ URL, Back, reload và đóng player. Trên production đã xác nhận mở trực tiếp chương 516, có nút đóng player, đóng player trả chiều cao chừa đáy về 0px; viewport 390px không tràn ngang. Ảnh: `artifacts/gemini-update-live.jpg`.
- Hash các file nguồn của bản đang deploy nằm ở `.vercel/source-manifest.json` để đối chiếu lần cập nhật sau; không chứa nội dung file hoặc credentials.
- Ngày 15/10/2026: cập nhật `ttsService.ts` và `ttsEdgeService.js` để tải trước/cache âm thanh; đồng bộ giới hạn API thành 1.200 ký tự với frontend mới. Build và lint thành công (còn cảnh báo có sẵn), 8 tests qua. Kiểm tra production: mở trực tiếp chương 1, phát TTS tự chuyển từ đoạn 1 đến ít nhất đoạn 4, không có cảnh báo/lỗi console trong mẫu kiểm tra; đã tạm dừng sau kiểm tra. Chưa nghe toàn bộ chương hoặc đo định lượng độ trễ giữa đoạn. Ảnh: `artifacts/web-update-2026-10-15.jpg`.

## Triển khai lần sau

Thư mục `.vercel/project.json` đã liên kết đúng project và team. Có thể dùng plugin Vercel đã kết nối hoặc CLI sau khi đăng nhập:

```powershell
npm run build
npm run lint
node --test tests/deployment-api.test.js
npx vercel@63.1.2 deploy --prod --scope vinhvt619s-projects
```

Dự án hiện được deploy trực tiếp từ thư mục local, chưa thiết lập Git integration hoặc tự động deploy theo push.

- Ngày 15/10/2026: đoạn văn chỉ có thao tác chuyển đoạn, tooltip và biểu tượng phát khi trình phát TTS đang mở cho đúng truyện/chương; đóng trình phát trả về đọc thường. Build và lint qua (còn cảnh báo có sẵn), 8 tests qua. Kiểm tra production ở viewport 390px: 48 đoạn không tương tác trước khi bật nghe; chạm đoạn không mở player; bật nghe cho chọn đủ 48 đoạn và chọn đoạn 4 chuyển đúng vị trí; đóng player bỏ thao tác chọn đoạn và chạm lại không khởi động audio; không tràn ngang, không có error/warn console trong mẫu kiểm tra. Ảnh: `artifacts/reader-audio-selection.jpg`.

- Ngày 15/10/2026: thử chuyển hai truyện sang WikiCV ở deployment `dpl_BYDHbETns3DLE22kf1GXBmC2AJjw`. Đã khôi phục domain production về `dpl_6TiCub97qcxWacfVe13uXon6jF6T` vì WikiCV chặn IP importer (Cloudflare 403/1006) sau 47 chương và Vercel không lấy trực tiếp được nội dung chưa cache. Metadata hai truyện đã khôi phục; kiểm tra production trả bundle `index-QczLGEN2.js` và API chương 100 của cả hai truyện đều HTTP 200. Phần chuyển nguồn chưa hoàn tất; source local đang chứa bản chuyển nguồn chờ dữ liệu, xem `WIKICV_MIGRATION.md` trước khi deploy.

- Đã triển khai nguồn ưu tiên Mê Truyện Chữ cho Bách Thế Cầu Tiên, giữ 722 ID chương và nội dung dự phòng có ghi nguồn. Hai truyện còn lại giữ nguồn cũ. Kế hoạch WikiCV trước đó đã dừng; source local hiện khớp cấu hình Mê Truyện Chữ đang chạy. Xem `METRUYENCHU_MIGRATION.md` và báo cáo import để biết chi tiết.

- Hoàn tất nhập Mê Truyện Chữ: 652 chương mới trên Cloud và 70 chương dự phòng, phủ đủ 722 chương. Đã tải lại thành công 3 chương lỗi HTTP 500 tạm thời. Đối chiếu Cloud không có chương thiếu ở cả hai nguồn; API production và reader/TTS/mobile qua kiểm tra. Báo cáo: `artifacts/metruyenchu-probe/cloud-coverage.json`, `deployment-report.json`, `import-report.json`; ảnh `artifacts/metruyenchu-live-mobile.jpg`.
