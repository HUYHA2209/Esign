BẢN TÓM TẮT CÔNG VIỆC – GR2

1. Đề tài

Xây dựng ứng dụng Web chữ ký điện tử online.

Ứng dụng cho phép người dùng tạo, quản lý và ký tài liệu trực tuyến với chữ ký điện tử. Hệ thống hỗ trợ xác thực mạnh bằng chuẩn FIDO2/WebAuthn (Passkeys), xác minh danh tính qua OTP, và đảm bảo tính toàn vẹn dữ liệu thông qua cơ chế hash & chuỗi kiểm toán (Audit Chain).

2. Nội dung nghiên cứu & chức năng

	1. Quản lý người dùng & xác thực
	• Đăng ký tài khoản (có xác minh email qua mã OTP).
	• Đăng nhập, đăng xuất (JWT Access Token + Refresh Token lưu trong HttpOnly Cookie).
	• Gửi lại mã OTP (Resend OTP) khi hết hạn.
	• Quên mật khẩu / đặt lại mật khẩu (xác minh qua OTP gửi email).
	• Đổi mật khẩu khi đã đăng nhập.
	• Quản lý hồ sơ cá nhân (xem, cập nhật thông tin).
	• Tìm kiếm người dùng theo email.
	• Giới hạn tần suất truy cập (Rate Limiting) cho đăng ký, đăng nhập, gửi OTP nhằm chống brute-force.

	2. Quản lý Tổ chức & Phân quyền (Workspace)
	• Tạo tổ chức (Organization) với loại tài khoản: Cá nhân (Personal) hoặc Tổ chức (Organization).
	• Chuyển đổi Workspace giữa các tổ chức mà người dùng tham gia.
	• Phân vai trò thành viên: Admin, Member.
	• Phân quyền chi tiết cho từng thành viên: quyền Upload tài liệu, quyền Ký, quyền Mời người khác, quyền Xem tài liệu.

	3. Quản lý chữ ký số
	• Tạo chữ ký cá nhân với 3 hình thức: Vẽ tay trực tiếp trên trình duyệt (Drawn), Tải lên ảnh chữ ký (Uploaded), hoặc Nhập tên dạng văn bản (Typed).
	• Lưu trữ ảnh chữ ký trên hệ thống Object Storage riêng biệt (MinIO) với mã hash đảm bảo tính toàn vẹn.
	• Xem, chỉnh sửa chữ ký đã lưu.

	4. Đăng ký & quản lý khóa xác thực WebAuthn (FIDO2 Passkeys)
	• Đăng ký Passkey: Người dùng đăng ký credential sinh trắc học (vân tay, khuôn mặt) trên thiết bị cá nhân theo chuẩn FIDO2/WebAuthn.
	• Lưu trữ khóa công khai (Public Key COSE), thuật toán mã hóa, bộ đếm chống replay attack và thông tin thiết bị (AAGUID, attestation format).
	• Sử dụng Passkey để ký tài liệu: Khi ký, hệ thống tạo phiên ký (Signing Session) kèm challenge ngẫu nhiên. Người dùng xác thực bằng sinh trắc học trên thiết bị để tạo chữ ký mã hóa.

	5. Quản lý tài liệu
	• Upload tải lên và lưu trữ tài liệu PDF trên MinIO.
	• Tự động băm (hash) file gốc ngay khi upload để đảm bảo toàn vẹn dữ liệu (original_file_hash).
	• Quản lý tài liệu theo nhóm (Document Group) để gom nhiều file PDF trong cùng một yêu cầu ký.
	• Quản lý trạng thái tài liệu: Draft (Nháp) – Pending (Đang chờ ký) – Completed (Hoàn tất) – Declined (Bị từ chối) – Expired (Hết hạn).
	• Tải xuống tài liệu gốc hoặc tài liệu đã ký hoàn tất.
	• Xóa tài liệu hoặc xóa cả nhóm tài liệu.
	• Lưu nháp (Save Draft): Lưu lại tiến trình chuẩn bị tài liệu bất kỳ lúc nào để chỉnh sửa sau.

	6. Ký & phê duyệt tài liệu
	• Mời người khác ký qua email (gửi email thông báo tự động).
	• Đặt vị trí các trường chữ ký (Signature Fields) trực tiếp trên từng trang PDF bằng kéo thả (Drag & Drop), hỗ trợ nhiều loại trường: Signature, Text, Checkbox, Date, Email, Name, Initial, Number.
	• Ký nhiều bên (Multi-party signing): Mời nhiều người cùng ký trên một bộ tài liệu.
	• Thiết lập chế độ ký: Tuần tự (Sequential – ký theo thứ tự chỉ định) hoặc Song song (Parallel – ký đồng thời).
	• Thiết lập thứ tự ký (Signing Order) cho từng người để tuân thủ quy trình phê duyệt nội bộ.
	• Theo dõi trạng thái từng người ký: Waiting (Chờ) – Viewed (Đã xem) – Signed (Đã ký) – Declined (Từ chối).
	• Xác thực chữ ký bằng WebAuthn (challenge/response, xác minh assertion trên server).
	• Cho phép từ chối ký tài liệu.
	• Gửi nhóm tài liệu (Send Document Group) để bắt đầu quy trình ký chính thức.

	7. Kiểm toán & toàn vẹn dữ liệu (Audit Trail)
	• Ghi nhật ký chi tiết mọi sự kiện trên tài liệu: Viewed (Đã xem), Signed (Đã ký), Declined (Bị từ chối), Completed (Hoàn tất).
	• Thông tin ghi chép bao gồm: thời gian (timestamp), email người ký, tên người ký, địa chỉ IP (signer_ip), dấu vân tay thiết bị (device_fingerprint), người thực hiện.
	• Lưu trữ bằng chứng mã hóa: credential_id, chữ ký số (digital_signature), hash thông điệp (message_to_sign_hash), thuật toán khóa (key_algorithm).
	• Lưu trữ hash tài liệu trước ký (pdf_hash_before) và sau ký (pdf_hash_after) để chứng minh tài liệu không bị sửa đổi.
	• Chuỗi kiểm toán (Audit Chain): Mỗi bản ghi kiểm toán được liên kết bằng hash chuỗi (prev_hash → entry_hash) theo nguyên lý blockchain, đảm bảo không thể xóa hoặc sửa lịch sử.

	8. Dashboard thống kê
	• Bảng điều khiển tổng quan hiển thị số lượng tài liệu theo từng trạng thái.
	• Giám sát tiến trình ký duyệt tài liệu.

