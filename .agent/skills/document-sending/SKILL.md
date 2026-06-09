---
description: Document Sending flow - complete knowledge of how documents are sent from sender to signers, including backend service, controller, DTOs, frontend API, and notification flow
---

# Document Sending Skill

## Overview
Document sending is the process of transitioning a DocumentGroup from DRAFT → PENDING and distributing it to signers. This involves persisting signers, signature fields, updating statuses, and notifying recipients.

## Flow Summary
```
Frontend (DocumentEditor Step 3)
  └─ POST /documents/groups/{groupId}/send  (SendDocumentRequest body)
       └─ DocumentService.sendDocumentGroup()
            ├── Load docs by groupId
            ├── Validate current user
            ├── Set all Document.status = PENDING
            ├── Set DocumentGroup.gr_status = PENDING + expiresAt
            ├── Delete old signers/fields for the group
            ├── Bulk-fetch Users by signer emails
            ├── Create DocumentSigner per (document × signer)
            ├── Create SignatureField per field
            └── (TODO) Send notification email to signers
```

## Backend Files

### Controller
**File**: `esign_backend/.../controller/DocumentController.java`
```java
@PostMapping("/groups/{groupId}/send")
public ApiResponse<String> sendDocumentGroup(
        @PathVariable Integer groupId,
        @RequestBody SendDocumentRequest request) {
    documentService.sendDocumentGroup(groupId, request);
    return ApiResponse.<String>builder().result("Document sent successfully").build();
}
```

### Service — `sendDocumentGroup()`
**File**: `esign_backend/.../service/DocumentService.java` (lines 48–183)

**Key steps:**
1. **Load docs**: `documentRepository.findByDocumentGroup_GroupId(groupId)` — sorted by PK
2. **Auth check**: Gets current user from SecurityContext
3. **Status update**: All documents → `PENDING`, group → `PENDING`, set `expiresAt`
4. **Flatten signers+fields**: Maps `SignerDto.fields[]` → `Map<docId, List<FieldBundle>>`
5. **Resolve signing mode**: `enableSigningOrder` → `SEQUENTIAL` or `PARALLEL`
6. **Bulk user lookup**: `userRepository.findByEmailIn(signerEmails)` — validates all signers exist
7. **Per-document loop**:
   - Delete old `DocumentSigner` and `SignatureField` for doc
   - Create new `DocumentSigner` per unique email (with `sentAt`, `user`, `signingOrder`, `signingMode`)
   - Create new `SignatureField` per field placement

**Important**: Currently does NOT send email notifications — `EmailService.sendDocumentEmail()` exists but is not called from `sendDocumentGroup()`.

### Request DTOs

**`SendDocumentRequest`** (`dto/request/SendDocumentRequest.java`):
```java
String message;                    // Optional message for recipients
List<SignerDto> signers;           // List of signers with their fields
Boolean enableSigningOrder;        // true → SEQUENTIAL, false → PARALLEL
LocalDateTime expiresAt;           // Optional expiry deadline
```

**`SignerDto`** (`dto/request/SignerDto.java`):
```java
Integer id;
String email;                      // Required — must be registered user
String name;
String role;                       // Default "signer"
Integer signingOrder;              // Default 1
List<FieldRequest> fields;         // Signature/text fields placed on documents
```

**`FieldRequest`** (`dto/request/FieldRequest.java`):
```java
Integer documentId;                // Target document PK
Integer page;                      // Page number
Float x, y, width, height;        // Position and dimensions
String type;                       // "SIGNATURE", "TEXT", etc. → maps to FieldType enum
```

## Frontend Files

### API Call
**File**: `esign_frontend/src/service/documentApi.js`
```js
export const sendDocument = async (groupId, payload) => {
    const response = await apiClient.post(`/documents/groups/${groupId}/send`, payload);
    return response.data;
}
```

### Where it's called
The DocumentEditor page (Step 3 — send step) calls `sendDocument(groupId, payload)` with:
```js
payload = {
    message: "...",
    signers: [
        {
            email: "signer@example.com",
            name: "Nguyen Van A",
            role: "signer",
            signingOrder: 1,
            fields: [
                { documentId: 123, page: 1, x: 100, y: 200, width: 150, height: 50, type: "SIGNATURE" }
            ]
        }
    ],
    enableSigningOrder: false,
    expiresAt: "2026-04-10T00:00:00"
}
```

## Related Entities

### DocumentSigner (created during send)
```java
Integer docSignerId;          // PK
Document document;            // FK
User user;                    // FK — resolved from email
String signerEmail;           // Required
String signerName;
String role;                  // Default "signer"
Integer signingOrder;         // Default 1
SigningMode signingMode;      // PARALLEL | SEQUENTIAL
SignerStatus status;          // Default WAITING
LocalDateTime sentAt;         // Set to now() during send
```

### SignatureField (created during send)
```java
Integer fieldId;
Document document;            // FK
DocumentSigner docSigner;     // FK
Integer pageNumber;
Float posX, posY, width, height;
FieldType fieldType;          // SIGNATURE | TEXT | DATE | NAME | EMAIL | INITIAL
String value;                 // Filled later when signer signs
```

## Notification Flow (Current State)
- `EmailService.sendDocumentEmail(toEmail, documentName, messageContent, link)` — exists but is **NOT called** from `sendDocumentGroup()`
- No WebSocket notification currently implemented for sending
- Frontend uses polling (re-fetch document lists) for status updates

## WebSocket Infrastructure (Already Configured)
**File**: `esign_backend/.../configuration/WebSocketConfig.java`
- STOMP over WebSocket with SockJS fallback
- Endpoint: `/ws`
- Broker prefixes: `/topic` (broadcast), `/queue` (user-specific)
- Application prefix: `/app`
- User prefix: `/user`
- **Dependency already in pom.xml**: `spring-boot-starter-websocket`

## Key Enums
```java
enum DocumentStatus { DRAFT, PENDING, COMPLETED, DECLINED, EXPIRED, VOID }
enum SignerStatus    { WAITING, VIEWED, SIGNED, DECLINED, EXPIRED }
enum SigningMode     { SEQUENTIAL, PARALLEL }
enum FieldType       { SIGNATURE, TEXT, DATE, NAME, EMAIL, INITIAL }
```

## Status Transitions on Send
| Entity         | Before Send | After Send |
|----------------|-------------|------------|
| DocumentGroup  | DRAFT       | PENDING    |
| Document       | DRAFT       | PENDING    |
| DocumentSigner | (new)       | WAITING    |

## Potential WebSocket Use Cases for Sending
1. **Real-time notification to signers**: When documents are sent, push notification via `/user/{email}/queue/document-received`
2. **Sender status tracking**: Real-time updates when signers view/sign → `/user/{senderEmail}/queue/document-status`
3. **Signing progress**: Live updates on signing progress → `/topic/group/{groupId}/progress`

## Dependencies
- `spring-boot-starter-websocket` (already in pom.xml)
- SockJS + STOMP.js (needed on frontend, via `@stomp/stompjs` or `sockjs-client`)
