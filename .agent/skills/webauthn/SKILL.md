---
description: WebAuthn flow containing User Device Registration and Authentication logic over FIDO2
---

# WebAuthn Integration Skill

## Overview
WebAuthn được sử dụng trong E-Sign với 2 mục đích chính:
1. **Login**: Đăng nhập nhanh không cần mật khẩu (Passwordless) bằng Sinh trắc học/Passkeys.
2. **Ký số**: Thay thế chữ ký mã pin bằng cơ chế ký trên Passkey để gắn kết cryptographic identity vào file PDF (Non-repudiation).

## Key Files
- **Controller**: `WebAuthnController.java`
- **Service**: `WebAuthnService.java`, `WebAuthnParser.java`
- **Entity**: `UsersKeys.java`, (cộng thêm `SigningSession` bên mảng Ký Số).

---

## 1. WebAuthn Registration (Đăng ký thiết bị cho User)

User đăng nhập bình thường vào hệ thống sau đó có thể tích hợp Thiết bị mới (FIDO2 Token, Windows Hello, FaceID) vào Account của họ.

### Phase 1: Start Registration
- **API**: `POST /webauthn/register/start` (Yêu cầu có JWT token).
- **Backend Flow**:
  1. Lấy userId từ JWT.
  2. Tạo `challenge` ngẫu nhiên lưu vào Redis kèm hạn mức thời gian gắn liền với userID.
  3. Tìm kiếm những keys (`UsersKeys`) đã được gán trước đó cho user để add vào list "excludeCredentials" (tránh đăng ký trùng lặp 1 thiết bị).
  4. Trả về cấu trúc JSON `PublicKeyCredentialCreationOptions` theo chuẩn WebAuthn, bao gồm: `user` (id, name, displayName), `challenge`, `rp` (Relying Party - localhost/esign.com), `pubKeyCredParams`, `authenticatorSelection`....

### Phase 2: Finish Registration (Browser)
- Frontend sử dụng `navigator.credentials.create()` với options trả về từ API trên để gọi popup sinh trắc học hệ thống.
- Hệ điều hành tạo cặp Public Key / Private Key ở bên trong TEE (Trusted Execution Environment) của máy tính.
- Trả về Attestation Object. Cục này được forward trở lại Backend qua API Finish.

### Phase 3: Verify Registration
- **API**: `POST /webauthn/register/finish`
- **Backend Flow**:
  1. Đọc lại `challenge` gốc từ Redis bằng UserID.
  2. Dùng thư viện (như webauthn4j hoặc parser thủ công do dự án tự build - `WebAuthnParser`) để phân tích JSON trả về.
  3. Validate ClientDataJSON `challenge` và `origin` hợp lệ. Đảm bảo chống tấn công MITM.
  4. Lưu public key, `credentialId` và count của thiết bị mạng WebAuthn vào Entity `UsersKeys`. Thiết bị đã đăng ký thành công.

---

## 2. WebAuthn Authentication (Đăng nhập bằng mã sinh trắc)

### Phase 1: Start Login
- **API**: `POST /webauthn/login/start` (Hoặc có thể yêu cầu gửi lên Email trước tùy flow, hiện tại hệ thống start yêu cầu username).
- **Backend Flow**: Khởi tạo `challenge` lưu Redis, sinh mảng allowCredentials (nếu đã biết username, hoặc để trống gửi cho client tự discovery).

### Phase 2: Finish Login
- **Backend Flow (`finishAuthentication`)**: 
  - Lấy thông tin JSON trả về. Đọc `credentialId` để check xem Khóa này thuộc `User` nào.
  - Validate tính hợp lệ của Assertion (Chữ ký sinh từ thiết bị).
  - Nếu hợp lệ, sinh Authenticated Token (JWT) và Refresh Token như qua Login mật khẩu thông thường.

---

## 3. WebAuthn For Digital Signing (Ký văn bản)
Cơ chế ký bằng WebAuthn được trình bày chi tiết trong `signing-flow/SKILL.md`. Tuy nhiên cốt lõi nằm ở bước **Prepare** khi Backend tiêm chuỗi hash của PDF vào biến `challenge` (thay vì random byte), nên cấu trúc sinh trắc WebAuthn trả về sẽ chính thức đóng dấu ký số toàn vẹn lên Document.

## Bảo Mật:
- `rpId` (Relying Party ID) rất quan trọng và phải khớp với domain FE. (Ví dụ dùng `localhost` và môi trường dev, hoặc tên miền `.com` ở production).
- Challenges sử dụng Base64URL encoding khi trao đổi. Đừng dùng Base64 thường.
- Dữ liệu Credentials (Raw ID) được sử dụng để tra cứu ở DB phải nhất quán với `UsersKeys.credentialId`.
