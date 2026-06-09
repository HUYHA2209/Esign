---
description: Complete document signing flow using WebAuthn with cryptographic binding - covers Prepare (Pre-seal), WebAuthn assertion, Complete phases, entity relationships, and verification
---

# Document Signing Flow (WebAuthn + Cryptographic Binding)

## Core Concept
Flow mới chia rõ trách nhiệm: Frontend chuẩn bị dữ liệu (field values), Backend thực hiện "Pre-seal" (vẽ nháp chữ ký lên PDF), băm bản vẽ nháp đó thành Hash, và đưa Hash đó vào mầm (challenge) WebAuthn.
-> Ràng buộc mật mã giữa **danh tính người ký (WebAuthn key)** và **ngay chính bản PDF đã có chữ ký/nhập liệu (pre-sealed hash)**.

---

## 3-Phase Flow Current Implementation

### Phase 1: Prepare (Tạo Phiên Ký & Pre-seal)

**Trigger**: User nhấn "Hoàn tất ký" (sau khi đã điền hết các trường trên giao diện).

**Endpoint**: `POST /signning/prepare/{groupId}`  
**Body**: `PrepareSigningRequest { fieldValues: Map<String, String> }`  
*(fieldValues là Map với key=fieldId, value=giá trị user cung cấp như text hoặc base64 ảnh chữ ký)*

**Steps**:
1. Validate user và lấy các `UsersKeys` (thiết bị WebAuthn của user). Lấy danh sách tài liệu (`Document`) thuộc Group mà user cần ký.
2. Với **mỗi Document**:
   - Tải file gốc từ MinIO.
   - **Pre-seal**: Gọi `PdfDocumentService.burnVisualsToPdf(..., fieldValues)` để vẽ vĩnh viễn hình ảnh chữ ký/văn bản vào đúng tọa độ của các trường.
   - Lưu trữ tạm bản PDF pre-sealed này (ví dụ ở thư mục `temp-preseal/` trên MinIO).
   - Băm SHA-256 bản pre-sealed, thu được `hashFile`.
3. Ghép các `hashFile` (`combinedHashes`), sau đó kết hợp với `nonce`, `user.getId()`, `timestamp` để băm thành chuỗi Challenge:  
   `challenge_bytes = SHA-256(nonce + | + combinedHashes + | + userId + | + timestamp)`
4. Tạo `SigningSession` với `challenge = Base64URL(challenge_bytes)` -> lưu trạng thái ACTIVE.
5. Tạo `SignaturePrepare` lưu trữ thông tin chuẩn bị ký.
6. Gom các option để trả cho FE. (Lưu ý: FE hiện tại không cần sử dụng mảng `documents` do hash đã được BE bake thẳng vào challenge).

**Response**:
```json
{
  "result": {
    "sessionId": "<UUID>",
    "webAuthnOptions": {
      "challenge": "<Base64URL of full challenge>",
      "rpId": "localhost",
      "timeout": 60000,
      "userVerification": "required",
      "allowCredentials": [{"id": "<credentialId>", "type": "public-key"}]
    }
  }
}
```

### Phase 2: WebAuthn Assertion (Browser)

Browser lấy trực tiếp `webAuthnOptions` (convert Base64URL của `challenge` và `id` sang `ArrayBuffer`) và gọi popup sinh trắc học/chìa khóa cứng 1 lần duy nhất.

```javascript
const credential = await navigator.credentials.get({ publicKey: publicKeyOptions });
const credentialJson = credentialToJSON(credential); // JSONify the assertion result
```

### Phase 3: Complete (Xác minh & Đóng dấu PAdES)

**Endpoint**: `POST /signning/complete`  
**Body**: `CompleteSigningRequest { sessionId: String, groupId: Integer, credentialJson: String }`

**Steps**:
1. Tìm session (Session hợp lệ, ACTIVE, đúng User).
2. Tái tạo `credentialJson`, tra cứu `UsersKeys` qua `credentialId`.
3. Verify WebAuthn Assertion:
   - Check `rpId`, `origin`.
   - Check `challenge` trong clientDataJSON khớp với `session.getChallenge()`.
   - Verify digital signature khớp với `publicKeyCose` của thiết bị.
4. Update `SigningSession` thành `USED`.
5. Xử lý lưu PDF hoàn thiện:
   - Tải lại file PDF pre-sealed từ thư mục temp trên MinIO.
   - Append Audit Log Page (Certificate of Completion) vào trang cuối PDF.
   - **Platform Sealing**: Gọi `PdfSealingService.signPdfPAdES()` dùng private key (`.p12`) của hệ thống ký đóng dấu PAdES.
   - Upload file Final này lên MinIO thay thế đường dẫn của file cũ/hoặc đường dẫn final.
   - Update `DocumentSigner` (status = SIGNED) và `Document` (status = COMPLETED nếu xong hết).
   - Xóa file tạm. Ghi nhận `AuditTrail`.

---

## Entity Relationships

```
SigningSession
  ├── user_id
  ├── group_id
  ├── challenge = Base64URL(SHA-256(nonce|hashes|userId|time))
  ├── status: ACTIVE → USED
  └── SignaturePrepare (1 to N per session)
       ├── document_id
       ├── doc_signer_id
       ├── message_to_sign (JSON details)
       └── message_to_sign_hash
```

---

## Frontend Flow (Signing Page)

FE cần gọi 2 API tuần tự: Prepare và Complete, chèn giữa là WebAuthn Browser API. Không gửi thuộc tính `documents` đi hay nhận về xử lý dư thừa.

```javascript
// Bước 1: Gửi fieldValues cho BE tự xử lý Pre-seal và sinh options
const prepareResult = await prepareGroupSigning(groupId, fieldValues);
const { sessionId, webAuthnOptions } = prepareResult;

// Bước 2: WebAuthn API popup
const publicKeyOptions = { ...webAuthnOptions };
publicKeyOptions.challenge = base64urlToBuffer(publicKeyOptions.challenge);
publicKeyOptions.allowCredentials = publicKeyOptions.allowCredentials.map(c => ({
    ...c, id: base64urlToBuffer(c.id)
}));

const credential = await navigator.credentials.get({ publicKey: publicKeyOptions });
const credentialJson = credentialToJSON(credential);

// Bước 3: Gửi credential kết quả về BE (KHÔNG còn gửi kèm fieldValues nữa)
await completeGroupSigning(sessionId, groupId, credentialJson);
alert('Ký thành công!');
```

## Key Design Considerations
1. **Pre-sealing vs Post-sealing**: 
   - Đưa việc apply visual fields (`fieldValues`) lên bước `prepare` để backend băm hash của văn bản SAU KHI ĐÃ CÓ HÌNH ẢNH CHỮ KÝ.
   - Tránh việc user ký lên 1 văn bản gốc, nhưng lúc sau hệ thống chèn chữ ký nháp vào thì làm vô hiệu phần SHA-256 seal do thay đổi file.
2. **Loại bỏ hiển thị mã băm FE thủ công**:
   - Thay vì FE tải danh sách Hash và ghép, BE chủ động bake mọi thứ vào biến `challenge` bảo mật mạnh nhất.
3. **PAdES sealing (.p12)**:
   - Tự động đính ở bước cuối (server-side sealing) để xuất file có Trust Certificate hợp lệ trên Adobe Acrobat cho tính pháp lý vững nhất.
