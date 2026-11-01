# Sửa lỗi player trên điện thoại

## Nguyên nhân và thay đổi

- Player cũ đặt metadata, năm nút playback và các công cụ trên cùng một hàng flex, làm các cụm lấn nhau trên màn hình hẹp.
- Dưới 1024px, bố cục mới dùng hai hàng: metadata/công cụ phía trên, playback/tiến độ phía dưới. Các nút playback và công cụ có vùng chạm tối thiểu 44px. Tiêu đề được rút gọn, nhãn mode không xuống dòng.
- Menu tốc độ, hẹn giờ và giọng đọc bám theo chiều rộng viewport và nằm phía trên player. Escape đóng menu.
- ResizeObserver đo chiều cao player để thư viện, chi tiết và reader chừa khoảng cuối trang; có thêm safe area ở đáy màn hình.
- Chương 515 của Bách Thế Cầu Tiên có 12.127 ký tự, không có xuống dòng. Helper `splitReadingParagraphs()` được dùng chung trong reader, AudioContext và player; chia nội dung này thành 23 đoạn, lớn nhất 598 ký tự, không mất chữ. Nội dung Cloud và cache gốc không bị viết lại.
- Nội dung dùng CRLF, LF hoặc CR đều tách đoạn được. Đoạn dài được chia theo câu hoặc từ.

## Kiểm tra

- Build thành công; lint không có lỗi chặn, còn cảnh báo có sẵn.
- 7 bài kiểm tra qua, gồm bảo vệ API và bảo toàn nội dung khi chia đoạn.
- Kiểm tra chương 515 tại 320, 360, 390, 414, 768 và 1280px: ba cụm player nằm trong viewport, không chồng nhau. Menu giọng đọc vừa màn hình 320px.
- Production deployment: `dpl_ngE7u53i4KybTYCVJUhK51qu2KBb`.
- Không viết lại nội dung chương trên Cloud, thông tin đăng nhập hoặc cấu hình Deployment Protection trong lần cập nhật này.
- Đã xác minh bản production tại địa chỉ công khai: chapter 515 có 23 đoạn, player cao 161px ở viewport 390px, ba cụm không chồng lấn và trang không tràn ngang. Ảnh: `artifacts/mobile-player-fixed.jpg`.

## Nhận bản cập nhật

Mở https://audioread-beta.vercel.app và tải lại trang. Không cần xóa dữ liệu trình duyệt; phần tách đoạn cũng áp dụng với chương đã cache trước đó.
