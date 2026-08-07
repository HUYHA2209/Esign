package com.spring.esign.service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.*;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.multipart.MultipartFile;

import com.spring.esign.dto.request.*;
import com.spring.esign.dto.response.*;
import com.spring.esign.entity.*;
import com.spring.esign.enums.*;
import com.spring.esign.exception.AppException;
import com.spring.esign.exception.ErrorCode;
import com.spring.esign.repository.*;
import com.spring.esign.service.signning.SignningService;
import com.spring.esign.util.PermissionChecker;
import com.spring.esign.util.StoragePathResolver;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DocumentService {

    SignningService signningService;
    DocumentGroupRepository documentGroupRepository;
    MinioService minioService;
    DocumentRepository documentRepository;
    UserRepository userRepository;
    AccountRepository accountRepository;
    SignatureFieldRepository signatureFieldRepository;
    DocumentSignerRepository documentSignerRepository;
    AccountMemberRepository accountMemberRepository;
    NotificationsService notificationsService;
    PermissionChecker permissionChecker;
    StoragePathResolver storagePathResolver;
    AuditTrailService auditTrailService;

    // ─── Send Document Group ────────────────────────────────────────────

    @Transactional
    public void sendDocumentGroup(Integer groupId, SendDocumentRequest request) {
        if (groupId == null) throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);

        // ── 1. Load documents sorted by PK (guaranteed order) ──
        List<Document> documents = documentRepository.findByDocumentGroup_GroupId(groupId);
        if (documents == null || documents.isEmpty()) throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User currentUser = userRepository.findById(authentication.getName()).orElse(null);
        if (currentUser == null) throw new AppException(ErrorCode.UNAUTHENTICATED);

        Long accountId = extractAccountId(authentication);

        // ── 2. Build docId → Document map (O(1) lookup) ──
        Map<Integer, Document> docIdToDoc = new HashMap<>();
        for (int i = 0; i < documents.size(); i++) {
            Document d = documents.get(i);
            docIdToDoc.put(d.getDocumentId(), d);
        }

        // ── 3. Update status on all documents / group ──
        DocumentGroup dg = documentGroupRepository.findByGroupIdAndAccount_AccountId(groupId, accountId);
        if (dg != null && !DocumentStatus.DRAFT.name().equalsIgnoreCase(dg.getGr_status())) {
            throw new AppException(
                    ErrorCode.DOCUMENT_CANNOT_DELETE); // Hoặc tạo ErrorCode riêng, dùng tạm CANNOT_DELETE hoặc
            // UNCATEGORIZED
        }
        for (Document document : documents) {
            if (document.getStatus() != DocumentStatus.DRAFT) {
                throw new AppException(ErrorCode.DOCUMENT_CANNOT_DELETE);
            }
            document.setStatus(DocumentStatus.PENDING);
        }

        permissionChecker.requirePermission(accountId, currentUser.getId(), "UPLOAD");
        if (dg != null) {
            dg.setGr_status(DocumentStatus.PENDING.name());
            if (request.getExpiresAt() != null) {
                dg.setExpiresAt(request.getExpiresAt());
            }
        }
        documentRepository.saveAll(documents);

        // ── 4. Flatten signers+fields into Map<docId, List<FieldBundle>> ──
        // FieldBundle = (signer email/name/role, field coords)
        List<SignerDto> signers = request != null && request.getSigners() != null ? request.getSigners() : List.of();
        Boolean enableSigningOrder =
                request != null && request.getEnableSigningOrder() != null ? request.getEnableSigningOrder() : false;
        SigningMode authMode = enableSigningOrder ? SigningMode.SEQUENTIAL : SigningMode.PARALLEL;

        // [Bulk Fetch Users] Optimize user_id population
        Set<String> signerEmails = new java.util.HashSet<>();
        for (SignerDto sd : signers) {
            String email = sd.getEmail();
            if (email != null && !email.trim().isEmpty()) {
                signerEmails.add(email.trim().toLowerCase());
            }
        }

        Map<String, User> emailToUserMap = new HashMap<>();
        if (!signerEmails.isEmpty()) {
            List<User> matchedUsers = userRepository.findByEmailIn(signerEmails);
            for (User u : matchedUsers) {
                if (u.getEmail() != null) emailToUserMap.put(u.getEmail().toLowerCase(), u);
            }
        }
        LocalDateTime now = LocalDateTime.now();

        // Map: docId → list of (SignerDto, FieldRequest)
        Map<Integer, List<Object[]>> fieldsByDoc = new HashMap<>();
        for (SignerDto sd : signers) {
            if (sd.getFields() == null) continue;
            for (FieldRequest f : sd.getFields()) {
                // Resolve target document
                Document targetDoc = null;
                if (f.getDocumentId() != null) {
                    targetDoc = docIdToDoc.get(f.getDocumentId()); // preferred: real PK
                }
                if (targetDoc == null) continue;
                fieldsByDoc
                        .computeIfAbsent(targetDoc.getDocumentId(), k -> new ArrayList<>())
                        .add(new Object[] {sd, f});
            }
        }

        // ── 5. Persist signers + fields per document ──
        for (Document doc : documents) {
            Integer docId = doc.getDocumentId();

            documentSignerRepository.deleteByDocument_DocumentId(docId);
            signatureFieldRepository.deleteByDocument_DocumentId(docId);

            List<Object[]> bundles = fieldsByDoc.getOrDefault(docId, List.of());
            if (bundles.isEmpty()) continue;

            // Collect unique signers for this doc
            Map<String, DocumentSigner> emailToSigner = new HashMap<>();
            List<DocumentSigner> signersToSave = new ArrayList<>();
            for (Object[] b : bundles) {
                SignerDto sd = (SignerDto) b[0];
                if (sd.getEmail() == null || sd.getEmail().isBlank()) {
                    throw new AppException(ErrorCode.INVALID_INPUT);
                }
                String emailKey = sd.getEmail().toLowerCase();
                String key = emailKey + "_" + (sd.getAccountId() != null ? sd.getAccountId() : "personal");
                User signerUser = emailToUserMap.get(emailKey);
                if (signerUser == null) {
                    throw new AppException(ErrorCode.USER_NOT_EXISTED);
                }

                if (!emailToSigner.containsKey(key)) {
                    Account targetAccount = null;
                    if (sd.getAccountId() != null) {
                        targetAccount =
                                accountRepository.findById(sd.getAccountId()).orElse(null);
                    }
                    DocumentSigner ds = DocumentSigner.builder()
                            .document(doc)
                            .signerEmail(sd.getEmail())
                            .signerName(sd.getName())
                            .user(signerUser)
                            .account(targetAccount)
                            .sentAt(now)
                            .role(sd.getRole() == null ? "signer" : sd.getRole())
                            .signingOrder(sd.getSigningOrder() == null ? 1 : sd.getSigningOrder())
                            .signingMode(authMode)
                            .build();
                    emailToSigner.put(key, ds);
                    signersToSave.add(ds);
                }
            }
            List<DocumentSigner> saved = documentSignerRepository.saveAll(signersToSave);
            // Rebuild map with DB-assigned IDs
            Map<String, DocumentSigner> savedMap = new HashMap<>();
            for (DocumentSigner ds : saved) {
                String k = ds.getSignerEmail().toLowerCase() + "_"
                        + (ds.getAccount() != null ? ds.getAccount().getAccountId() : "personal");
                savedMap.put(k, ds);
            }

            // Build fields
            List<SignatureField> newFields = new ArrayList<>();
            for (Object[] b : bundles) {
                SignerDto sd = (SignerDto) b[0];
                FieldRequest f = (FieldRequest) b[1];
                String fieldKey = sd.getEmail().toLowerCase() + "_"
                        + (sd.getAccountId() != null ? sd.getAccountId() : "personal");
                DocumentSigner ds = savedMap.get(fieldKey);
                if (ds == null) continue;
                newFields.add(SignatureField.builder()
                        .document(doc)
                        .docSigner(ds)
                        .pageNumber(f.getPage())
                        .posX(f.getX())
                        .posY(f.getY())
                        .width(f.getWidth())
                        .height(f.getHeight())
                        .fieldType(mapFieldType(f.getType()))
                        .build());
            }
            if (!newFields.isEmpty()) signatureFieldRepository.saveAll(newFields);
        }

        // ── 6. Send Notifications ──
        if (!signerEmails.isEmpty()) {
            String title = "Bạn có tài liệu mới cần xử lý từ " + currentUser.getFullName();
            String groupName = dg != null && dg.getGroupName() != null ? dg.getGroupName() : "Tài liệu";
            String message = "Vui lòng xem và xử lý tài liệu trong nhóm " + groupName + ".";

            for (String email : signerEmails) {
                notificationsService.sendToUser(
                        email,
                        Notifications.DOCUMENT_RECEIVED,
                        title,
                        message,
                        groupId,
                        currentUser.getFullName(),
                        currentUser.getEmail());
            }
        }

        // Audit Trail: SENT
        for (Document doc : documents) {
            auditTrailService.logEvent(
                    doc,
                    com.spring.esign.enums.AuditEvent.SENT,
                    currentUser,
                    null,
                    doc.getOriginalFileHash(),
                    doc.getOriginalFileHash(),
                    null,
                    null,
                    null,
                    getClientIp(),
                    getUserAgent());
        }
    }

    // ─── Save Draft Document ────────────────────────────────────────────

    @Transactional
    public Integer uploadDocument(List<MultipartFile> files, String groupName, Integer groupId) throws IOException {
        if (files == null || files.isEmpty()) throw new AppException(ErrorCode.INVALID_INPUT);

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();
        Long accountId = extractAccountId(authentication);

        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        Account account = accountId != null
                ? accountRepository.findById(accountId).orElseThrow(() -> new AppException(ErrorCode.UNAUTHENTICATED))
                : null;
        if (account == null) throw new AppException(ErrorCode.UNAUTHENTICATED);

        // Permission check: ADMIN bypass tự động, MEMBER cần canUpload
        permissionChecker.requirePermission(accountId, user.getId(), "UPLOAD");

        DocumentGroup documentGroup = findOrCreateGroup(groupId, groupName, account);
        documentGroupRepository.save(documentGroup);

        for (MultipartFile file : files) {
            byte[] bytes = file.getBytes();

            String objectName = storagePathResolver.originalDocument(accountId, file.getOriginalFilename());

            String contentType = file.getContentType() != null ? file.getContentType() : "application/octet-stream";

            minioService.uploadFile(
                    new ByteArrayInputStream(bytes),
                    StoragePathResolver.BUCKET_ORIGINAL,
                    objectName,
                    contentType,
                    bytes.length);

            String hash = hashDocumentSHA256(new ByteArrayInputStream(bytes));
            Document document = Document.builder()
                    .uploadedBy(user)
                    .account(account)
                    .originalFileUrl(objectName)
                    .originalFileHash(hash)
                    .status(DocumentStatus.DRAFT)
                    .documentGroup(documentGroup)
                    .build();
            documentRepository.save(document);

            // Audit Trail: UPLOAD
            auditTrailService.logEvent(
                    document,
                    com.spring.esign.enums.AuditEvent.UPLOAD,
                    user,
                    null,
                    hash,
                    hash,
                    null,
                    null,
                    null,
                    getClientIp(),
                    getUserAgent());
        }
        return documentGroup.getGroupId();
    }

    /**
     * Find existing group by ID or create a new one.
     */
    private DocumentGroup findOrCreateGroup(Integer groupId, String groupName, Account account) {
        if (groupId != null) {
            DocumentGroup existing = documentGroupRepository.findById(groupId).orElse(null);
            if (existing != null) {
                existing.setGroupName(groupName);
                return existing;
            }
        }
        return DocumentGroup.builder().groupName(groupName).account(account).build();
    }

    @Transactional
    public void cancelDocumentGroup(Integer groupId, com.spring.esign.dto.request.CancelRequest request) {
        org.springframework.security.core.Authentication authentication =
                org.springframework.security.core.context.SecurityContextHolder.getContext()
                        .getAuthentication();
        String userId = authentication.getName();
        Long accountId = extractAccountId(authentication);
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        DocumentGroup group = documentGroupRepository.findByGroupId(groupId);
        if (group == null) {
            throw new AppException(ErrorCode.DOCUMENT_NOT_FOUND);
        }

        List<Document> documents = documentRepository.findByDocumentGroup_GroupId(groupId);
        if (documents.isEmpty()) {
            throw new AppException(ErrorCode.DOCUMENT_NOT_FOUND);
        }

        // Permission: sender HOẶC ADMIN mới được cancel
        boolean isUploader = documents.get(0).getUploadedBy().getId().equals(userId);
        AccountMember member = permissionChecker.requireMembership(accountId, userId);
        boolean isAdmin = member.getRole() == MemberRole.ADMIN;
        if (!isUploader && !isAdmin) {
            throw new AppException(ErrorCode.USER_NO_PERMISSION);
        }

        // Status guard: chỉ PENDING mới được cancel
        if (!DocumentStatus.PENDING.name().equalsIgnoreCase(group.getGr_status())) {
            throw new AppException(ErrorCode.DOCUMENT_CANNOT_CANCEL);
        }

        // ── Update group status ──
        group.setGr_status(DocumentStatus.VOID.name());
        documentGroupRepository.save(group);

        // ── Update documents: status + cancelledAt/cancelledBy ──
        LocalDateTime now = LocalDateTime.now();
        for (Document doc : documents) {
            doc.setStatus(DocumentStatus.VOID);
            doc.setCancelledAt(now);
            doc.setCancelledBy(user);
        }
        documentRepository.saveAll(documents);

        // ── Update signers & send notifications ──
        java.util.Set<String> notifiedEmails = new java.util.HashSet<>();
        List<DocumentSigner> allSignersToSave = new ArrayList<>();

        for (Document doc : documents) {
            auditTrailService.logEvent(
                    doc,
                    com.spring.esign.enums.AuditEvent.VOIDED,
                    user,
                    null,
                    doc.getOriginalFileHash(),
                    doc.getOriginalFileHash(),
                    null,
                    null,
                    null,
                    getClientIp(),
                    getUserAgent());

            List<DocumentSigner> signers = documentSignerRepository.findByDocument_DocumentId(doc.getDocumentId());
            for (DocumentSigner ds : signers) {
                if (ds.getStatus() == SignerStatus.WAITING || ds.getStatus() == SignerStatus.VIEWED) {
                    ds.setStatus(SignerStatus.EXPIRED);
                    allSignersToSave.add(ds);
                }
                if (notifiedEmails.add(ds.getSignerEmail())) {
                    String title = "Tài liệu bị hủy: " + group.getGroupName();
                    String message = "Người gửi " + user.getFullName() + " đã hủy yêu cầu ký tài liệu \""
                            + group.getGroupName() + "\"."
                            + (request != null
                                            && request.getReason() != null
                                            && !request.getReason().trim().isEmpty()
                                    ? " Lý do: " + request.getReason()
                                    : "");
                    notificationsService.sendToUser(
                            ds.getSignerEmail(),
                            com.spring.esign.enums.Notifications.DOCUMENT_VOIDED,
                            title,
                            message,
                            groupId,
                            user.getFullName(),
                            user.getEmail());
                }
            }
        }
        if (!allSignersToSave.isEmpty()) {
            documentSignerRepository.saveAll(allSignersToSave);
        }
    }

    private FieldType mapFieldType(String type) {
        if (type == null || type.trim().isEmpty()) {
            return FieldType.SIGNATURE;
        }
        try {
            return FieldType.valueOf(type.toUpperCase());
        } catch (IllegalArgumentException e) {
            return FieldType.TEXT; // Fallback for unknown types
        }
    }

    // ─── Query Methods ──────────────────────────────────────────────────

    public List<DocumentResponse> getMyDocuments() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();
        Long accountId = extractAccountId(authentication);

        if (accountId == null) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        // Permission check: xác định phạm vi hiển thị document
        AccountMember member = permissionChecker.requireMembership(accountId, userId);
        List<Document> documents;

        if (member.getRole() == MemberRole.ADMIN || Boolean.TRUE.equals(member.getCanViewDocs())) {
            // ADMIN hoặc có canViewDocs → thấy TẤT CẢ doc của account
            documents = documentRepository.findByAccount_AccountIdWithGroupAndUser(accountId);
        } else {
            // Không có canViewDocs → chỉ thấy doc MÌNH upload
            documents = documentRepository.findByAccount_AccountIdAndUploadedBy_Id(accountId, userId);
        }

        List<DocumentResponse> results = new ArrayList<>();
        for (Document doc : documents) {
            DocumentResponse resp = toDocumentResponse(doc);
            // Lấy danh sách người ký (recipient) cho document này
            List<DocumentSigner> signers = documentSignerRepository.findByDocument_DocumentId(doc.getDocumentId());
            if (signers != null && !signers.isEmpty()) {
                // Hiển thị tên/email người nhận đầu tiên (hoặc gộp nếu nhiều)
                String recipientDisplay = signers.stream()
                        .map(DocumentSigner::getSignerEmail)
                        .distinct()
                        .reduce((a, b) -> a + ", " + b)
                        .orElse(null);
                resp.setRecipient(recipientDisplay);
            }
            results.add(resp);
        }
        return results;
    }

    public List<DocumentResponse> getReceivedDocument() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        Long accountId = extractAccountId(authentication);
        if (accountId == null) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        Account account =
                accountRepository.findById(accountId).orElseThrow(() -> new AppException(ErrorCode.UNAUTHENTICATED));

        boolean isPersonal = account.getAccountType() == AccountType.PERSONAL;

        // 1. Single JOIN FETCH query — loads Document + Group + UploadedBy eagerly with
        // workspace filter
        List<DocumentSigner> signers = documentSignerRepository.findReceivedDocumentsForWorkspace(
                user.getEmail(), accountId, isPersonal, userId);

        // 2. Deduplicate by groupId (same group → one response)
        Map<Integer, DocumentResponse> groupMap = new LinkedHashMap<>();
        Set<Integer> groupIds = new HashSet<>();

        for (DocumentSigner ds : signers) {
            Document d = ds.getDocument();
            if (d == null || d.getStatus() == null || d.getStatus() == DocumentStatus.DRAFT) {
                continue;
            }

            Integer groupId =
                    d.getDocumentGroup() != null ? d.getDocumentGroup().getGroupId() : null;
            // Use negative docId as key for documents without a group
            int key = groupId != null ? groupId : -d.getDocumentId();

            if (!groupMap.containsKey(key)) {
                DocumentResponse resp = toDocumentResponse(d);
                resp.setRecipient(ds.getSignerEmail());
                String signerStatusStr = null;
                if (ds.getStatus() != null) {
                    signerStatusStr = (ds.getStatus() == SignerStatus.WAITING || ds.getStatus() == SignerStatus.VIEWED)
                            ? "PENDING"
                            : ds.getStatus().name();
                }
                resp.setSignerStatus(signerStatusStr);
                groupMap.put(key, resp);
                if (groupId != null) groupIds.add(groupId);
            } /*else {
              	// Aggregate signerStatus: PENDING > DECLINED > SIGNED
              	DocumentResponse resp = groupMap.get(key);
              	if (ds.getStatus() != null) {
              		boolean isCurrentPending =
              				(ds.getStatus() == SignerStatus.WAITING || ds.getStatus() == SignerStatus.VIEWED);
              		boolean isCurrentDeclined = (ds.getStatus() == SignerStatus.DECLINED);

              		if ("PENDING".equals(resp.getSignerStatus())) {
              			// Already PENDING, keep it
              		} else if (isCurrentPending) {
              			resp.setSignerStatus("PENDING");
              		} else if (isCurrentDeclined) {
              			resp.setSignerStatus("DECLINED");
              		}
              	}
              }*/
        }

        // 3. Batch count fileCount per group in one query
        if (!groupIds.isEmpty()) {
            List<Object[]> counts = documentRepository.countDocumentsPerGroup(groupIds);
            Map<Integer, Long> fileCountMap = new HashMap<>();
            for (Object[] row : counts) {
                fileCountMap.put((Integer) row[0], (Long) row[1]); // group row[0] có row[1] tài liệu
            }
            for (DocumentResponse resp : groupMap.values()) {
                if (resp.getGroupId() != null) {
                    resp.setFileCount(fileCountMap.getOrDefault(resp.getGroupId(), 1L));
                }
            }
        }

        return new ArrayList<>(groupMap.values());
    }

    public DocumentResponse getDocumentById(Integer documentId) {
        Document document = getDocumentEntityById(documentId);
        return toDocumentResponse(document);
    }

    public List<DocumentResponse> getDraftGroup(Integer groupId) {
        // Kiểm tra membership trước khi trả về dữ liệu
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long accountId = extractAccountId(authentication);
        String userId = authentication.getName();
        permissionChecker.requireMembership(accountId, userId);

        // IDOR protection: verify group thuộc account hiện tại
        DocumentGroup group = documentGroupRepository.findByGroupId(groupId);
        if (group == null) {
            throw new AppException(ErrorCode.DOCUMENT_NOT_FOUND);
        }
        if (!group.getAccount().getAccountId().equals(accountId)) {
            throw new AppException(ErrorCode.USER_NO_PERMISSION);
        }

        List<Document> documents = documentRepository.findByDocumentGroup_GroupId(groupId);
        return documents.stream().map(this::toDocumentResponse).toList();
    }

    /**
     * Return structured detail for a document group: documents, recipients, and
     * fields.
     * Replaces the old approach of parsing JSON from the description column.
     */
    public GroupDetailResponse getGroupDetail(Integer groupId) {
        // Permission check: phải là member của account sở hữu group này
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long accountId = extractAccountId(authentication);
        String userId = authentication.getName();
        permissionChecker.requireMembership(accountId, userId);

        DocumentGroup group = documentGroupRepository.findByGroupId(groupId);
        if (group == null) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }

        // IDOR protection: verify group thuộc account hiện tại
        if (!group.getAccount().getAccountId().equals(accountId)) {
            throw new AppException(ErrorCode.USER_NO_PERMISSION);
        }

        List<Document> documents = documentRepository.findByDocumentGroup_GroupId(groupId);

        // Build per-document detail (each doc has its own signers + fields)
        List<DocumentDetailResponse> docDetailResponses = new ArrayList<>();

        for (int docIdx = 0; docIdx < documents.size(); docIdx++) {
            Document doc = documents.get(docIdx);
            final int fileIdx = docIdx;

            // Signers for this document
            List<DocumentSigner> docSigners = documentSignerRepository.findByDocument_DocumentId(doc.getDocumentId());
            List<RecipientResponse> docRecipients = docSigners.stream()
                    .map(ds -> RecipientResponse.builder()
                            .signerId(ds.getDocSignerId())
                            .email(ds.getSignerEmail())
                            .name(ds.getSignerName())
                            .role(ds.getRole())
                            .build())
                    .toList();

            // Fields for this document
            List<SignatureField> docFields = signatureFieldRepository.findByDocument_DocumentId(doc.getDocumentId());
            List<FieldResponse> docFieldResponses = docFields.stream()
                    .map(sf -> FieldResponse.builder()
                            .fieldId(sf.getFieldId())
                            .type(
                                    sf.getFieldType() != null
                                            ? sf.getFieldType().name().toLowerCase()
                                            : "signature")
                            .page(sf.getPageNumber())
                            .fileIndex(fileIdx)
                            .x(sf.getPosX())
                            .y(sf.getPosY())
                            .width(sf.getWidth())
                            .height(sf.getHeight())
                            .recipientId(
                                    sf.getDocSigner() != null
                                            ? sf.getDocSigner().getDocSignerId()
                                            : null)
                            .build())
                    .toList();

            docDetailResponses.add(DocumentDetailResponse.builder()
                    .documentId(doc.getDocumentId())
                    .originalFileUrl(doc.getOriginalFileUrl())
                    .status(doc.getStatus() != null ? doc.getStatus().name() : "DRAFT")
                    .recipients(docRecipients)
                    .fields(docFieldResponses)
                    .build());
        }

        return GroupDetailResponse.builder()
                .groupId(group.getGroupId())
                .groupName(group.getGroupName())
                .currentStep(group.getCurrentStep())
                .groupStatus(group.getGr_status())
                .expiresAt(group.getExpiresAt())
                .documents(docDetailResponses)
                .build();
    }

    // ─── Delete Methods ─────────────────────────────────────────────────

    /** Trạng thái cho phép xóa: DRAFT, VOID, DECLINED, EXPIRED */
    private static final Set<DocumentStatus> DELETABLE_STATUSES =
            Set.of(DocumentStatus.DRAFT, DocumentStatus.VOID, DocumentStatus.DECLINED, DocumentStatus.EXPIRED);

    @Transactional
    public void deleteDocumentById(Integer id) {
        Document document = getDocumentEntityById(id);

        // Status guard: không cho xóa document đang PENDING hoặc COMPLETED
        if (document.getStatus() != null && !DELETABLE_STATUSES.contains(document.getStatus())) {
            throw new AppException(ErrorCode.DOCUMENT_CANNOT_DELETE);
        }

        // Permission check: chỉ người upload hoặc ADMIN mới được xóa
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();
        Long accountId = extractAccountId(authentication);
        AccountMember member = permissionChecker.requireMembership(accountId, userId);

        boolean isUploader = document.getUploadedBy().getId().equals(userId);
        boolean isAdmin = member.getRole() == MemberRole.ADMIN;
        if (!isUploader && !isAdmin) {
            throw new AppException(ErrorCode.USER_NO_PERMISSION);
        }

        cleanupDocumentFiles(document);

        auditTrailService.deleteByDocumentId(document.getDocumentId());
        signatureFieldRepository.deleteByDocument_DocumentId(document.getDocumentId());
        documentSignerRepository.deleteByDocument_DocumentId(document.getDocumentId());

        documentRepository.delete(document);
    }

    @Transactional
    public void deleteGroupById(Integer id) {
        // Permission check: chỉ ADMIN hoặc người upload mới được xóa group
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();
        Long accountId = extractAccountId(authentication);
        AccountMember member = permissionChecker.requireMembership(accountId, userId);

        DocumentGroup group = documentGroupRepository.findByGroupId(id);
        if (group == null) throw new AppException(ErrorCode.DOCUMENT_NOT_FOUND);

        // Verify group thuộc account hiện tại
        if (!group.getAccount().getAccountId().equals(accountId)) {
            throw new AppException(ErrorCode.USER_NO_PERMISSION);
        }

        List<Document> documents = documentRepository.findByDocumentGroup_GroupId(id);
        if (!documents.isEmpty()) {
            // Status guard: kiểm tra TẤT CẢ documents trong group phải ở trạng thái cho
            // phép xóa
            boolean hasUndeletable = documents.stream()
                    .anyMatch(d -> d.getStatus() != null && !DELETABLE_STATUSES.contains(d.getStatus()));
            if (hasUndeletable) {
                throw new AppException(ErrorCode.DOCUMENT_CANNOT_DELETE);
            }

            // Chỉ ADMIN mới xóa group có doc người khác upload
            boolean hasOtherDocs =
                    documents.stream().anyMatch(d -> !d.getUploadedBy().getId().equals(userId));
            if (hasOtherDocs && member.getRole() != MemberRole.ADMIN) {
                throw new AppException(ErrorCode.USER_NO_PERMISSION);
            }

            for (Document d : documents) {
                cleanupDocumentFiles(d);
                auditTrailService.deleteByDocumentId(d.getDocumentId());
                signatureFieldRepository.deleteByDocument_DocumentId(d.getDocumentId());
                documentSignerRepository.deleteByDocument_DocumentId(d.getDocumentId());
                documentRepository.delete(d);
            }
        }
        documentGroupRepository.delete(group);
    }

    /** Xóa cả original file và final file (nếu có) trên MinIO */
    private void cleanupDocumentFiles(Document document) {
        if (document.getOriginalFileUrl() != null) {
            minioService.removeFile(StoragePathResolver.BUCKET_ORIGINAL, document.getOriginalFileUrl());
        }
        if (document.getFinalFileUrl() != null) {
            minioService.removeFile(StoragePathResolver.BUCKET_FINAL, document.getFinalFileUrl());
        }
    }

    // ─── Expiration Check ────────────────────────────────────────────────

    @Transactional
    public void checkAndExpireGroup(Integer groupId) {
        DocumentGroup group = documentGroupRepository.findByGroupId(groupId);
        if (group == null) return;

        // Only check PENDING groups with an expiration date
        if (!"PENDING".equals(group.getGr_status())) return;
        if (group.getExpiresAt() == null) return;
        if (group.getExpiresAt().isAfter(LocalDateTime.now())) return;

        // ── Expired! Update group, documents, and signers ──
        group.setGr_status(String.valueOf(DocumentStatus.EXPIRED));
        documentGroupRepository.save(group);

        List<Document> documents = documentRepository.findByDocumentGroup_GroupId(groupId);
        for (Document doc : documents) {
            if (doc.getStatus() == DocumentStatus.PENDING) {
                doc.setStatus(DocumentStatus.EXPIRED);
            }

            // Audit Trail: EXPIRED
            auditTrailService.logEvent(
                    doc,
                    com.spring.esign.enums.AuditEvent.EXPIRED,
                    null,
                    null,
                    doc.getOriginalFileHash(),
                    doc.getOriginalFileHash(),
                    null,
                    null,
                    null,
                    null,
                    null);

            // Mark WAITING/VIEWED signers as EXPIRED (keep SIGNED ones)
            List<DocumentSigner> signers = documentSignerRepository.findByDocument_DocumentId(doc.getDocumentId());
            for (DocumentSigner ds : signers) {
                if (ds.getStatus() == null
                        || ds.getStatus() == SignerStatus.WAITING
                        || ds.getStatus() == SignerStatus.VIEWED) {
                    ds.setStatus(SignerStatus.EXPIRED);
                }
            }
            documentSignerRepository.saveAll(signers);
        }

        if (!documents.isEmpty()) {
            User uploader = documents.get(0).getUploadedBy();
            String title = "Tài liệu đã hết hạn";
            String message = "Nhóm tài liệu \"" + group.getGroupName()
                    + "\" đã hết hạn do không được xử lý trong thời gian quy định.";

            // Gửi thông báo cho Uploader
            notificationsService.sendToUser(
                    uploader.getEmail(),
                    com.spring.esign.enums.Notifications.DOCUMENT_EXPIRED,
                    title,
                    message,
                    groupId,
                    "Hệ thống",
                    "system@esign.com");

            // Gửi thông báo cho tất cả những người ký (Recipients) - Đã tối ưu truy vấn N+1
            List<DocumentSigner> allSigners = documentSignerRepository.findByDocument_DocumentGroup_GroupId(groupId);
            Set<String> notifiedEmails = new HashSet<>();
            for (DocumentSigner ds : allSigners) {
                if (notifiedEmails.add(ds.getSignerEmail())
                        && !ds.getSignerEmail().equals(uploader.getEmail())) {
                    notificationsService.sendToUser(
                            ds.getSignerEmail(),
                            com.spring.esign.enums.Notifications.DOCUMENT_EXPIRED,
                            title,
                            message,
                            groupId,
                            "Hệ thống",
                            "system@esign.com");
                }
            }
        }

        documentRepository.saveAll(documents);
    }

    // ─── Internal Helpers ───────────────────────────────────────────────

    public InputStream downloadDocument(Integer documentId, boolean logAudit) {
        Document document = getDocumentEntityById(documentId);

        // Permission check: phải có quyền VIEW hoặc là người upload
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();
        Long accountId = extractAccountId(authentication);
        AccountMember member = permissionChecker.requireMembership(accountId, userId);

        boolean isUploader = document.getUploadedBy().getId().equals(userId);
        boolean canView = member.getRole() == MemberRole.ADMIN || Boolean.TRUE.equals(member.getCanViewDocs());
        if (!isUploader && !canView) {
            throw new AppException(ErrorCode.USER_NO_PERMISSION);
        }
        if (logAudit) {
            String downloadHash = (document.getFinalFileHash() != null)
                    ? document.getFinalFileHash()
                    : document.getOriginalFileHash();
            auditTrailService.logEvent(
                    document,
                    com.spring.esign.enums.AuditEvent.DOWNLOADED,
                    userRepository.findById(userId).orElse(null),
                    null,
                    downloadHash,
                    downloadHash,
                    null,
                    null,
                    null,
                    getClientIp(),
                    getUserAgent());
        }

        if (document.getFinalFileUrl() != null && !document.getFinalFileUrl().isEmpty()) {
            return minioService.downloadFile(StoragePathResolver.BUCKET_FINAL, document.getFinalFileUrl());
        }
        return minioService.downloadFile(StoragePathResolver.BUCKET_ORIGINAL, document.getOriginalFileUrl());
    }

    @Transactional
    public InputStream downloadDocumentByRecipient(Integer documentId, boolean logAudit) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();
        if (userId == null) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        Document document = documentRepository
                .findById(documentId)
                .orElseThrow(() -> new AppException(ErrorCode.DOCUMENT_NOT_FOUND));

        // Security: chỉ cần xác minh email của user nằm trong danh sách signer.
        // Tài liệu "nhận được" luôn thuộc workspace của NGƯỜI GỬI, không phải người nhận,
        // nên không cần so sánh docAccountId với accountId hiện tại.
        Long accountId = extractAccountId(authentication);
        String accountType = extractAccountType(authentication);
        DocumentSigner documentSigner =
                documentSignerRepository
                        .findByDocumentIdAndSignerEmailAndAccountIdFallback(documentId, user.getEmail(), accountId)
                        .stream()
                        .findFirst()
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NO_PERMISSION));

        if (logAudit) {
            String downloadHash = (document.getFinalFileHash() != null)
                    ? document.getFinalFileHash()
                    : document.getOriginalFileHash();
            auditTrailService.logEvent(
                    document,
                    com.spring.esign.enums.AuditEvent.DOWNLOADED,
                    user,
                    documentSigner,
                    downloadHash,
                    downloadHash,
                    null,
                    null,
                    null,
                    getClientIp(),
                    getUserAgent());
        }

        if (document.getFinalFileUrl() != null && !document.getFinalFileUrl().isEmpty()) {
            return minioService.downloadFile(StoragePathResolver.BUCKET_FINAL, document.getFinalFileUrl());
        }
        return minioService.downloadFile(StoragePathResolver.BUCKET_ORIGINAL, document.getOriginalFileUrl());
    }

    private Document getDocumentEntityById(Integer documentId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long accountId = extractAccountId(authentication);

        if (accountId == null) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        Document document = documentRepository
                .findById(documentId)
                .orElseThrow(() -> new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION));

        if (!document.getAccount().getAccountId().equals(accountId)) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        return document;
    }

    private String extractAccountType(Authentication authentication) {
        if (authentication instanceof JwtAuthenticationToken jwtToken) {
            return (String) jwtToken.getTokenAttributes().get("type");
        } else if (authentication.getCredentials() instanceof Jwt jwt) {
            return (String) jwt.getClaims().get("type");
        }
        return null;
    }

    private Long extractAccountId(Authentication authentication) {
        if (authentication instanceof JwtAuthenticationToken jwtToken) {
            return (Long) jwtToken.getTokenAttributes().get("accountId");
        } else if (authentication.getCredentials() instanceof Jwt jwt) {
            return (Long) jwt.getClaims().get("accountId");
        }
        return null;
    }

    private DocumentResponse toDocumentResponse(Document document) {
        DocumentStatus actualStatus = document.getStatus();
        if (document.getDocumentGroup() != null && document.getDocumentGroup().getGr_status() != null) {
            try {
                actualStatus =
                        DocumentStatus.valueOf(document.getDocumentGroup().getGr_status());
            } catch (Exception e) {
                // Ignore fallback
            }
        }

        return DocumentResponse.builder()
                .documentId(document.getDocumentId())
                .groupId(
                        document.getDocumentGroup() != null
                                ? document.getDocumentGroup().getGroupId()
                                : null)
                .title(
                        document.getDocumentGroup() != null
                                ? document.getDocumentGroup().getGroupName()
                                : "Untitled")
                .originalFileUrl(document.getOriginalFileUrl())
                .status(actualStatus)
                .createdAt(document.getCreatedAt())
                .updatedAt(document.getUpdatedAt())
                .uploadedBy(document.getUploadedBy().getEmail())
                .recipient(null)
                .fileCount(1)
                .expiresAt(
                        document.getDocumentGroup() != null
                                ? document.getDocumentGroup().getExpiresAt()
                                : null)
                .build();
    }

    @Transactional
    public GroupReceivedDetailResponse getReceivedGroupDetail(Integer groupId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        Long accountId = extractAccountId(authentication);
        String accountType = extractAccountType(authentication);

        if (accountId == null) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        // Với Personal workspace, accountId vẫn được lưu là ID thực của Personal account,
        // hoặc null nếu signer không được gán sẵn.
        Long signerAccountId = accountId;

        // Không cần check docAccountId vs accountId vì tài liệu "nhận được"
        // luôn thuộc workspace của NGƯỜI GỬI. Query findReceivedDetail đã lọc theo
        // signerEmail nên chỉ trả về tài liệu mà user là recipient hợp lệ.
        DocumentGroup group = documentGroupRepository.findById(groupId).orElse(null);

        // Permission check: chỉ cần là member của account hiện tại.
        // Không cần check canSign/canViewDocs vì đây là tài liệu được gửi đích danh cho user.
        // Query findReceivedDetail đã lọc theo signerEmail nên chỉ trả về tài liệu mà user là recipient.
        permissionChecker.requireMembership(accountId, userId);

        // ── Lazy expiration check ──
        checkAndExpireGroup(groupId);

        List<Object[]> rows = documentRepository.findReceivedDetail(groupId, user.getEmail(), signerAccountId);

        if (rows.isEmpty()) return null;

        // --- Ghi nhận sự kiện VIEWED (Chỉ ghi lần đầu tiên) ---
        List<DocumentSigner> signersToView = documentSignerRepository.findByGroupIdAndEmailAndAccountIdFallback(
                groupId, user.getEmail(), signerAccountId);

        List<DocumentSigner> signersToUpdate = new ArrayList<>();
        String ip = getClientIp();
        String ua = getUserAgent();

        for (DocumentSigner ds : signersToView) {
            if (ds.getStatus() == com.spring.esign.enums.SignerStatus.WAITING) {
                ds.setStatus(com.spring.esign.enums.SignerStatus.VIEWED);
                signersToUpdate.add(ds);

                auditTrailService.logEvent(
                        ds.getDocument(),
                        com.spring.esign.enums.AuditEvent.VIEWED,
                        user,
                        ds,
                        ds.getDocument().getOriginalFileHash(),
                        ds.getDocument().getOriginalFileHash(),
                        null,
                        null,
                        null,
                        ip,
                        ua);
            }
        }
        if (!signersToUpdate.isEmpty()) {
            documentSignerRepository.saveAll(signersToUpdate);
        }
        // --------------------------------------------------------

        Object[] fisrtRow = rows.getFirst();

        // Group
        GroupReceivedDetailResponse groupReceivedDetailResponse = new GroupReceivedDetailResponse();
        groupReceivedDetailResponse.setGroupId(((Number) fisrtRow[0]).intValue());
        groupReceivedDetailResponse.setGroupName((String) fisrtRow[1]);
        groupReceivedDetailResponse.setSignerEmail((String) fisrtRow[6]);
        groupReceivedDetailResponse.setSignerName((String) fisrtRow[18]);
        groupReceivedDetailResponse.setSignerRole((String) fisrtRow[7]);
        groupReceivedDetailResponse.setSignningMode((String) fisrtRow[9]);
        Integer order = ((Number) fisrtRow[8]).intValue();
        groupReceivedDetailResponse.setSingerOrder(order);

        Map<Integer, DocumentReceivedResponse> docMap = new LinkedHashMap<>();

        for (Object[] row : rows) {
            Integer docId = ((Number) row[2]).intValue();
            String fileUrl = (String) row[3];
            String status = (String) row[4];

            // document
            DocumentReceivedResponse documentReceivedResponse = docMap.computeIfAbsent(docId, id -> {
                DocumentReceivedResponse doc = new DocumentReceivedResponse();
                doc.setDocumentId(docId);
                doc.setFileName(extractFileName(fileUrl));
                doc.setStatus(status);
                doc.setFields(new ArrayList<>());
                return doc;
            });
            // Field
            if (row[10] != null) {
                FieldReceivedResponse f = new FieldReceivedResponse();
                f.setFieldId(((Number) row[10]).intValue());
                f.setType(String.valueOf(row[11]));
                f.setPage(((Number) row[12]).intValue());
                f.setX((Float) row[13]);
                f.setY((Float) row[14]);
                f.setWidth((Float) row[15]);
                f.setHeight((Float) row[16]);
                f.setValue((String) row[17]);

                documentReceivedResponse.getFields().add(f);
            }
        }
        groupReceivedDetailResponse.setDocuments(new ArrayList<>(docMap.values()));
        return groupReceivedDetailResponse;
    }

    private String extractFileName(String fileName) {
        if (fileName == null || fileName.isEmpty()) return null;

        // 1. Bỏ extension (.pdf, .docx...)
        int dotIndex = fileName.lastIndexOf(".");
        if (dotIndex != -1) {
            fileName = fileName.substring(0, dotIndex);
        }

        // 2. Bỏ prefix kiểu timestamp_
        int underscoreIndex = fileName.indexOf("_");
        if (underscoreIndex != -1) {
            fileName = fileName.substring(underscoreIndex + 1);
        }

        return fileName;
    }

    @Transactional
    public Integer updateDraft(Integer groupId, UpdateDraftRequest request) {
        // Permission check: phải là member + có quyền UPLOAD
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Long accountId = extractAccountId(authentication);
        String userId = authentication.getName();
        permissionChecker.requirePermission(accountId, userId, "UPLOAD");

        // ── 1. Load & update group metadata ──
        DocumentGroup group = documentGroupRepository.findByGroupId(groupId);
        if (group == null) throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);

        // Verify group thuộc account hiện tại
        if (!group.getAccount().getAccountId().equals(accountId)) {
            throw new AppException(ErrorCode.USER_NO_PERMISSION);
        }

        if (request.getDocumentName() != null) group.setGroupName(request.getDocumentName());
        if (request.getCurrentStep() != null) group.setCurrentStep(request.getCurrentStep());
        documentGroupRepository.save(group);

        Boolean enableSigningOrder = request.getEnableSigningOrder() != null ? request.getEnableSigningOrder() : false;
        SigningMode authMode = enableSigningOrder ? SigningMode.SEQUENTIAL : SigningMode.PARALLEL;

        // ── 2. Load all documents in group ──
        List<Document> documents = documentRepository.findByDocumentGroup_GroupId(groupId);
        if (documents == null || documents.isEmpty()) return groupId;

        List<Integer> docIds = documents.stream().map(Document::getDocumentId).toList();
        Map<Integer, Document> docIdToDoc = new HashMap<>();
        for (Document d : documents) docIdToDoc.put(d.getDocumentId(), d);

        // ── 3. Delete signers (+ their fields cascade) ──
        List<Integer> deletedDocSignerIds = request.getDeletedDocSignerIds();
        if (deletedDocSignerIds != null && !deletedDocSignerIds.isEmpty()) {
            long validCount = documentSignerRepository.countByIdsAndGroupId(deletedDocSignerIds, groupId);
            if (validCount != deletedDocSignerIds.size()) {
                throw new AppException(ErrorCode.USER_NO_PERMISSION);
            }
            signatureFieldRepository.deleteByDocSignerIdIn(deletedDocSignerIds);
            documentSignerRepository.deleteAllByIdInBatch(deletedDocSignerIds);
        }

        // ── 4. Delete specific fields by ID ──
        List<Integer> deletedFieldIds = request.getDeletedFieldIds();
        if (deletedFieldIds != null && !deletedFieldIds.isEmpty()) {
            long validCount = signatureFieldRepository.countByIdsAndGroupId(deletedFieldIds, groupId);
            if (validCount != deletedFieldIds.size()) {
                throw new AppException(ErrorCode.USER_NO_PERMISSION);
            }
            signatureFieldRepository.deleteByFieldIdIn(deletedFieldIds);
        }

        // ── 5. Bulk fetch users for email validation ──
        Set<String> allEmails = new HashSet<>();
        if (request.getUpsertSigners() != null) {
            for (UpsertSignerRequest s : request.getUpsertSigners()) {
                if (s.getEmail() != null) allEmails.add(s.getEmail().trim().toLowerCase());
            }
        }
        if (request.getUpsertFields() != null) {
            for (UpsertFieldRequest f : request.getUpsertFields()) {
                if (f.getRecipientEmail() != null)
                    allEmails.add(f.getRecipientEmail().trim().toLowerCase());
            }
        }
        Map<String, User> emailToUser = new HashMap<>();
        if (!allEmails.isEmpty()) {
            List<User> matchedUsers = userRepository.findByEmailIn(allEmails);
            for (User u : matchedUsers) {
                if (u.getEmail() != null) emailToUser.put(u.getEmail().toLowerCase(), u);
            }
        }

        // ── 6. Upsert signers (per document) ──
        Map<Integer, Map<String, DocumentSigner>> signerLookup = new HashMap<>();

        if (request.getUpsertSigners() != null && !request.getUpsertSigners().isEmpty()) {
            for (Document doc : documents) {
                Integer docId = doc.getDocumentId();
                Map<String, DocumentSigner> docSignerMap = new HashMap<>();

                for (UpsertSignerRequest sr : request.getUpsertSigners()) {
                    if (sr.getEmail() == null || sr.getEmail().isBlank()) continue;
                    String emailKey = sr.getEmail().trim().toLowerCase() + "_"
                            + (sr.getAccountId() != null ? sr.getAccountId() : "personal");

                    User signerUser = emailToUser.get(sr.getEmail().trim().toLowerCase());
                    if (signerUser == null) throw new AppException(ErrorCode.USER_NOT_EXISTED);

                    DocumentSigner ds = documentSignerRepository
                            .findByDocumentIdAndSignerEmailAndAccountIdFallback(docId, sr.getEmail(), sr.getAccountId())
                            .stream()
                            .findFirst()
                            .orElse(null);

                    if (ds != null) {
                        ds.setSignerName(sr.getName());
                        ds.setRole(sr.getRole() == null ? "signer" : sr.getRole());
                        ds.setSigningOrder(sr.getSigningOrder() == null ? 1 : sr.getSigningOrder());
                        ds.setSigningMode(authMode);
                    } else {
                        Account targetAccount = null;
                        if (sr.getAccountId() != null) {
                            targetAccount = accountRepository
                                    .findById(sr.getAccountId())
                                    .orElse(null);
                        }
                        ds = DocumentSigner.builder()
                                .document(doc)
                                .signerEmail(sr.getEmail())
                                .signerName(sr.getName())
                                .user(signerUser)
                                .account(targetAccount)
                                .role(sr.getRole() == null ? "signer" : sr.getRole())
                                .signingOrder(sr.getSigningOrder() == null ? 1 : sr.getSigningOrder())
                                .signingMode(authMode)
                                .build();
                    }
                    ds = documentSignerRepository.save(ds);
                    docSignerMap.put(emailKey, ds);
                }
                signerLookup.put(docId, docSignerMap);
            }
        }

        // ── 7. Upsert fields ──
        if (request.getUpsertFields() != null && !request.getUpsertFields().isEmpty()) {
            for (UpsertFieldRequest fr : request.getUpsertFields()) {
                if (fr.getRecipientEmail() == null || fr.getRecipientEmail().isBlank()) continue;
                if (fr.getDocumentId() == null) continue;

                Document targetDoc = docIdToDoc.get(fr.getDocumentId());
                if (targetDoc == null) continue;

                String emailKey = fr.getRecipientEmail().trim().toLowerCase() + "_"
                        + (fr.getAccountId() != null ? fr.getAccountId() : "personal");

                DocumentSigner ds = null;
                Map<String, DocumentSigner> docMap = signerLookup.get(fr.getDocumentId());
                if (docMap != null) ds = docMap.get(emailKey);
                if (ds == null) {
                    ds = documentSignerRepository
                            .findByDocumentIdAndSignerEmailAndAccountIdFallback(
                                    fr.getDocumentId(), fr.getRecipientEmail(), fr.getAccountId())
                            .stream()
                            .findFirst()
                            .orElse(null);
                }
                if (ds == null) continue;

                if (fr.getId() != null) {
                    Optional<SignatureField> existingField = signatureFieldRepository.findById(fr.getId());
                    if (existingField.isPresent()) {
                        SignatureField sf = existingField.get();
                        sf.setPageNumber(fr.getPage());
                        sf.setPosX(fr.getX());
                        sf.setPosY(fr.getY());
                        sf.setWidth(fr.getWidth() != null ? fr.getWidth() : 20f);
                        sf.setHeight(fr.getHeight() != null ? fr.getHeight() : 10f);
                        sf.setFieldType(mapFieldType(fr.getType()));
                        sf.setDocSigner(ds);
                        signatureFieldRepository.save(sf);
                    }
                } else {
                    SignatureField sf = SignatureField.builder()
                            .document(targetDoc)
                            .docSigner(ds)
                            .pageNumber(fr.getPage())
                            .posX(fr.getX())
                            .posY(fr.getY())
                            .width(fr.getWidth() != null ? fr.getWidth() : 20f)
                            .height(fr.getHeight() != null ? fr.getHeight() : 10f)
                            .fieldType(mapFieldType(fr.getType()))
                            .build();
                    signatureFieldRepository.save(sf);
                }
            }
        }

        return groupId;
    }

    public String hashDocumentSHA256(InputStream is) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");

            byte[] buffer = new byte[8192];
            int bytesRead;

            while ((bytesRead = is.read(buffer)) != -1) {
                digest.update(buffer, 0, bytesRead);
            }

            byte[] hashBytes = digest.digest();

            StringBuilder hex = new StringBuilder(hashBytes.length * 2);
            for (byte b : hashBytes) {
                hex.append(String.format("%02x", b));
            }

            return hex.toString();
        } catch (Exception e) {
            throw new RuntimeException("Hash message error", e);
        }
    }

    private String getClientIp() {
        ServletRequestAttributes attribs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attribs != null) {
            HttpServletRequest request = attribs.getRequest();
            String ip = request.getHeader("X-Forwarded-For");
            if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
                ip = request.getRemoteAddr();
            }
            return ip != null ? ip.split(",")[0].trim() : null;
        }
        return null;
    }

    private String getUserAgent() {
        ServletRequestAttributes attribs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attribs != null) {
            HttpServletRequest request = attribs.getRequest();
            return request.getHeader("User-Agent");
        }
        return null;
    }
}
