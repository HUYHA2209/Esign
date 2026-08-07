---
description: DocumentGroup entity knowledge - structure, relationships, enums, and business rules for the document group lifecycle
---

# DocumentGroup Skill

## Entity Structure

**File**: `esign_backend/esign/src/main/java/com/spring/esign/entity/DocumentGroup.java`

```java
@Entity @Table(name = "DOCUMENT_GROUP")
public class DocumentGroup {
    Integer groupId;            // PK auto-increment
    String groupName;           // Tên nhóm tài liệu
    Account account;            // @ManyToOne - Bắt buộc, để cô lập dữ liệu theo Workspace
    LocalDateTime createdAt;    // Thời gian tạo
    Integer currentStep = 1;    // Step hiện tại trên UI wizard (1-3)
    String gr_status = "DRAFT"; // Trạng thái: DRAFT | PENDING | COMPLETED | DECLINED | EXPIRED | VOID
    LocalDateTime expiresAt;    // Hạn ký (null = không giới hạn)
    List<Document> documents;   // @OneToMany(mappedBy = "documentGroup")
}
```

## Relationships
```
DocumentGroup (1) ──→ (N) Document ──→ (N) DocumentSigner ──→ (N) SignatureField
                                    ──→ (N) AuditTrail
```

## Key Business Rules

### Status Flow
```
DRAFT → PENDING → COMPLETED
         ↓           
       DECLINED (người nhận từ chối)
         ↓
       EXPIRED (hết hạn ký)
         ↓
       VOID (người gửi hủy, chỉ khi chưa ai ký)
```

### Expiration Rules
- `expiresAt` được set bởi người gửi khi tạo/gửi tài liệu
- `null` = không có deadline (mặc định)
- Khi hết hạn: gr_status → EXPIRED, tất cả Document → EXPIRED, tất cả signer WAITING → EXPIRED
- **Chỉ check khi người nhận mở tài liệu** (lazy check, không cần scheduler)
- Tài liệu đã SIGNED bởi signer nào → giữ nguyên SIGNED, không đổi

### Delete Rules
- **DRAFT**: cho phép xóa thật (xóa DB + MinIO)
- **PENDING trở đi**: KHÔNG cho xóa, chỉ cho VOID
- VOID chỉ được khi chưa có ai SIGNED

## Key Repository
**File**: `esign_backend/.../repository/DocumentGroupRepository.java`
```java
public interface DocumentGroupRepository extends JpaRepository<DocumentGroup, Integer> {
    DocumentGroup findByGroupIdAndAccount_AccountId(Integer groupId, Long accountId);
    
    // Sử dụng @Query do "gr_status" không chuẩn JPA camelCase
    @Query("SELECT d FROM DocumentGroup d WHERE d.account.accountId = :accountId AND d.gr_status IN :statuses")
    List<DocumentGroup> findByAccount_AccountIdAndGr_statusIn(@Param("accountId") Long accountId, @Param("statuses") List<String> statuses);
}
```

## Key DTOs

### GroupDetailResponse (GET /groups/{id}/detail)
```java
Integer groupId, groupName, currentStep;
String groupStatus;
LocalDateTime expiresAt;           // ← thêm mới
List<DocumentDetailResponse> documents;
```

### DocumentResponse (GET /documents/get-document)
```java
Integer documentId, groupId;
String title, originalFileUrl, uploadedBy, recipient;
DocumentStatus status;
LocalDateTime createdAt, updatedAt, expiresAt; // ← thêm mới
long fileCount;
```

### SendDocumentRequest
```java
String message;
List<SignerDto> signers;
Boolean enableSigningOrder;
LocalDateTime expiresAt;           // ← thêm mới
```

## FE State Locations

### DocumentEditor (index.jsx)
- `currentStep`, `documentName`, `recipients`, `fields`, `uploadedFiles`
- Save flow: `useAutoSaveDraft.js` → POST (create) / PUT (update delta)
- Load flow: `useLoadDraft.js` → GET /groups/{id}/detail

### Documents List (Documents/index.jsx)
- Shows all documents with status badges
- Should show expiry date + countdown for PENDING docs

## Related Enums
- `DocumentStatus`: DRAFT, PENDING, COMPLETED, DECLINED, EXPIRED, VOID
- `SignerStatus`: WAITING, VIEWED, SIGNED, DECLINED, EXPIRED
- `AuditEvent`: UPLOAD, DELETED, SENT, VIEWED, SIGNED, DECLINED, COMPLETED, EXPIRED, VOIDED, DOWNLOADED
