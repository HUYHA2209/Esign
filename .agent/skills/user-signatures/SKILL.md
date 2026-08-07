---
description: Users' Signature/Stamp profile management, including initialization, MinIO storage, Base64 conversion, and retrieval for the Signing UI
---

# User Signatures (Stamps / Drawings) Skill

## Overview
Hệ thống cho phép người dùng lữu trữ Mẫu chữ ký (Signatures) hoặc Con dấu (Stamps) của riêng mình để tái sử dụng nhiều lần trong quá trình ký tài liệu.

## Key Files
- **Controller**: `SignatureController.java`, `OrgSignatureController.java`
- **Service**: `SignatureService.java`, `OrgSignatureService.java`
- **Entity**: `Signatures.java`, `OrganizationSignature.java`
- **Storage**: `MinioService.java`

---

## 1. Entity Architecture
### Personal Signature (`Signatures.java`)
- `userId`: Định danh user sở hữu chữ ký (Ràng buộc 1-1: Mỗi User hiện tại chỉ có 1 `Signatures` record chứa Mẫu ưu tiên nhất).
- `signatureType`: Kiểu chữ ký (`DRAW` - Vẽ tay, `TYPE` - Gõ phím, `IMAGE` - Tải ảnh lên).
- `imageUrl`: Đường dẫn lưu file trên bucket MinIO (VD: `signatures/user123_16800000.png`).
- `imageHash`: Mã băm của hình ảnh (Dùng cho kiểm tra tính toàn vẹn phụ trợ).
- `textStyle`: Font text được sử dụng (Nếu `signatureType == TYPE`).

### Organization Stamp (`OrganizationSignature.java`)
- Tương tự như cá nhân, nhưng gắn với `account` (Tổ chức) thay vì cá nhân.
- Các Account Admin có quyền quản lý mẫu chữ ký/con dấu dùng chung cho tổ chức này. Mẫu con dấu này được lưu ở bảng riêng để phục vụ kịch bản ký của doanh nghiệp.

---

## 2. API Flow

### Lưu chữ ký mới (`POST /signature`)
- Nhận Payload:
  ```json
  {
    "signatureType": "DRAW",
    "imageBase64": "data:image/png;base64,iVBORw0K...",
    "imageHash": "...",
    "textStyle": "Caveat"
  }
  ```
- **Xử lý Logic (`SignatureService.saveSignature`)**:
  1. Kiểm tra JWT user hiện tại trong `SecurityContext`. Lấy User gốc.
  2. Query `Signatures` cũ. Nếu có, gọi `MinioService.removeFile("signatures", oldImageUrl)` để xóa file ảnh cũ khỏi hệ thống giúp tiết kiệm dung lượng.
  3. Bóc tách tiền tố chuỗi gốc `data:image/png;base64,` hoặc `data:image/svg+xml;base64,`.
  4. Giải mã Base64 thành byte array.
  5. Đẩy byte array lên **MinIO** vào bucket `signatures` với định dạng tên `userId_timestamp.png`.
  6. Xây dựng hoặc Cập nhật `Signatures` model lưu vào Database.

### Lấy chữ ký (`GET /signature`)
- Trả về chữ ký hiển thị cho User trên App Frontend.
- **Xử lý Logic (`SignatureService.getSignature`)**:
  1. Lấy userId từ JWT token đang gọi API.
  2. Lấy record từ `Signatures` repo.
  3. **Presigned URL Security**: Không bao giờ trả URI MinIO gốc ra ngoài. Service gọi `MinioService.getPresignedUrl("signatures", imageUrl)` để sinh một URL tạm thời (hạn 24 tiếng) bảo vệ bucket khỏi các request nặc danh.
  4. Trả về cấu trúc cho Frontend render.

---

## 3. Frontend Integration Considerations
- Frontend khi fetch `/signature` sẽ nhận `imageUrl` dạng Pre-signed URL.
- Link URL này sẽ được đặt vào thẻ `<img src={...} />` hoặc `<canvas>`.  
- Khi Document chuẩn bị ký, Backend sẽ tự gọi nội bộ MinIO để giật file gốc về, sau đó burn (Pre-seal) lên file PDF thông qua thư viện PDFBox (chi tiết tại `PdfDocumentService.burnVisualsToPdf`).
