  ---
name: Audit Trail Planning & Implementation Guide
description: Architecture, security considerations, and implementation roadmap for the tamper-evident Audit Trail system in E-Sign.
---

# Kế hoạch & Kiến trúc Audit Trail Tổng thể (E-Sign)

Audit Trail (Lưu vết) là thành phần pháp lý cực kỳ quan trọng trong hệ thống chữ ký số (E-Sign). Nó đóng vai trò chứng minh **tính toàn vẹn** (integrity) và **chống chối bỏ** (non-repudiation). 

Theo kiến trúc các Entity `AuditTrail` và `AuditChain` hiện có trong src, hệ thống của chúng ta được thiết kế để không chỉ lưu lại lịch sử mà còn chống lại sự can thiệp từ chính quản trị viên cơ sở dữ liệu (Blockchain-like tamper-evident).

---

## 1. Phân loại Dữ liệu Lưu trữ

Dữ liệu trong `AuditTrail` được chia làm 2 nhóm chính: Nhóm thông tin ngữ cảnh (Bình thường) và Nhóm mật mã học (Bảo mật).

### 1.1. Các trường bình thường (Context & Metadata)
Các trường này cung cấp câu trả lời cho: **Ai đã làm gì, vào lúc nào, và từ đâu?**
*Tuy nhiên, các dữ liệu này (như IP, Device Fingerprint) ở mức độ mạng có thể bị giả mạo (spoof/proxy), nên chỉ được xem là "bằng chứng hỗ trợ", không phải bằng chứng quyết định.*
- `eventType`: Loại thao tác (UPLOAD, SENT, VIEWED, SIGNED, DECLINED, COMPLETED, DOWNLOADED, ...).
- `eventDescription`: Mô tả text (VD: "Tài liệu được gửi đến [email]").
- `signerEmail`, `signerName`: Định danh của người thực hiện trên hệ thống.
- `signerIp`: Địa chỉ IP truy cập (Lấy từ HTTP Request Header).
- `deviceFingerprint`: Thông tin trình duyệt, hệ điều hành (User-Agent hoặc footprint do JS gen ra).
- `timestamp`: Thời gian thực hiện (bắt buộc dùng Server Time để chuẩn hoá).
- `eventData`: Dạng JSON để linh hoạt lưu thêm các meta (ví dụ: Vị trí GPS cung cấp bởi Browser, thông tin trình duyệt bổ sung).

### 1.2. Các trường bảo mật & Chống chối bỏ (Cryptographic Fields)
Đây là cốt lõi của tính **Pháp lý**.
- **Tính toàn vẹn tài liệu (Document Integrity):**
  - `pdfHashBefore`: Mã băm SHA-256 của file PDF *trước* khi hành động xảy ra.
  - `pdfHashAfter`: Mã băm SHA-256 của file PDF *sau* khi hành động xảy ra. (Cực kỳ quan trọng ở sự kiện `SIGNED` - khi Server áp dụng mã hóa PAdES để tạo ra file mới).
  
- **Chống chối bỏ người dùng (WebAuthn Non-repudiation):**
  - `credentialId`: Định danh khóa (Passkey/FIDO2) của người ký.
  - `messageToSignHash`: Chuỗi Hash chứa dữ liệu tổng hợp (thường là hash PDF ghép với thông tin phiên) mà người dùng *thực sự ký*.
  - `digitalSignature`: Khối chữ ký số (Raw signature byte string) được ký bằng Private Key của thiết bị (điện thoại/laptop). Dùng để đối chiếu với Public key.
  - `keyAlgorithm`: Thuật toán mã hoá (RS256, ES256).

- **Chống gian lận Cơ Sở Dữ Liệu (Tamper-Evidence via AuditChain):**
  - Hệ thống sử dụng bảng `AuditChain` với cơ chế như một chuỗi khối (Blockchain) nội bộ.
  - `prevHash`: Là `entryHash` của sự kiện trước đó.
  - `entryHash`: Bằng `SHA-256(auditId + eventData_String + prevHash)`.
  - **Mục đích:** Nếu ai đó có quyền truy cập vào DB (ví dụ: DBA) cố tình sửa đổi `eventType` hoặc `signerIp` của một record trong quá khứ, chuỗi Hash từ đó về sau sẽ bị sai bóp méo hoàn toàn -> Chứng minh được Database đã bị sửa lén.

