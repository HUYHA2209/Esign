---
description: Complete Authentication flow including JWT, Refresh Tokens (Cookies), OTP Email Verification, and Workspace/Account switching.
---

# Authentication & Authorization Skill

## Overview
Hệ thống xác thực của E-Sign sử dụng JWT (JSON Web Tokens) cho Security state và Refresh Tokens lưu qua kịch bản HttpOnly Cookies để gia hạn phiên đăng nhập. Đặc biệt, flow Authentication kết hợp xác minh OTP qua Redis và chia Session theo từng Workspace (Account).

## Key Files
- **Controller**: `AuthenticationController.java`, `ForgotPasswordController.java`
- **Service**: `AuthenticationService.java`, `RedisOtpService.java`
- **Entities**: `User.java`, `Account.java`, `AccountMember.java`, `RefreshToken.java`, `InvalidatedToken.java`

---

## 1. Registration Flow (Đăng ký & OTP)

Flow đăng ký hiện tại yêu cầu xác minh email bắt buộc trước khi cấp JWT.

1. **`POST /auth/register`**:
   - Validate Domain Email thông qua `EmailDomainValidator`.
   - Lưu `User` (với `emailVerified = false`).
   - Tự động tạo 1 `Account` cá nhân (Personal) và 1 `AccountMember` (quyền ADMIN).
   - Gọi `RedisOtpService` để sinh mã OTP 6 số lưu vào Redis (TTL hạn mức).
   - Gửi Email chứa mã OTP cho người dùng qua `EmailService`.
   - *Không* trả về JWT lúc này.

2. **`POST /auth/verify-email`**:
   - Nhận `email` và `otp`. So khớp với Redis.
   - Nếu đúng, update `emailVerified = true`.
   - Trả về `AuthenticationResponse` kèm JWT (`token`) và Cookie chứa `refreshToken`.

3. **`POST /auth/resend-otp`**: Dùng khi OTP cũ hết hạn hoặc thất lạc.

---

## 2. Login Flow

1. **`POST /auth/login`**:
   - So khớp Password (Bcrypt).
   - Kiểm tra `user.isEmailVerified()`. Hiện tại nếu chưa verify, hệ thống sẽ tự động cấp OTP mới và throw lỗi `EMAIL_NOT_VERIFIED` để FE điều hướng sang trang xác minh OTP.
   - Nếu thành công, tìm `AccountMember` với loại `PERSONAL`.
   - Sinh JWT Access Token (hạn 3h) chứa các subject: `userId`, `accountId`, `scope` (Role), `type` (Account Type).
   - Lưu `RefreshToken` (hạn 7 ngày) vào bảng DB và set qua HTTP Header `Set-Cookie`.

---

## 3. JWT & Refresh Token Architecture

### Access Token (JWT)
- **Thuật toán**: `HS512` dùng MAC Signer (`SIGN_KEY`).
- **Claims (Payload)**:
  - `sub`: userId
  - `jti`: UUID (JWT ID) dùng để logout/invalidate.
  - `accountId`: Phiên đăng nhập thuộc Workspace nào.
  - `scope`: Role trong account đó.
- Cấp qua body JSON: `token`.

### Refresh Token (Cookie)
- **Token**: UUID ngẫu nhiên.
- **Lưu trữ**: DB bảng `REFRESH_TOKEN` chứa `token`, `userId`, `accountId`, `exprityDate`, `revoked`.
- Gửi cho Client không thông qua body mà thông qua **Set-Cookie** (Bảo vệ XSS). Khi `/auth/refresh` thì sẽ trích từ HTTP Cookie.
- **Endpoint `POST /auth/refresh`**: Kiểm tra token trong DB, nếu không bị revoke và còn hạn, revoke token cũ và sinh cặp JWT + Refresh Token mới.

---

## 4. Workspaces (Account Switch)

Hệ thống E-Sign cho phép 1 User tham gia vào nhiều Account (Công ty/Cá nhân). Token đại diện cho phiên làm việc hiện tại của **1 Account duy nhất**.

- Khởi tạo mặc định: Đăng nhập luôn vào `PERSONAL` Account.
- **Cơ chế chuyển đổi (Switch User)**:
  - **`GET /auth/workspace`**: Trả danh sách toàn bộ Accounts mà user là member.
  - **`POST /auth/workspace`**: Lấy `accountId` cần switch. Backend tìm kiếm member, cập nhật và Generate lại JWT mới + Refresh Token mới với `accountId` và `scope` mới của Workspace đó.

---

## 5. Logout Flow
1. Cần truyền vào `token` (JWT) hiện tại thông qua Body.
2. Filter lấy `refreshToken` qua Cookie.
3. Chặn JWT hiện tại: Lưu ID (JTI) của JWT hiện tại vào bảng `INVALIDATED_TOKEN`. Ở các request sau, interceptor sẽ check bảng này.
4. Đánh dấu `revoked = true` cho refresh token trong DB.
5. Set HTTP Header xóa cookie refresh token.

---

## Rate Limiting Security
Authentication endpoints được bảo vệ bởi `RateLimitService` chống Brute-force & Spam:
- Login: 5 lần/phút/IP (hoặc email).
- Khởi tạo Register: 3 lần/giờ/IP.
- Verify OTP: 5 lần/email.
- Resend OTP: 3 lần/5 phút/email.
