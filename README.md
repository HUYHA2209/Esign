# Hướng dẫn Khởi chạy Hệ thống Chữ ký Điện tử E-Sign (Dành cho Giảng viên chấm thi)

Kính gửi Thầy/Cô, để có thể khởi chạy và chấm điểm hệ thống đồ án **E-Sign** một cách suôn sẻ và tránh gặp lỗi môi trường, Thầy/Cô vui lòng thực hiện tuần tự theo các bước cấu hình dưới đây.

Toàn bộ thông số dưới đây được mô tả dựa trên **100% mã nguồn thực tế** đang có trong thư mục project.

---

## 1. Yêu cầu môi trường (Prerequisites)
Máy tính của Thầy/Cô cần cài đặt sẵn các phần mềm sau:
- **Java JDK 21** (Backend được build với release 21).
- **Node.js** (Phiên bản 18 trở lên dành cho Frontend Vite).
- **MySQL** (Hoạt động ở Port `3306`).
- **Redis Server** (Hoạt động ở Port `6379`).
- **MinIO Object Storage** (Hoạt động ở Port `9000`).

---

## 2. Chuẩn bị Cấu hình Dịch vụ (Database & Services)

### 2.1. MySQL
Mở MySQL và tạo một Database rỗng với tên chính xác là: **`esign_dtb`**
> 💡 *Lưu ý:* Mặc định code đang trỏ tới tài khoản MySQL là `root` và mật khẩu là `123456`. Nếu máy Thầy/Cô dùng mật khẩu khác, vui lòng vào file `esign_backend/esign/src/main/resources/application.yaml` để sửa lại. (Hệ thống dùng Hibernate `ddl-auto: update` nên các bảng sẽ tự động sinh ra khi chạy Backend).

### 2.2. MinIO & Redis
- Chạy Redis ở cổng mặc định `6379` (không cần mật khẩu).
- Chạy MinIO Server ở cổng `9000` (API) với Access Key là `minioadmin` và Secret Key là `minioadmin` (Đây là tài khoản mặc định của MinIO).

### 2.3. Cấu hình Chứng thư số PAdES (🔥 RẤT QUAN TRỌNG)
Để tính năng đóng dấu điện tử chuẩn PAdES hoạt động, Backend cần đọc một file chứng thư số `.p12`. Hiện tại trong `application.yaml`, đường dẫn file đang được đặt "cứng" tại ổ E:
`platform.signature.keystore.path: E:/sercurity/certificate.p12`

Nếu máy Thầy/Cô **không có ổ E**, hệ thống sẽ báo lỗi và crash khi chạy chức năng Ký! Để khắc phục, Thầy/Cô thực hiện 2 bước:
1. Sửa đường dẫn trên trong file `application.yaml` thành một đường dẫn hợp lệ trên máy Thầy/Cô (Ví dụ: `C:/certificate.p12`).
2. Mở Terminal (CMD/PowerShell) và chạy lệnh `keytool` sau để sinh ra 1 file chứng thư số tự cấp phát dùng cho việc test đồ án:
```bash
keytool -genkeypair -alias Esign_App -keyalg RSA -keysize 2048 -storetype PKCS12 -keystore C:/certificate.p12 -validity 3650 -storepass 123456
```
*(Nếu làm theo đúng lệnh này, thông số alias và mật khẩu sẽ khớp 100% với cấu hình hiện tại của đồ án).*

---

## 3. Khởi chạy Backend (Spring Boot)

1. Mở thư mục `esign_backend/esign` bằng phần mềm IntelliJ IDEA, Eclipse hoặc VS Code.
2. Đợi Maven tải xong thư viện.
3. Chạy lệnh Build (nếu cần): 
   ```bash
   mvn clean install -DskipTests
   ```
4. Mở file `EsignApplication.java` và ấn Run (hoặc chạy lệnh `mvn spring-boot:run`).
5. Nếu log console hiển thị `Started EsignApplication in ... seconds` và không ném ra exception nào, Backend đã chạy thành công tại **`http://localhost:8000/esign`**.

---

## 4. Khởi chạy Frontend (ReactJS / Vite)

1. Mở Terminal mới, trỏ đường dẫn vào thư mục `esign_frontend`.
2. Chạy lệnh cài đặt Node modules:
   ```bash
   npm install
   ```
3. Sau khi cài đặt thành công, khởi động Web Server:
   ```bash
   npm run dev
   ```
4. Terminal sẽ trả về một đường dẫn (thường là **`http://localhost:5173`**). Thầy/Cô bấm vào đường dẫn này trên trình duyệt để truy cập giao diện hệ thống E-Sign.

---
**Chúc Thầy/Cô trải nghiệm hệ thống chữ ký điện tử E-Sign thành công!**