3. Nội dung GR2

Đề tài Web chữ ký điện tử online sẽ được bắt đầu thực hiện từ GR2. Toàn bộ các chức năng và nội dung nghiên cứu đều được triển khai mới trong giai đoạn này, bao gồm:

- Phân tích yêu cầu và thiết kế kiến trúc hệ thống (kiến trúc Client-Server, RESTful API).
- Thiết kế và triển khai cơ sở dữ liệu PostgreSQL (16 bảng: User, Account, AccountMember, Document, DocumentGroup, DocumentSigner, SignatureField, Signatures, UsersKeys, SigningSession, SignaturePrepare, AuditTrail, AuditChain, ForgotPassword, InvalidatedToken, RefreshToken).
- Phát triển backend bằng Java Spring Boot (REST API cho xác thực, người dùng, tổ chức, chữ ký, tài liệu, WebAuthn).
- Triển khai hệ thống lưu trữ file trên MinIO (Object Storage) cho tài liệu PDF và ảnh chữ ký.
- Xây dựng frontend bằng ReactJS + Vite (giao diện đăng nhập, đăng ký, quản lý tài liệu, biên tập PDF, trang ký tài liệu, quản lý chữ ký, hồ sơ cá nhân, dashboard).
- Triển khai module quản lý người dùng & xác thực (đăng ký, đăng nhập, OTP email, JWT, Refresh Token, Rate Limiting).
- Triển khai module quản lý Workspace/Tổ chức và phân quyền thành viên.
- Phát triển module quản lý chữ ký số (vẽ tay, upload ảnh, nhập văn bản).
- Nghiên cứu và tích hợp chuẩn FIDO2/WebAuthn cho xác thực và ký tài liệu bằng Passkeys (sinh trắc học).
- Phát triển module quản lý tài liệu (upload PDF, nhóm tài liệu, lưu nháp, quản lý trạng thái).
- Xây dựng chức năng ký & phê duyệt tài liệu (kéo thả trường ký trên PDF, multi-party signing, signing order, từ chối ký).
- Xây dựng hệ thống Audit Trail & Audit Chain đảm bảo toàn vẹn và không thể chối bỏ.
- Tích hợp gửi email thông báo tự động (mời ký, xác minh OTP, quên mật khẩu).
- Phát triển giao diện Dashboard thống kê.
- Kiểm thử toàn bộ hệ thống và triển khai bản demo.

4. Kế hoạch thực hiện

Thời gian          | Nội dung công việc
-------------------|--------------------------------------------------------------------
Tuần 1–2           | Phân tích yêu cầu, thiết kế kiến trúc hệ thống, thiết kế CSDL PostgreSQL (16 bảng).
Tuần 3–4           | Xây dựng module quản lý người dùng & xác thực (đăng ký, đăng nhập, OTP email, JWT, Refresh Token, Rate Limiting). Triển khai module Workspace/Tổ chức & phân quyền.
Tuần 5–6           | Phát triển module quản lý chữ ký số (vẽ tay, upload, nhập văn bản). Thiết lập hệ thống lưu trữ MinIO. Nghiên cứu và tích hợp WebAuthn (đăng ký Passkeys).
Tuần 7–8           | Phát triển module quản lý tài liệu (upload PDF, nhóm tài liệu, lưu nháp, quản lý trạng thái, tải xuống). Xây dựng giao diện biên tập PDF với kéo thả trường ký.
Tuần 9–10          | Xây dựng chức năng ký & phê duyệt tài liệu (multi-party signing, signing order, xác thực WebAuthn, từ chối ký). Tích hợp gửi email mời ký tự động.
Tuần 11            | Xây dựng hệ thống Audit Trail & Audit Chain. Phát triển giao diện Dashboard thống kê. Quên mật khẩu / đổi mật khẩu.
Tuần 12            | Kiểm thử toàn bộ hệ thống, tối ưu hiệu năng, viết báo cáo và chuẩn bị bảo vệ.

5. Công nghệ sử dụng

- Backend: Java, Spring Boot, Spring Security, Hibernate/JPA.
- Cơ sở dữ liệu: PostgreSQL.
- Lưu trữ file: MinIO (Object Storage tương thích S3).
- Frontend: ReactJS, Vite, HTML5, CSS, JavaScript.
- Bảo mật & xác thực: JWT (Access Token + Refresh Token), OTP qua email (lưu trên Redis), Rate Limiting (Redis), FIDO2/WebAuthn (Passkeys – xác thực sinh trắc học), Hash SHA-256.
- Caching: Redis (lưu OTP, quản lý rate limit).
- Gửi email: Spring Mail (SMTP).
