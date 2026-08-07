---
description: WebAuthn flow containing User Device Registration and Authentication logic over FIDO2
---

# WebAuthn Integration Skill

## Overview
WebAuthn được sử dụng trong E-Sign với mục đích duy nhất và tối thượng:
1. **Ký số (Signer Verification)**: Lớp bảo mật thứ 2 (2FA) tại thời điểm đặt bút ký. Thay thế mật khẩu hoặc mã PIN bằng cơ chế ký trên Passkey (Vân tay, FaceID, Security Key) để gắn kết cryptographic identity vào file PDF (Non-repudiation - Chống chối bỏ).

**LƯU Ý QUAN TRỌNG:** Hệ thống E-Sign KHÔNG CHO PHÉP dùng WebAuthn để Login (Đăng nhập) vào ứng dụng ngoài luồng. WebAuthn chỉ được gọi khi user ĐÃ đăng nhập (có JWT) và đang thực hiện giao dịch ký kết.

## Key Files
- **Controller**: `WebAuthnController.java` (Personal), `OrgWebAuthnController.java` (Organization)
- **Service**: `WebAuthnService.java`, `OrgWebAuthnService.java`, `WebAuthnParser.java`
- **Entity**: `UsersKeys.java`, `OrganizationKeys.java`

---

## 1. WebAuthn Registration (Đăng ký thiết bị cho User/Org)

User ĐÃ đăng nhập vào hệ thống (có JWT) sau đó có thể tích hợp Thiết bị mới (FIDO2 Token, Windows Hello, FaceID) vào Account của họ.

### Phase 1: Start Registration
- **API**: `POST /webauthn/register/start` (Yêu cầu có JWT token).
- **Backend Flow**:
  1. Lấy userId từ JWT.
  2. Tạo `challenge` ngẫu nhiên lưu vào `ConcurrentHashMap` (challengeStore).
  3. Trả về cấu trúc JSON `PublicKeyCredentialCreationOptions` theo chuẩn WebAuthn, bao gồm: `user` (id, name, displayName), `challenge`, `rp` (Relying Party - localhost/esign.com), `pubKeyCredParams`, `authenticatorSelection`.

### Phase 2: Finish Registration (Browser)
- Frontend sử dụng `navigator.credentials.create()` với options trả về từ API trên để gọi popup sinh trắc học hệ thống.
- Cặp Public/Private Key được hệ điều hành tạo ra.
- Trả về Attestation Object.

### Phase 3: Verify Registration
- **API**: `POST /webauthn/register/finish`
- **Backend Flow**:
  1. Đọc lại `challenge` gốc từ Map bằng UserID.
  2. Parse JSON trả về, validate ClientDataJSON `challenge` và `origin` hợp lệ.
  3. Lưu public key (dạng COSE bytes), `credentialId` và count vào Entity `UsersKeys` hoặc `OrganizationKeys`. Thiết bị đã đăng ký thành công.

---

## 2. WebAuthn Verification (Xác thực tại thời điểm Ký)

Mặc dù endpoint tên là `/login/start` và `/login/finish`, nhưng về mặt luồng nghiệp vụ, đây là quá trình **Verify Assertion** (Chứng thực) để xác nhận danh tính người ký, CHỨ KHÔNG PHẢI ĐỂ CẤP JWT MỚI ĐỂ LOGIN.

### Phase 1: Start Verification (Login Start)
- **API**: `POST /webauthn/login/start` 
- **Backend Flow**: 
  - Khởi tạo `challenge` lưu memory. Sinh mảng `allowCredentials` từ các keys đã đăng ký của User trong DB. Trả về options cho FE.

### Phase 2: Finish Verification (Login Finish)
- **API**: `POST /webauthn/login/finish`
- **Backend Flow (`finishAuthentication`)**: 
  - Đọc `credentialId` để check xem Khóa này thuộc User nào trong `UsersKeys`.
  - Validate tính hợp lệ của Assertion (Chữ ký sinh từ thiết bị) khớp với Public Key đã lưu.
  - Cập nhật Counter chống Replay Attack.
  - API chỉ trả về chuỗi báo "Authentication successful", cho phép hệ thống Ký số tiếp tục.
  
---

## 3. WebAuthn For Digital Signing (Tương lai)
Cơ chế ký bằng WebAuthn được trình bày chi tiết trong `signing-flow/SKILL.md`. Tuy nhiên cốt lõi nằm ở bước **Prepare** khi Backend tiêm chuỗi hash của PDF vào biến `challenge` (thay vì random byte), nên cấu trúc sinh trắc WebAuthn trả về sẽ chính thức đóng dấu ký số toàn vẹn lên Document.

## Bảo Mật:
- `rpId` (Relying Party ID) rất quan trọng và phải khớp với domain FE. (Ví dụ dùng `localhost` và môi trường dev, hoặc tên miền `.com` ở production).
- Challenges sử dụng Base64URL encoding khi trao đổi. Đừng dùng Base64 thường.
- Dữ liệu Credentials (Raw ID) được sử dụng để tra cứu ở DB phải nhất quán với `UsersKeys.credentialId`.
