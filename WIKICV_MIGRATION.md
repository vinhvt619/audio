# Chuyển hai truyện sang WikiCV

**Trạng thái mới:** kế hoạch WikiCV đã dừng. Người dùng chọn Mê Truyện Chữ cho Muôn Đời Cầu Tiên; xem `METRUYENCHU_MIGRATION.md`. Các ghi chú bên dưới mô tả lần thử WikiCV trước đó, không phải cấu hình production hiện tại.

Yêu cầu: đổi Bách Thế Cầu Tiên và Mỗi Ngày Một Quẻ sang hai URL WikiCV người dùng cung cấp; giữ Đế Bá.

## Trạng thái 15/10/2026

**Chưa hoàn tất chuyển nguồn trên production.** WikiCV chặn IP nhập dữ liệu bằng Cloudflare HTTP 403, Error 1006. Đã dừng importer. Vercel cũng không tải trực tiếp được chương từ WikiCV trong lần kiểm tra này.

Đã khôi phục production về `dpl_6TiCub97qcxWacfVe13uXon6jF6T` và khôi phục metadata hai truyện từ backup. Bản thử chuyển WikiCV `dpl_BYDHbETns3DLE22kf1GXBmC2AJjw` vẫn được giữ để kiểm tra; không còn phục vụ domain production.

Đã nhập thành công 47 chương vào collection riêng `wikiChapterCache`, không xóa/ghi đè nội dung cũ trong `chapters`. Báo cáo: `artifacts/wiki-source/import-report.json`. Backup metadata: `backups/wiki-stories-before-1792002179466.json`.

Ở thời điểm thử WikiCV, source local chứa bản chuyển chưa đủ dữ liệu nên chưa được giữ trên production. Cấu hình active hiện tại đã chuyển sang Mê Truyện Chữ; dữ liệu và parser WikiCV chỉ được giữ làm lịch sử/tham khảo.

## Phần đã chuẩn bị

- Mục lục chính xác: 723 chương Bách Thế Cầu Tiên, 509 chương Mỗi Ngày Một Quẻ. Bỏ thông báo không đánh số để không làm lệch chương.
- ID truyện/chương giữ nguyên, tiến độ và audio riêng không bị xóa.
- Parser giữ đoạn văn, bỏ tiêu đề lặp và chrome trang; từ chối trang đăng nhập, nội dung trống, lỗi mã hóa.
- Cache phân biệt nguồn/version/URL, không để nội dung nguồn cũ bị nhận nhầm là WikiCV.
- API production và Vite dùng cùng nguồn; chỉ cache nội dung được xác thực từ danh sách URL cố định.
- Reader/mục lục có liên kết ghi nguồn WikiCV.
- Script nhập có thể tiếp tục từ cache đã có và dừng ngay nếu nguồn từ chối truy cập.

Chương 281 của Mỗi Ngày Một Quẻ đã xác nhận lỗi mã hóa ngay trên nguồn. Tiêu đề 281–290 cũng bị hỏng; mục lục hiển thị số chương thay cho tiêu đề lỗi. Chưa xác minh hết nội dung 282–290.

## Kiểm tra

Build qua; lint không có lỗi chặn (còn warning trong code hiện có); 14 tests qua. Chương 1, 515, 723 của Bách Thế và 1, 509 của Mỗi Ngày tải được từ WikiCV; bản thử Vercel đọc các chương mẫu đã cache và khớp toàn bộ nội dung mẫu. Đã kiểm tra giao diện, nghe/chuyển đoạn, mở chương 515 và mục lục 723 chương.

## Hoàn tất khi có dữ liệu

Ưu tiên nhận TXT/EPUB xuất từ WikiCV của người dùng hoặc đợi nguồn cho phép truy cập lại. Không tìm cách vượt chặn IP. Sau khi nhập đủ cache hợp lệ, kiểm tra lại API và giao diện rồi deploy source local. Không tự động bỏ lỗi nguồn hoặc lấy bản khác giả làm WikiCV.
