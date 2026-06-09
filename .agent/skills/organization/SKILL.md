---
description: Organization and Workspace Management including Accounts, Account Members, and Role-Based Permissions
---

# Organization & Workspace Management Skill

## Overview
Hệ thống E-Sign hỗ trợ kiến trúc Multi-Tenancy (Một user có thể thuộc nhiều không gian làm việc khác nhau). Các không gian làm việc này được gọi là `Account` (có 2 loại: `PERSONAL` và `ORGANIZATION`).

## Key Files
- **Controller**: `OrganizationController.java`
- **Service**: `OrganizationService.java`
- **Entities**: `Account.java`, `AccountMember.java`
- **API Flow switch workspace**: `AuthenticationController.switchAccount`

---

## 1. Entity Architecture

### `Account` (Workspace)
Đại diện cho 1 tổ chức hoặc 1 không gian cá nhân.
- **AccountType**: `PERSONAL` (Cá nhân, được tạo tự động khi đăng ký), `ORGANIZATION` (Tổ chức/Doanh nghiệp).
- **Owner**: `User` đóng vai trò là chủ sở hữu gốc (người thanh toán phí/sở hữu resource).

### `AccountMember` (Membership & Permissions)
Liên kết n-n giữa `Account` và `User`, nhưng có tính duy nhất (1 user chỉ có 1 member profile trong 1 account).
- **Role**: `ADMIN`, `MEMBER`, `MANAGER`...
- **Permissions (RBAC vi mô)**:
  - `canUpload`: Quyền tải lên tài liệu mới.
  - `canSign`: Quyền ký tài liệu nội bộ.
  - `canViewDocs`: Quyền xem các tài liệu của Tổ chức.
  - `canInvite`: Quyền mời người khác vào Tổ chức.
- **Lưu ý**: Các permission này hiện được lưu theo dạng boolean config (feature flags) trên từng bảng mapping cá nhân. Người tạo (Owner/Admin) mặc định có tất cả quyền (`true`).

---

## 2. Organization Flow

### Tạo mới Organization
- **API**: `POST /organizations/create`
- **Logic**:
  1. User gọi API sẽ truyền vào tên tổ chức (VD: "Công ty ABC").
  2. Bắt `userId` từ JWT.
  3. Tạo `Account` mới với Type = `ORGANIZATION`. Gán `Owner` = `userId`.
  4. Tự động thêm 1 record vào `AccountMember` cho chính user đó, với Role `ADMIN` và toàn bộ các permission `canUpload`, `canSign`, `canViewDocs`, `canInvite` = `true`.

### Quản trị thành viên (Tương lai/Mở rộng)
Hệ thống cho phép mời (Invite) thành viên khác thông qua email tham gia vào Organization. Tại thời điểm được thêm, người invite có thể chọn phân quyền (Tắt bật các cờ `canUpload`, `canViewDocs`...).

---

## 3. JWT & Workspace Isolation
- Dữ liệu `Organization` gắn liền với quá trình Đăng nhập (Authentication).
- Khi người dùng đăng nhập bằng Email/Pass thành công, Backend luôn mặc định tìm và fallback về `AccountType.PERSONAL` của người đó.
- JWT (`token`) trả về sẽ chứa Payload: `accountId` và `scope` (vai trò của user trong account đó).
- Do đó, mọi thao tác tạo Document, ký Document gửi lên BE sau này đều sẽ nội suy `accountId` từ JWT để phân tách dữ liệu (Data Isolation trên phương diện Database query).

> **Important**: Frontend cần phải có Middleware để chứa Biến cục bộ "Current Workspace". Nếu User chuyển tab sang "Công ty ABC", FE phải gọi API `POST /auth/workspace` bằng `accountId` của Công ty ABC để lấy về 1 JWT mới (thay thế JWT hiện tại), chỉ khi đó thao tác fetch tài liệu tiếp theo mới trả về tài liệu của công ty.
