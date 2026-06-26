package com.spring.esign.service;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.spring.esign.entity.Document;
import com.spring.esign.entity.DocumentGroup;
import com.spring.esign.enums.DocumentStatus;
import com.spring.esign.enums.SignerStatus;
import com.spring.esign.repository.DocumentGroupRepository;
import com.spring.esign.repository.DocumentRepository;
import com.spring.esign.repository.DocumentSignerRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DocumentExpirationScheduler {

    DocumentGroupRepository documentGroupRepository;
    DocumentRepository documentRepository;
    DocumentSignerRepository documentSignerRepository;
    AuditTrailService auditTrailService;
    NotificationsService notificationsService;

    @Scheduled(fixedRate = 60000) // Chạy mỗi phút 1 lần
    @Transactional
    public void processExpiredDocuments() {
        LocalDateTime now = LocalDateTime.now();

        // 1. Lấy danh sách các group đã hết hạn nhưng vẫn đang PENDING
        List<DocumentGroup> expiredGroups =
                documentGroupRepository.findByGrStatusAndExpiresAtBefore(DocumentStatus.PENDING.name(), now);

        if (expiredGroups.isEmpty()) {
            return;
        }

        List<Integer> groupIds =
                expiredGroups.stream().map(DocumentGroup::getGroupId).collect(Collectors.toList());

        log.info("Bắt đầu xử lý {} DocumentGroups đã quá hạn: {}", groupIds.size(), groupIds);

        // 2. Cập nhật trạng thái DocumentGroup (BULK UPDATE -> Tránh N+1)
        documentGroupRepository.updateStatusByGroupIds(groupIds, DocumentStatus.EXPIRED.name());

        // 3. Cập nhật trạng thái Document trong các group đó (BULK UPDATE -> Tránh N+1)
        documentRepository.updateStatusByGroupIdsAndStatus(groupIds, DocumentStatus.PENDING, DocumentStatus.EXPIRED);

        // 4. Cập nhật trạng thái DocumentSigner (chỉ những người chưa ký: WAITING, VIEWED) (BULK UPDATE -> Tránh N+1)
        documentSignerRepository.updateStatusByGroupIdsAndStatuses(
                groupIds, Arrays.asList(SignerStatus.WAITING, SignerStatus.VIEWED), SignerStatus.EXPIRED);

        // 5. Ghi Audit Trail và Gửi thông báo cho Uploader
        List<Document> expiredDocs = documentRepository.findByDocumentGroup_GroupIdInWithGroupAndUser(groupIds);
        Set<Integer> notifiedGroups = new HashSet<>();

        for (Document doc : expiredDocs) {
            auditTrailService.logEvent(
                    doc,
                    com.spring.esign.enums.AuditEvent.EXPIRED,
                    null, // user
                    null, // ds
                    doc.getFinalFileHash() != null
                            ? doc.getFinalFileHash()
                            : doc.getOriginalFileHash(), // hash chưa có thay đổi thêm
                    doc.getFinalFileHash() != null ? doc.getFinalFileHash() : doc.getOriginalFileHash(),
                    null,
                    null,
                    null,
                    "127.0.0.1", // IP giả lập hệ thống
                    "System Scheduler" // Device giả lập hệ thống
                    );

            // Gửi thông báo cho người gửi (uploader) - Chỉ gửi 1 lần mỗi Group
            if (notifiedGroups.add(doc.getDocumentGroup().getGroupId())) {
                notificationsService.sendToUser(
                        doc.getUploadedBy().getEmail(),
                        com.spring.esign.enums.Notifications.DOCUMENT_EXPIRED,
                        "Tài liệu đã hết hạn",
                        "Nhóm tài liệu \"" + doc.getDocumentGroup().getGroupName()
                                + "\" đã hết hạn do không được xử lý trong thời gian quy định.",
                        doc.getDocumentGroup().getGroupId(),
                        "Hệ thống",
                        "system@esign.com");
            }
        }

        log.info("Đã hoàn tất xử lý quá hạn cho các DocumentGroups: {}", groupIds);
    }
}
