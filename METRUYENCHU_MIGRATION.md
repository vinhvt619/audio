# Nguồn Mê Truyện Chữ cho Muôn Đời Cầu Tiên

Chỉ `bach-the-cau-tien` đổi nguồn ưu tiên sang https://metruyenchu.com.vn/muon-doi-cau-tien. Mỗi Ngày Một Quẻ và Đế Bá tiếp tục dùng thư viện hiện có; không gọi WikiCV.

## Cách hoạt động

- Giữ 722 ID chương hiện tại, tiến độ và file audio riêng.
- Nguồn mới đánh số thêm thông báo “về thượng giá” ở mục 101. Catalog bỏ mục này: chương ứng dụng 1–100 tương ứng 1–100 nguồn; từ chương ứng dụng 101 tương ứng số nguồn +1. Chương ứng dụng 515 tương ứng chương nguồn 516 “Chí Tôn Hội”.
- Website nguồn liệt kê 654 mục. Có 652 chương được ánh xạ tới nội dung nguồn mới. Chương nguồn 654 (chương ứng dụng 653) đã kiểm tra là trống. 70 chương cuối/phần trống dùng bản đã lưu, với nhãn và thông báo rõ ràng trong reader.
- Nội dung mới lưu riêng ở `chapterSourceCache`, khóa theo truyện/chương/version, không ghi đè collection `chapters`.
- Server thử nguồn mới khi chưa có cache. Nếu nguồn không tải được, reader hiển thị bản đã lưu với nhãn tương ứng. Sau 403/429, function ngừng thử nguồn trong 15 phút. Importer dừng ngay nếu gặp 403/429.
- Vercel chưa lấy trực tiếp được chương chưa cache trong lần kiểm tra. Vì vậy nội dung được nhập từ máy vào Cloud. Importer tuần tự, nghỉ giữa các lượt; có thể tiếp tục từ chương đã cache.
- Nội dung cache cũ không được nhận nhầm là nguồn mới. Khi online, chương dự phòng được kiểm tra lại qua API; khi offline vẫn đọc bản đã lưu. Cache dự phòng phía server hết hạn thử lại sau một giờ.

## Công cụ

- `scripts/prepare-metruyenchu.mjs`: đọc 7 trang mục lục, đối chiếu thông báo 101 và sinh catalog; ưu tiên snapshot có sẵn.
- `scripts/import-metruyenchu.mjs`: nhập các chương đã ánh xạ vào Cloud, không hiển thị credentials; bỏ qua cache nguồn mới hợp lệ.
- `scripts/warm-metruyenchu.mjs`: kiểm tra một số chương đại diện và phần dùng bản lưu.
- `scripts/verify-metruyenchu-deployment.mjs`: xác nhận API production, nguồn thực tế, ánh xạ 515→516 và hai truyện còn lại.
- Báo cáo nhập: `artifacts/metruyenchu-probe/import-report.json`.

## Triển khai và kiểm tra

Production: `dpl_Gpj3zH3A8kiQtPbEmQZGE1xDwCfx` tại https://audioread-beta.vercel.app.

Build qua, lint không có lỗi chặn (còn warnings có sẵn), 21 tests qua. API chương 1, 2, 515 đọc nguồn mới; 653, 654 và 722 dùng bản đã lưu và vẫn có nội dung. Reader 390px không tràn ngang. TTS từ nội dung mới tự chuyển từ đoạn 1 tới 9, chọn đoạn 6 được; đóng player tắt thao tác chọn đoạn. Reader chương 653 hiển thị nhãn bản đã lưu và thông báo nguồn trống. Không có error/warn console trong mẫu kiểm tra.

Đã nhập hoàn tất và đối chiếu Cloud: 652 chương nguồn Mê Truyện Chữ, 70 chương từ bản đã lưu, tổng 722 chương; không có chương thiếu nội dung ở cả hai nguồn. Ba lỗi HTTP 500 tạm thời tại chương ứng dụng 204, 501, 613 đã tải lại thành công. API production đã kiểm tra các chương này cùng chương 652, 653, 654 và 722. Hai truyện còn lại vẫn đọc được. Log error/fatal production trong cửa sổ 10 phút không có bản ghi tại thời điểm kiểm tra. Ảnh: `artifacts/metruyenchu-live-mobile.jpg`.
