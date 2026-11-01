# Kế hoạch chỉnh sửa AudioRead để giao cho Gemini

## Yêu cầu chung

Hãy cải thiện dự án React + TypeScript hiện tại theo các giai đoạn dưới đây. Giữ phong cách tím indigo, giao diện tiếng Việt và chức năng đọc/nghe. Đọc lại mã hiện tại trước khi sửa vì dự án có thể đang được cập nhật. Không xóa dữ liệu người dùng, không reseed hoặc thay đổi cấu hình Cloud để kiểm thử. Không mở rộng sang tài khoản, thanh toán hay tính năng ngoài phạm vi này.

Đánh giá này dựa trên giao diện desktop đang chạy tại localhost:5173 và mã nguồn. Các lỗi logic nêu dưới đây được nhận diện qua mã, chưa tái hiện toàn bộ bằng thao tác ghi dữ liệu. Kiểm tra mobile bằng công cụ trình duyệt chưa đủ tin cậy để kết luận bố cục thực tế; cần kiểm thử lại đúng kích thước ở giai đoạn nghiệm thu.

## Giai đoạn 1 — An toàn dữ liệu và tiếp tục đọc (ưu tiên cao nhất)

### 1. Bỏ việc xóa dữ liệu cục bộ khi đọc danh sách Cloud

- `src/services/dataService.ts`: `getStoriesList()` đang gọi `clearLocalDb()` khi Cloud trả về truyện. Hàm này xóa cả bảng stories và chapters.
- Thay bằng chiến lược cập nhật/đối chiếu theo ID, bảo toàn truyện nhập riêng, chương chưa đồng bộ và liên kết audio. Việc lấy danh sách không được ngầm xóa dữ liệu.
- Phân biệt dữ liệu đã đồng bộ, dữ liệu chỉ có trên máy và thay đổi chờ đồng bộ; định nghĩa quy tắc xử lý xung đột trước khi viết logic merge.
- Kiểm tra `res.ok` ở các thao tác ghi/xóa; HTTP 4xx/5xx phải báo lỗi, không coi là thành công. Chỉ hiển thị đã đồng bộ khi thao tác ghi thành công.
- Kiểm tra cả luồng thêm chương/nhập truyện khi Cloud đang hoạt động: dữ liệu hiện có luồng ghi Dexie nhưng luồng đọc ưu tiên Cloud.

Nghiệm thu: lấy danh sách Cloud không làm mất truyện/chương chỉ có trên máy; lỗi mạng và HTTP 500 có phản hồi rõ; đọc được nội dung đã lưu khi offline.

### 2. Chuẩn hóa lưu và khôi phục tiến độ

- `src/views/ReaderView.tsx` ghi localStorage với `lastReadChapterId`, `lastReadProgress`, `lastReadTime`; `src/App.tsx` lại đọc `chapterId`, `progress`, `time`. Dùng chung kiểu dữ liệu và helper đọc/ghi, hỗ trợ dữ liệu cũ nếu cần.
- Effect lưu tiến độ hiện không phụ thuộc `readProgress`, nên cuộn không cập nhật bản ghi. Lưu có throttle/debounce và flush khi đổi chương, rời trang hoặc document chuyển sang hidden; không gửi một request cho từng scroll event.
- Đặt lại tiến độ khi đổi chương, đo trên vùng nội dung đọc, xử lý chương ngắn không có thanh cuộn. Khôi phục vị trí sau khi nội dung tải và bố cục ổn định.
- Khi quay lại tủ sách/chi tiết, cập nhật state để thẻ Đọc tiếp và chương gần nhất hiển thị ngay.
- Khi tải nội dung chương bất đồng bộ, bỏ qua phản hồi cũ nếu người dùng đã chuyển chương; xóa nội dung chương trước, có trạng thái lỗi và nút thử lại.

Nghiệm thu: đọc đến khoảng 50%, quay ra, mở lại hoặc refresh vẫn vào đúng truyện, chương và gần vị trí cũ. Chuyển chương nhanh không hiển thị nhầm nội dung.

### 3. Làm đúng dữ liệu và điều hướng chương

- `src/views/StoryDetailView.tsx`, `src/services/chapterService.ts`: trang đang hiện Hoàn thành 722/722 nhưng vẫn cho tải thêm 50 chương. Tách trạng thái hoàn thành của tác phẩm, tổng chương nguồn và số chương đã có trong thư viện.
- Chỉ cho tải thêm khi còn chương, giới hạn số lượng theo phần còn thiếu. Tính chương kế tiếp từ index lớn nhất hoặc danh sách chương thiếu, không dùng `chapters.length + 1` khi index có khoảng trống.
- Dùng số tải thành công thực tế do `syncBatchChapters()` trả về; không báo thành công thêm 50 nếu chỉ tải được một phần.
- `loadChapters()` nên trả danh sách mới để luồng nhảy chương truyền đúng dữ liệu, tránh dùng state cũ sau `setState`.
- Hiển thị loading/error/empty riêng cho danh sách chương; không chớp “0 chương” như trạng thái đã tải xong.
- `src/App.tsx`, `src/components/Navbar.tsx`: nút mở chương đang phát phải lấy story/chapter từ AudioContext. Thêm URL cho thư viện, chi tiết và chương đọc để Back/Forward, refresh, mở link hoạt động đúng.

Nghiệm thu: truyện đủ chương không đề nghị tải vượt nguồn; nhảy chương đúng; nút đang phát mở đúng truyện khi đang xem truyện khác; refresh và Back/Forward giữ ngữ cảnh.