---

## 2. Các Mốc Sự Kiện Cần Lưu Vết (When to log)

Hệ thống cần trigger `AuditTrail` tại các Workflow sau:

1. **UPLOAD**: Khi `Document` (hoặc `DocumentGroup`) được tải lên lần đầu tiên.
   - *Logic:* `pdfHashBefore` và `pdfHashAfter` là như nhau (bằng hash file ban đầu).
2. **SENT**: Khi tạo xong Giao dịch gửi đi cho người nhận ký.
3. **VIEWED**: Khi người (Signer) mở link email hoặc frontend gọi hàm `prepareSigning/get-document`.
   - *Logic:* Update được `signerIp`, `deviceFingerprint`.
4. **SIGNED**: Trọng tâm nhất!
   - Xảy ra khi WebAuthn assert payload trả về.
   - *Logic:* Lưu toàn bộ Cryptographic Fields (WebAuthn + Digital Signature). Ghi rõ `pdfHashBefore` (PDF chờ ký) và `pdfHashAfter` (PDF đã được PAdES seal).
5. **DECLINED**: Khi Signer bấm từ chối.
6. **COMPLETED**: Khi *tất cả* Signer trong luồng đã ký xong. Server chốt lại DocumentGroup và tạo Certificate of Completion.

---

## 3. Kiến Trúc Lập Trình (Implementation Plan)

### Bước 1: Event-Driven Architecture (`AuditTrailService`)
Hệ thống sử dụng cơ chế Event-Driven (`ApplicationEventPublisher`) để ghi log SAU KHI (After Commit) logic kinh doanh chính đã thành công. Điều này giúp:
- Tránh deadlock do khóa bảng (FK lock) lên `Document`.
- Tránh ghi log "rác" nếu giao dịch chính bị rollback do lỗi (ví dụ lỗi gửi email).

```java
@Service
public class AuditTrailService {
    
    // Được gọi trực tiếp từ các hàm nghiệp vụ (SignningService, DocumentService...)
    public void logEvent(Document doc, AuditEvent eventType, ...) {
        // Resolve IP và Device Fingerprint từ Request Context hiện tại
        // Đóng gói thành AuditLogEvent
        eventPublisher.publishEvent(auditLogEvent);
    }

    // Lắng nghe sự kiện sau khi Transaction cha đã COMMIT
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleAuditLogEvent(AuditLogEvent event) {
        // 1. Tạo và map dữ liệu cho AuditTrail từ event
        // 2. Lưu AuditTrail vào DB để lấy ID
        // 3. Truy xuất bản ghi AuditChain cuối cùng của Document này (để lấy prevHash)
        // 4. Sinh entryHash mới: SHA-256(auditId + audit.timestamp + prevHash)
        // 5. Lưu AuditChain
    }
}
```

### Bước 2: Tích hợp vào Request Context
- Đối với IP, Browser (User-Agent), có thể lấy tự động qua tiện ích `HttpServletRequest` (`X-Forwarded-For`, `User-Agent`).
- Đối với `deviceFingerprint` (nếu dùng thư viện JS ở Frontend gắn vào header), đọc từ Request Headers.

### Bước 3: Inject vào Các Business Services
- Trong `DocumentService.java` (UPLOAD, SENT).
- Trong `SignningService.java` (VIEWED, SIGNED, COMPLETED).

---

## 4. Các Vấn Đề Cần Review và Quyết Định Trước Khi Code

1. **Lưu vết cho Khách hay cho Quản trị?** Hiện thiết kế trên đang tập trung cho tính pháp lý của từng File (`Document`). Do đó `AuditChain` nên chain theo `document_id`. (Mỗi tài liệu là 1 chuỗi blockchain độc lập).
2. **Device Fingerprint Flow:** Hiện tại phía Frontend của bạn có đang sinh và gửi một header ví dụ như `X-Device-Fingerprint` mỗi khi thao tác không? Nếu không, tạm thời backend lấy IP và User-Agent để cấu thành.
3. **Performance:** Hàm log có thể làm chậm luồng ký nếu thao tác I/O Hash nhiều. Nên cân nhắc đẩy luồng log (ngoại trừ log SIGNED bắt buộc đồng bộ) sang DTO và `@Async` event listener.
