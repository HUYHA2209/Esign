package com.spring.esign.service;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.spring.esign.dto.request.*;
import com.spring.esign.dto.response.*;
import com.spring.esign.entity.*;
import com.spring.esign.enums.DocumentStatus;
import com.spring.esign.enums.FieldType;
import com.spring.esign.exception.AppException;
import com.spring.esign.exception.ErrorCode;
import com.spring.esign.repository.*;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DocumentService {

    DocumentGroupRepository documentGroupRepository;
    MinioService minioService;
    DocumentRepository documentRepository;
    UserRepository userRepository;
    AccountRepository accountRepository;
    SignatureFieldRepository signatureFieldRepository;
    DocumentSignerRepository documentSignerRepository;

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

        // ── 2. Build docId → Document map (O(1) lookup) ──
        Map<Integer, Document> docIdToDoc = new HashMap<>();
        Map<Integer, Integer> docIdToIdx = new HashMap<>();
        for (int i = 0; i < documents.size(); i++) {
            Document d = documents.get(i);
            docIdToDoc.put(d.getDocumentId(), d);
            docIdToIdx.put(d.getDocumentId(), i);
        }

        // ── 3. Update status on all documents / group ──
        for (Document document : documents) document.setStatus(DocumentStatus.PENDING);
        DocumentGroup dg = documentGroupRepository.findByGroupId(groupId);
        if (dg != null) dg.setGr_status(String.valueOf(DocumentStatus.PENDING));
        documentRepository.saveAll(documents);

        // ── 4. Flatten signers+fields into Map<docId, List<FieldBundle>> ──
        // FieldBundle = (signer email/name/role, field coords)
        List<SignerDto> signers = request != null && request.getSigners() != null ? request.getSigners() : List.of();

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
                if (targetDoc == null && f.getFileIndex() != null) {
                    // fallback: positional index (for older FE payloads)
                    if (f.getFileIndex() < documents.size()) {
                        targetDoc = documents.get(f.getFileIndex());
                    }
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
                String key = sd.getEmail().toLowerCase();
                if (!emailToSigner.containsKey(key)) {
                    DocumentSigner ds = DocumentSigner.builder()
                            .document(doc)
                            .signerEmail(sd.getEmail())
                            .signerName(sd.getName())
                            .role(sd.getRole() == null ? "signer" : sd.getRole())
                            .signingOrder(sd.getSigningOrder() == null ? 1 : sd.getSigningOrder())
                            .build();
                    emailToSigner.put(key, ds);
                    signersToSave.add(ds);
                }
            }
            List<DocumentSigner> saved = documentSignerRepository.saveAll(signersToSave);
            // Rebuild map with DB-assigned IDs
            Map<String, DocumentSigner> savedMap = new HashMap<>();
            for (DocumentSigner ds : saved) savedMap.put(ds.getSignerEmail().toLowerCase(), ds);

            // Build fields
            List<SignatureField> newFields = new ArrayList<>();
            for (Object[] b : bundles) {
                SignerDto sd = (SignerDto) b[0];
                FieldRequest f = (FieldRequest) b[1];
                DocumentSigner ds = savedMap.get(sd.getEmail().toLowerCase());
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
    }

    // ─── Save Draft Document ────────────────────────────────────────────

    @Transactional
    public Integer saveDraftDocument(List<MultipartFile> files, SaveDraftDocumentRequest dataJson) {
        log.info("Saving draft document. Metadata: {}", dataJson);

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();
        Long accountId = extractAccountId(authentication);

        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));
        Account account = null;
        if (accountId != null) {
            account = accountRepository
                    .findById(accountId)
                    .orElseThrow(() -> new AppException(ErrorCode.UNAUTHENTICATED));
        }

        // 1. Find or create DocumentGroup
        DocumentGroup documentGroup = findOrCreateGroup(dataJson.getGroupId(), dataJson.getDocumentName());

        // Save currentStep to group
        if (dataJson.getCurrentStep() != null) {
            documentGroup.setCurrentStep(dataJson.getCurrentStep());
        }
        documentGroupRepository.save(documentGroup);

        // 2. Upload new files (if any)
        if (files != null && !files.isEmpty() && account != null) {
            for (MultipartFile file : files) {
                String objectName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
                minioService.uploadFile(file, "document-current", objectName);

                Document document = Document.builder()
                        .uploadedBy(user)
                        .account(account)
                        .originalFileUrl(objectName)
                        .status(DocumentStatus.DRAFT)
                        .documentGroup(documentGroup)
                        .build();

                documentRepository.save(document);
                log.info("Saved document draft to DB: {}", document.getDocumentId());
            }
        }

        // 3. Reload docs (sorted by PK) and build Map<docId, Document> for O(1) lookup
        List<Document> allDocsInGroup = documentRepository.findByDocumentGroup_GroupId(documentGroup.getGroupId());
        if (allDocsInGroup == null || allDocsInGroup.isEmpty()) return documentGroup.getGroupId();

        Map<Integer, Document> docIdToDoc = new HashMap<>();
        for (Document d : allDocsInGroup) docIdToDoc.put(d.getDocumentId(), d);

        // Build recipient tempId -> SignerDto map (for O(1) lookup)
        Map<String, SignerDto> recipientMap = new HashMap<>();
        if (dataJson.getRecipients() != null) {
            for (SignerDto r : dataJson.getRecipients()) {
                if (r.getId() != null) recipientMap.put(r.getId().toString(), r);
            }
        }

        // Flatten all fields into Map<docId, List<FieldEntry>>
        // FieldEntry = (SignerDto recipient, FieldRequest field)
        Map<Integer, List<Object[]>> fieldsByDoc = new HashMap<>();
        if (dataJson.getFields() != null) {
            for (FieldRequest f : dataJson.getFields()) {
                // Resolve target document by documentId (preferred) or fileIndex (fallback)
                Document targetDoc = null;
                if (f.getDocumentId() != null) {
                    targetDoc = docIdToDoc.get(f.getDocumentId());
                }
                if (targetDoc == null && f.getFileIndex() != null && f.getFileIndex() < allDocsInGroup.size()) {
                    targetDoc = allDocsInGroup.get(f.getFileIndex());
                }
                if (targetDoc == null) continue;

                SignerDto recipient = f.getRecipientId() != null
                        ? recipientMap.get(f.getRecipientId().toString())
                        : null;
                if (recipient == null) continue; // skip orphan fields

                fieldsByDoc
                        .computeIfAbsent(targetDoc.getDocumentId(), k -> new ArrayList<>())
                        .add(new Object[] {recipient, f});
            }
        }

        // Persist signers + fields per document
        for (Document doc : allDocsInGroup) {
            Integer docId = doc.getDocumentId();

            // Always clear old data first
            documentSignerRepository.deleteByDocument_DocumentId(docId);
            signatureFieldRepository.deleteByDocument_DocumentId(docId);

            List<Object[]> entries = fieldsByDoc.getOrDefault(docId, List.of());
            if (entries.isEmpty()) continue; // no fields on this doc

            // Collect unique signers for this doc
            Map<String, DocumentSigner> emailToSigner = new HashMap<>();
            List<DocumentSigner> signersToSave = new ArrayList<>();
            for (Object[] e : entries) {
                SignerDto r = (SignerDto) e[0];
                if (r.getEmail() == null) continue;
                String key = r.getEmail().toLowerCase();
                if (!emailToSigner.containsKey(key)) {
                    DocumentSigner ds = DocumentSigner.builder()
                            .document(doc)
                            .signerEmail(r.getEmail())
                            .signerName(r.getName())
                            .role("signer")
                            .build();
                    emailToSigner.put(key, ds);
                    signersToSave.add(ds);
                }
            }
            List<DocumentSigner> savedSigners = documentSignerRepository.saveAll(signersToSave);
            Map<String, DocumentSigner> savedMap = new HashMap<>();
            for (DocumentSigner ds : savedSigners)
                savedMap.put(ds.getSignerEmail().toLowerCase(), ds);

            // Build SignatureField records
            List<SignatureField> sigFields = new ArrayList<>();
            for (Object[] e : entries) {
                SignerDto r = (SignerDto) e[0];
                FieldRequest f = (FieldRequest) e[1];
                if (r.getEmail() == null) continue;
                DocumentSigner ds = savedMap.get(r.getEmail().toLowerCase());
                sigFields.add(SignatureField.builder()
                        .document(doc)
                        .docSigner(ds)
                        .pageNumber(f.getPage())
                        .posX(f.getX())
                        .posY(f.getY())
                        .width(f.getWidth() != null ? f.getWidth() : 20f)
                        .height(f.getHeight() != null ? f.getHeight() : 10f)
                        .fieldType(mapFieldType(f.getType()))
                        .build());
            }
            if (!sigFields.isEmpty()) signatureFieldRepository.saveAll(sigFields);
        }

        return documentGroup.getGroupId();
    }

    /**
     * Find existing group by ID or create a new one.
     */
    private DocumentGroup findOrCreateGroup(Integer groupId, String groupName) {
        if (groupId != null) {
            DocumentGroup existing = documentGroupRepository.findById(groupId).orElse(null);
            if (existing != null) {
                existing.setGroupName(groupName);
                return existing;
            }
        }
        return DocumentGroup.builder().groupName(groupName).build();
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
        Long accountId = extractAccountId(authentication);

        if (accountId == null) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }

        List<Document> documents = documentRepository.findByAccount_AccountId(accountId);
        return documents.stream().map(this::toDocumentResponse).toList();
    }

    public List<DocumentResponse> getReceivedDocument() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        List<DocumentSigner> signers = documentSignerRepository.findBySignerEmail(user.getEmail());
        List<DocumentResponse> results = new ArrayList<>();
        for (DocumentSigner ds : signers) {
            Document d = ds.getDocument();
            if (d == null) continue;
            DocumentResponse resp = toDocumentResponse(d);
            resp.setRecipient(ds.getSignerEmail());
            if (d.getDocumentGroup() != null) {
                List<Document> groupDocs = documentRepository.findByDocumentGroup_GroupId(
                        d.getDocumentGroup().getGroupId());
                resp.setFileCount(groupDocs != null ? groupDocs.size() : 1);
            }
            results.add(resp);
        }
        return results;
    }

    public DocumentResponse getDocumentById(Integer documentId) {
        Document document = getDocumentEntityById(documentId);
        return toDocumentResponse(document);
    }

    public List<DocumentResponse> getDraftGroup(Integer groupId) {
        List<Document> documents = documentRepository.findByDocumentGroup_GroupId(groupId);
        return documents.stream().map(this::toDocumentResponse).toList();
    }

    /**
     * Return structured detail for a document group: documents, recipients, and
     * fields.
     * Replaces the old approach of parsing JSON from the description column.
     */
    public GroupDetailResponse getGroupDetail(Integer groupId) {
        DocumentGroup group = documentGroupRepository.findByGroupId(groupId);
        if (group == null) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
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
                .documents(docDetailResponses)
                .build();
    }

    // ─── Delete Methods ─────────────────────────────────────────────────

    @Transactional
    public void deleteDocumentById(Integer id) {
        Document document = getDocumentEntityById(id);

        if (document.getOriginalFileUrl() != null) {
            minioService.removeFile("document-current", document.getOriginalFileUrl());
        }

        signatureFieldRepository.deleteByDocument_DocumentId(document.getDocumentId());
        documentSignerRepository.deleteByDocument_DocumentId(document.getDocumentId());

        documentRepository.delete(document);
    }

    @Transactional
    public void deleteGroupById(Integer id) {
        List<Document> documents = documentRepository.findByDocumentGroup_GroupId(id);
        if (!documents.isEmpty()) {
            for (Document d : documents) {
                deleteDocumentById(d.getDocumentId());
            }
        }
        documentGroupRepository.delete(documentGroupRepository.findByGroupId(id));
    }

    // ─── Internal Helpers ───────────────────────────────────────────────

    public InputStream downloadDocument(Integer documentId) {
        Document document = getDocumentEntityById(documentId);
        return minioService.downloadFile("document-current", document.getOriginalFileUrl());
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

    private Long extractAccountId(Authentication authentication) {
        if (authentication instanceof JwtAuthenticationToken jwtToken) {
            return (Long) jwtToken.getTokenAttributes().get("accountId");
        } else if (authentication.getCredentials() instanceof Jwt jwt) {
            return (Long) jwt.getClaims().get("accountId");
        }
        return null;
    }

    private DocumentResponse toDocumentResponse(Document document) {
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
                .status(document.getStatus())
                .createdAt(document.getCreatedAt())
                .updatedAt(document.getUpdatedAt())
                .uploadedBy(document.getUploadedBy().getFullName())
                .recipient(null)
                .fileCount(1)
                .build();
    }
}