## Giai đoạn 2 — Tủ sách và trang chi tiết

### 4. Sắp xếp lại thứ bậc giao diện

- `src/components/Navbar.tsx`, `src/views/LibraryView.tsx`: hợp nhất Thêm truyện và Nhập file TXT / EPUB vì đều mở cùng modal. Giữ một CTA chính, bên trong có nhập TXT, EPUB và tạo thủ công.
- Đưa tiêu đề Tủ sách, số tác phẩm và hành động chính về một cụm rõ ràng; đặt tìm kiếm và bộ lọc ngay bên dưới.
- Đổi Cloud Atlas thành nhãn dễ hiểu như Lưu trữ/Đồng bộ; đưa cấu hình MongoDB vào phần cài đặt nâng cao. Trạng thái kết nối và trạng thái đồng bộ cần phân biệt.
- Thẻ truyện: tiêu đề tối đa 2 dòng, chừa chiều cao đồng đều; tác giả dễ đọc; mô tả 2 dòng; ảnh có fallback và lazy loading. Có thể giữ ảnh ngang hiện tại để tránh làm thẻ quá cao.
- Bộ lọc: tách thể loại và tag thay vì lấy nguyên chuỗi “Tiên Hiệp • Cẩu Đạo • Hệ Thống” thành một loại độc lập. Chuẩn hóa dữ liệu mà vẫn tương thích truyện đã nhập.
- Phân biệt tủ sách trống với không có kết quả tìm kiếm. Khi không có kết quả, hiển thị Xóa bộ lọc, giữ từ khóa người dùng và không gợi ý nạp lại truyện mẫu như giải pháp tìm kiếm.
- Trang chi tiết: ưu tiên Đọc/Đọc tiếp và Nghe/Nghe tiếp. Gom Thêm chương, Gắn MP3, Cập nhật số chương vào khu vực quản lý để giảm số nút cạnh tranh.
- Với hàng trăm/nghìn chương, phân trang hoặc virtualize danh sách; vẫn tìm kiếm và nhảy tới chương ngoài trang đang hiển thị được.

Nghiệm thu: tên truyện dài dễ nhận biết hơn; hành động thêm truyện không lặp; tìm không thấy có thể xóa lọc; danh sách 1.500 chương cuộn và tìm kiếm mượt.

## Giai đoạn 3 — Mobile, trình đọc, trình phát và khả năng truy cập

### 5. Mobile và đọc lâu

- Navbar hiện dùng `hidden md:block` cho tìm kiếm: bổ sung ô tìm kiếm dưới header trên mobile.
- Tăng vùng chạm nút lên khoảng 44px, tránh header tràn khi có nút đang phát; kiểm tra tên truyện/chương dài.
- Bìa trang chi tiết hiện `w-full` dưới breakpoint sm: thu nhỏ bìa trên điện thoại để hành động Đọc/Nghe xuất hiện sớm hơn.
- Player mobile gọn: tên chương, trước/phát/sau; tốc độ, giọng đọc, hẹn giờ nằm trong bảng mở rộng. Chừa khoảng dưới nội dung theo chiều cao player và safe area.
- Trong reader, thao tác chạm đoạn văn hiện tự phát TTS: thêm lựa chọn bật/tắt hoặc nút nghe riêng để việc chọn/sao chép chữ không vô tình phát tiếng.
- `index.html`: bỏ `maximum-scale=1.0, user-scalable=no` để người dùng có thể phóng to.

### 6. Accessibility và phản hồi thao tác

- Dùng button/link đúng ngữ nghĩa cho logo, thẻ truyện và điều hướng; tránh div chỉ có onClick. Không lồng button bên trong button/link khác.
- Các nút icon có accessible name; input có label; focus bàn phím rõ.
- Modal/drawer có role dialog, aria-modal, tiêu đề, giữ focus trong hộp thoại, Escape để đóng, trả focus và khóa cuộn nền.
- Quy định thứ tự lớp phủ để audio player không che modal/drawer; hỗ trợ reduced motion.
- Thay alert/confirm thường gặp bằng phản hồi trong giao diện; giữ xác nhận cho thao tác xóa và nói rõ phạm vi xóa local/Cloud.

## Quy trình triển khai và kiểm tra

1. Làm giai đoạn 1 trước, chia thành các thay đổi nhỏ có thể review. Sau đó mới làm giai đoạn 2 và 3.
2. Kiểm tra ở 360px, 390px, 768px và 1440px; không tràn ngang, tìm kiếm mobile dùng được, player không che nút/chữ.
3. Kiểm thử dữ liệu mới và dữ liệu cũ, local-only, Cloud, offline, HTTP 500, chương thiếu và chuyển chương nhanh. Dùng dữ liệu thử riêng, không xóa hoặc reseed thư viện thật.
4. Viết test tập trung cho các lỗi có thể tái diễn: tương thích schema tiến độ, bảo toàn local khi đọc Cloud, xử lý HTTP lỗi, tải một phần và chọn đúng chương đang phát.
5. Chạy `npm run build`, `npm run lint`; phân biệt lỗi có sẵn với lỗi mới. Kiểm tra UI thực tế và báo các hạn chế còn lại.
6. Bàn giao danh sách file đổi, hành vi trước/sau, kết quả kiểm thử và ảnh desktop/mobile. Không tuyên bố đã kiểm thử audio hoặc offline nếu chưa thực hiện.
