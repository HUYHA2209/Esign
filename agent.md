# E-Sign Project: AI Agent Context

Tệp này đóng vai trò là kim chỉ nam (**Context**) về kiến thức, cấu trúc và logic nghiệp vụ của dự án E-Sign. Bất cứ khi nào Agent làm việc với dự án này, hãy đọc kỹ các nguyên tắc dưới đây.

## 1. Cấu trúc Dự án (Stack)
- **Backend**: Spring Boot (Java) nằm ở `e:\Esign-project\esign_backend\esign`. Dùng JPA/Hibernate. CSDL MySQL.
- **Frontend**: React (Vite, TailwindCSS) nằm ở `e:\Esign-project\esign_frontend`. Gọi API qua Axios.

## 2. Các Quy Tắc Nghiệp Vụ Quan Trọng
Dự án được thiết kế dưới dạng ứng dụng **ký tài liệu điện tử nội bộ** bảo mật cao (sử dụng **WebAuthn**, hoàn toàn không liên kết với CA hay bên thứ 3).

### a. User & Quyền ký
- **Hệ thống nội bộ**: Mọi email được thêm vào danh sách người nhận (Signer) **BẮT BUỘC** phải tồn tại trong bảng `User` của hệ thống. 
- Khi lưu bản nháp (Draft) hoặc Gửi (Send), Backend sẽ auto query map qua `userRepository.findByEmailIn(...)` để móc nối `User.id` vào `DocumentSigner`. Bất kỳ email lạ nào cũng sẽ bị văng `AppException(ErrorCode.USER_NOT_EXISTED)`.

### b. Lưu trữ File & Chữ ký (MinIO)
- **KHÔNG LƯU ẢNH BẰNG BASE64 TRONG DATABASE**.
- Ảnh chữ ký (`Signatures`) và file tài liệu (`Document`) được upload hoàn toàn qua **MinIO** bằng `MinioService`.
- Backend lưu chuỗi đường dẫn tệp (Object Key `imageUrl`), còn Frontend luôn fetch file qua Pre-signed URL được cấp tự động từ Backend (có thời hạn 24h).

### c. Luồng Ký (Signing Flow) & Phân Quyền
Có 2 chế độ (`SigningMode`):
- **PARALLEL** (Song song): Người dùng nhận được tài liệu là có thể vào ký ngay. Mặc định nếu không "bật thứ tự ký".
- **SEQUENTIAL** (Tuần tự): Kích hoạt khi "Bật thứ tự ký" (enableSigningOrder = true). Người dùng ở `signing_order` sau **KHÔNG ĐƯỢC PHÉP** mở tài liệu nếu người ở `signing_order` trước chưa ký xong. Kể cả truy cập API trực tiếp cũng sẽ bị chặn bởi Exception `ErrorCode.NOT_YOU_TO_SIGN`.

## 3. Kiến trúc Luồng Dữ Liệu (Entities)
Các quan hệ dữ liệu cốt lõi hình thành nên phiên ký:

1. **DocumentGroup**: Đại diện cho 1 lô tài liệu (Batch) được tạo trong 1 phiên. GroupStatus: `DRAFT`, `PENDING`, `COMPLETED`...
2. **Document**: File PDF gốc tương ứng trực tiếp chứa URI file trên MinIO.
3. **DocumentSigner** (Người ký trên tài liệu):
   - Móc nối giữa `Document` và `User`.
   - Chứa thông tin vị trí ký (`signing_order`, `Thuộc tính signing_mode`).
   - Có cờ thời gian gửi (`sentAt`) khi tài liệu chuyển từ DRAFT -> PENDING.
4. **SignatureField**: Quản lý Data Render PDF. Tọa độ (X, Y, Width, Height) và số trang của khung chữ ký. Gắn trực tiếp vào `DocumentSigner`.
5. **SigningSession** / **SignaturePrepare**: Quản lý Challenges và Context của WebAuthn cho quá trình xác nhận khóa công khai/bí mật của trình duyệt.
6. **AuditTrail**: Nhật ký hệ thống. Sau mỗi bước ký của bất kỳ signer nào, hệ thống phải mã hóa và lưu trữ Document Hash (Trạng thái văn bản lúc đó) để chống chối bỏ.

## 4. Các File Thường Xuyên Sửa Đổi
Trong quá trình code, hãy lưu ý:
- **`DocumentService.java`**: Trái tim của hệ thống. Chứa loigc tạo Draft, gửi đi, phân nhóm. Rất dài (hơn 700 dòng), cần debug cẩn thận các lỗi `NullPointerException` hoặc Variable Shadowing.
- **`DocumentEditor/index.jsx`** & **`ReceivedDocuments/index.jsx`**: Nơi đảm nhiệm UI cho người chuẩn bị tài liệu (Editor) và người xem/ký (`SignContent`). Quản lý state hook phức tạp.

## 5. Coding Convention
- Ưu tiên tối ưu query (Bulk Data / `IN` queries) để tránh lỗi N+1 Hibernate.
- Form field Frontend được binding vào React state, không sửa logic DnD (Mảng `react-pdf` canvas).
- Sử dụng Custom Error Codes (từ `ErrorCode.java`) thay vì HttpStatus chung chung. Front-end sẽ trực tiếp parse `err.response?.data?.message` để push thông báo lên Toast/UI.
