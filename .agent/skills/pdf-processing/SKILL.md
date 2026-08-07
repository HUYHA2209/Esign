---
description: PDF Processing Architecture, covering general MinIO storage, pre-sealing (PDFBox text/image drawing) and PAdES Platform sealing (BouncyCastle cryptographic signing)
---

# PDF Processing & Storage Component Skill

## Overview
Luồng xử lý PDF là trái tim Core của ứng dụng E-Sign. Phân đoạn này chịu trách nhiệm cho vòng đời vật lý của file PDF, bao gồm: Lưu trữ phân tán, vẽ các trường thao tác (Visuals Burning), chèn trang Audit Log và niêm phong mật mã kỹ thuật số.

## Key Files
- **Storage**: `MinioService.java`
- **Visuals/Pre-sealing**: `PdfDocumentService.java`
- **Cryptographic Sealing**: `PdfSealingService.java`

---

## 1. MinIO Storage Integration
Thay vì lưu public trên ổ đĩa, file được đưa qua MinIO (S3-compatible Object Storage):
- **Upload (`uploadFile`)**: Lấy `InputStream` từ `MultipartFile` và đưa lên Bucket. (Document thường được bỏ vào bucket `esign-documents`, Signature bỏ vào `signatures`).
- **Download/Read (`downloadFile`)**: Mở InputStream để Backend tải File vào vùng nhớ RAM chuẩn bị xử lý.
- **Presigned URLs (`getPresignedUrl`)**: Cho phép FE truy cập/view Document mà không cần credential trong một khoảng thời gian giới hạn (thường 24h).

---

## 2. PdfDocumentService (Pre-sealing & Visual Engine)

Thư viện sử dụng: `Apache PDFBox 3.x`. Xử lý thuần tuý thao tác vẽ và chèn ghép layout.

### A. Hàm `burnVisualsToPdf` (Gắn kết ảnh & text nháp lên File gốc)
Được gọi trong quá trình Prepare WebAuthn Signing (`POST /signning/prepare`).
- Nhận Request là `fieldValues` do người dùng điền trên UI Frontend.
- Download PDF gốc và Mẫu chữ ký `.getSignature()`.
- Load danh sách `SignatureField` thuộc về tài liệu này có nằm trong Database.
- Quét qua từng toạ độ X, Y (Cần phải translate do lưới toạ độ Web và lưới toạ độ thư viện PDF thiết kế khác nhau: Trục Y của Web từ trên xuống dưới, còn Trục Y của PDFBox từ góc trái dưới lên trên).
  - Thuật toán chuyển đổi: `PDF_Y = pageHeight - FE_Y - fieldHeight`.
- Dùng `PDPageContentStream` vẽ Ảnh hoặc ghi Text lên các Toạ độ đó. Lưu file dạng tạm (`temp-preseal.pdf`).
- Sinh ra `MessageToSignHash`. Đây là bản chất của WebAuthn Pre-sealing Binding.

### B. Hàm `appendAuditLogPage` (Giấy chứng nhận chữ ký)
- Code đang được draft, chờ Database `AuditTrail` hoàn thiện để chèn.
- Nó sẽ nối thêm 1 `PDPage` trắng vào cuối tài liệu.
- Chèn chi tiết về Transaction (DocumentID, Signer Email/IP, WebAuthn ID, Hashes trước kí).

---

## 3. PdfSealingService (Platform Sealing PAdES)

Thư viện sử dụng: `BouncyCastle (bcpkix, bcprov)` và `PDFBox Digital Signature`.

Vị trí được gọi: Tại hành động `POST /signning/complete` - Bước xác minh hoàn tất của WebAuthn.
Mục tiêu pháp lý: Bản PDF do E-Sign xuất ra phải chứa chứng chỉ đáng tin cậy. (Phần này sẽ hiện mảng tick xanh "Signature Valid" trên phần mềm Adobe Reader).

**Các công đoạn xử lý (Advanced Crypto):**
1. Load chứng thư số hệ thống (`server-keystore.p12`) từ Resource với Keystore pass. Root Key này đại diện pháp lý cho nền tảng E-Sign.
2. Khởi tạo Không gian rỗng (Hollow Space): Mở file PDF từ bản Pre-sealed byte, thêm vào một cấu trúc Data Dictionary tên `PDSignature` kiểu cấu hình `PKCS7_DETACHED`.
3. Băm (Hash) nội dung PDFBox theo trật tự byte range (loại bỏ vùng rỗng).
4. Dùng thuật toán `SHA256withRSA` qua BouncyCastle CMS tạo khối dữ liệu được niêm phong `CMSSignedData`.
5. Bơm thẳng Byte khối nén mật mã CMS ngược vào vùng không gian rỗng nãy (với padding số không "0" cho vừa khớp kích thước cấp phát).
6. Result: Bản PDF cuối cùng đã khóa lại (Bất kỳ ký tự nào thay đổi sau bước này sẽ bị báo Tampering/Invalid).

## Vấn đề cần lưu ý (Gotchas)
- Khi dùng PDFBox, `PDDocument` nên được đưa vào vòng Try-with-resources để phòng ngừa kẹt bộ nhớ (Memory leak rò rỉ File handles).
- Khi set `options.setPreferredSignatureSize(...)` bên BouncyCastle Sealing, nếu Certificate Server của bạn quá dài hoặc dùng cấp độ khoá 4096 RSA, bạn phải tăng size cấp phát không gian rỗng (default đang là x2 `DEFAULT_SIGNATURE_SIZE`, nếu chưa đủ phải tăng thêm).
- Kích thước file PDF sẽ phình to ra một ít so với gốc do phải ôm thêm khối chứng thư số `.p12` và Certificate Authorities (CA Chain) bên trong.
