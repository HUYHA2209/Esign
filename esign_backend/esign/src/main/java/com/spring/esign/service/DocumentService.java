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
        if (groupId == null) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }

        List<Document> documents = documentRepository.findByDocumentGroup_GroupId(groupId);

        if (documents == null || documents.isEmpty()) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User currentUser = userRepository.findById(authentication.getName()).orElse(null);
        if (currentUser == null) throw new AppException(ErrorCode.UNAUTHENTICATED);

        for (Document document : documents) {
            document.setStatus(DocumentStatus.PENDING);
        }

        DocumentGroup dg = documentGroupRepository.findByGroupId(groupId);
        if (dg != null) dg.setGr_status(String.valueOf(DocumentStatus.PENDING));

        documentRepository.saveAll(documents);

        // persist signers and signature fields for ALL documents in the group
        List<SignerDto> signers = request != null && request.getSigners() != null ? request.getSigners() : List.of();

        for (int docIdx = 0; docIdx < documents.size(); docIdx++) {
            Document doc = documents.get(docIdx);

            // clear existing signers and fields for this document
            documentSignerRepository.deleteByDocument_DocumentId(doc.getDocumentId());
            signatureFieldRepository.deleteByDocument_DocumentId(doc.getDocumentId());

            // create signers for this specific document
            List<DocumentSigner> toSavePerDoc = new ArrayList<>();
            for (SignerDto sd : signers) {
                DocumentSigner ds = DocumentSigner.builder()
                        .document(doc)
                        .signerEmail(sd.getEmail())
                        .signerName(sd.getName())
                        .role(sd.getRole() == null ? "signer" : sd.getRole())
                        .signingOrder(sd.getSigningOrder() == null ? 1 : sd.getSigningOrder())
                        .build();
                toSavePerDoc.add(ds);
            }

            List<DocumentSigner> savedSignersPerDoc =
                    toSavePerDoc.isEmpty() ? List.of() : documentSignerRepository.saveAll(toSavePerDoc);

            // Map email -> signer entity for this document
            Map<String, DocumentSigner> emailToSignerPerDoc = new HashMap<>();
            for (DocumentSigner ds : savedSignersPerDoc)
                emailToSignerPerDoc.put(ds.getSignerEmail().toLowerCase(), ds);

            // Build signature fields that belong to this document (by fileIndex)
            List<SignatureField> newFieldsForDoc = new ArrayList<>();
            for (SignerDto sd : signers) {
                DocumentSigner ds = emailToSignerPerDoc.get(sd.getEmail().toLowerCase());
                if (sd.getFields() != null && ds != null) {
                    for (FieldRequest f : sd.getFields()) {
                        Integer fIndex = f.getFileIndex();
                        boolean belongsHere = (fIndex != null) ? (fIndex.intValue() == docIdx) : (docIdx == 0);
                        if (!belongsHere) continue;

                        SignatureField sf = SignatureField.builder()
                                .document(doc)
                                .docSigner(ds)
                                .pageNumber(f.getPage())
                                .posX(f.getX())
                                .posY(f.getY())
                                .width(f.getWidth())
                                .height(f.getHeight())
                                .fieldType(mapFieldType(f.getType()))
                                .build();
                        newFieldsForDoc.add(sf);
                    }
                }
            }

            if (!newFieldsForDoc.isEmpty()) signatureFieldRepository.saveAll(newFieldsForDoc);
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

        // 3. Save recipients and fields for all documents in the group
        List<Document> allDocsInGroup = documentRepository.findByDocumentGroup_GroupId(documentGroup.getGroupId());
        if (allDocsInGroup != null && !allDocsInGroup.isEmpty()) {
            for (Document doc : allDocsInGroup) {
                List<DocumentSigner> savedSigners = saveRecipients(doc, dataJson.getRecipients());
                saveSignatureFields(doc, dataJson.getFields(), dataJson.getRecipients(), savedSigners);
            }
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
        return DocumentGroup.builder()
                .groupName(groupName)
                .build();
    }

    // ─── Save Recipients ────────────────────────────────────────────────

    private List<DocumentSigner> saveRecipients(Document document, List<RecipientRequest> recipientRequests) {
        // Clear existing recipients for draft
        documentSignerRepository.deleteByDocument_DocumentId(document.getDocumentId());

        List<DocumentSigner> signers = new ArrayList<>();
        if (recipientRequests == null) return signers;

        for (RecipientRequest recipient : recipientRequests) {
            DocumentSigner signer = DocumentSigner.builder()
                    .document(document)
                    .signerEmail(recipient.getEmail())
                    .signerName(recipient.getName())
                    .role("signer") // default
                    .build();
            signers.add(signer);
        }

        if (!signers.isEmpty()) {
            return documentSignerRepository.saveAll(signers);
        }
        return signers;
    }

    // ─── Save Signature Fields ──────────────────────────────────────────

    private void saveSignatureFields(
            Document document,
            List<FieldRequest> fields,
            List<RecipientRequest> recipients,
            List<DocumentSigner> savedSigners) {
        // Clear existing fields first
        signatureFieldRepository.deleteByDocument_DocumentId(document.getDocumentId());

        if (fields == null) return;

        // Map React tempId -> Email (from Request)
        Map<String, String> tempIdToEmail = new HashMap<>();
        if (recipients != null) {
            for (RecipientRequest r : recipients) {
                tempIdToEmail.put(r.getId().toString(), r.getEmail());
            }
        }

        // Map Email -> DocumentSigner Entity (from previously batched inserts)
        Map<String, DocumentSigner> emailToSigner = new HashMap<>();
        if (savedSigners != null) {
            for (DocumentSigner ds : savedSigners) {
                emailToSigner.put(ds.getSignerEmail(), ds);
            }
        }

        List<SignatureField> sigFields = new ArrayList<>();

        for (FieldRequest field : fields) {

            FieldType fieldType = mapFieldType(field.getType());
            DocumentSigner signer = null;

            if (field.getRecipientId() != null) {
                String email = tempIdToEmail.get(field.getRecipientId().toString());
                if (email != null) {
                    signer = emailToSigner.get(email);
                }
            }

            SignatureField sigField = SignatureField.builder()
                    .document(document)
                    .pageNumber(field.getPage())
                    .posX(field.getX())
                    .posY(field.getY())
                    .width(field.getWidth() != null ? field.getWidth() : 20f)
                    .height(field.getHeight() != null ? field.getHeight() : 10f)
                    .fieldType(fieldType)
                    .docSigner(signer)
                    .build();

            sigFields.add(sigField);
        }

        if (!sigFields.isEmpty()) {
            signatureFieldRepository.saveAll(sigFields);
        }
    }

    private FieldType mapFieldType(String type) {
        switch (type.toLowerCase()) {
            case "signature":
            case "initial":
                return FieldType.SIGNATURE;
            case "checkbox":
                return FieldType.CHECKBOX;
            case "date":
                return FieldType.DATE;
            default:
                return FieldType.TEXT;
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
     * Return structured detail for a document group: documents, recipients, and fields.
     * Replaces the old approach of parsing JSON from the description column.
     */
    public GroupDetailResponse getGroupDetail(Integer groupId) {
        DocumentGroup group = documentGroupRepository.findByGroupId(groupId);
        if (group == null) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }

        List<Document> documents = documentRepository.findByDocumentGroup_GroupId(groupId);
        List<DocumentResponse> docResponses = documents.stream().map(this::toDocumentResponse).toList();

        // Build recipients + fields from the first document (all docs share the same signers/fields structure)
        List<RecipientResponse> recipientResponses = new ArrayList<>();
        List<FieldResponse> fieldResponses = new ArrayList<>();

        if (!documents.isEmpty()) {
            Document primaryDoc = documents.get(0);
            List<DocumentSigner> signers = documentSignerRepository.findByDocument_DocumentId(primaryDoc.getDocumentId());

            // Build email -> signerId map for field mapping
            Map<Integer, Integer> signerIdMap = new HashMap<>(); // docSignerId -> index in recipientResponses

            for (int i = 0; i < signers.size(); i++) {
                DocumentSigner ds = signers.get(i);
                recipientResponses.add(RecipientResponse.builder()
                        .signerId(ds.getDocSignerId())
                        .email(ds.getSignerEmail())
                        .name(ds.getSignerName())
                        .role(ds.getRole())
                        .build());
                signerIdMap.put(ds.getDocSignerId(), i);
            }

            // Build fields from ALL documents, with fileIndex
            for (int docIdx = 0; docIdx < documents.size(); docIdx++) {
                Document doc = documents.get(docIdx);
                List<SignatureField> fields = signatureFieldRepository.findByDocument_DocumentId(doc.getDocumentId());

                for (SignatureField sf : fields) {
                    Integer recipientId = null;
                    if (sf.getDocSigner() != null) {
                        recipientId = sf.getDocSigner().getDocSignerId();
                    }

                    fieldResponses.add(FieldResponse.builder()
                            .fieldId(sf.getFieldId())
                            .type(sf.getFieldType() != null ? sf.getFieldType().name().toLowerCase() : "signature")
                            .page(sf.getPageNumber())
                            .fileIndex(docIdx)
                            .x(sf.getPosX())
                            .y(sf.getPosY())
                            .width(sf.getWidth())
                            .height(sf.getHeight())
                            .recipientId(recipientId)
                            .build());
                }
            }
        }

        return GroupDetailResponse.builder()
                .groupId(group.getGroupId())
                .groupName(group.getGroupName())
                .currentStep(group.getCurrentStep())
                .groupStatus(group.getGr_status())
                .documents(docResponses)
                .recipients(recipientResponses)
                .fields(fieldResponses)
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
