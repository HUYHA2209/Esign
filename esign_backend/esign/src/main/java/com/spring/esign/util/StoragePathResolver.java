package com.spring.esign.util;

import java.util.UUID;

import org.springframework.stereotype.Component;

/**
 * Centralized MinIO path generator.
 * Mọi đường dẫn lưu trữ đều đi qua class này — dễ maintain, không duplicate logic.
 *
 * <p>Cấu trúc thư mục:
 * <pre>
 * document-current/   {accountId}/{uuid}_{filename}
 * document-finally/   {accountId}/{docId}/v{order}_{sessionId}.pdf
 * document-versions/  {accountId}/{docId}/v{prevOrder}_{timestamp}.pdf
 * document-temp/      {sessionId}/{docId}.pdf           (session-scoped)
 * signatures/         {userId}/{timestamp}.{ext}         (user-scoped)
 * acoountId ở đây là account phát hành ra cái bản doc
 * </pre>
 */
@Component
public class StoragePathResolver {

    // ─── Bucket names (centralized constants) ───────────────────────────
    public static final String BUCKET_ORIGINAL = "document-current";
    public static final String BUCKET_FINAL = "document-finally";
    public static final String BUCKET_VERSIONS = "document-versions";
    public static final String BUCKET_TEMP = "document-temp";
    public static final String BUCKET_SIGNATURES = "signatures";

    // ─── Original document (upload) ─────────────────────────────────────

    /**
     * Path cho file gốc khi upload.
     * Format: {accountId}/{uuid}_{originalFileName}
     */
    public String originalDocument(Long accountId, String originalFileName) {
        return accountId + "/" + UUID.randomUUID() + "_" + originalFileName;
    }

    // ─── Final signed document ──────────────────────────────────────────

    /**
     * Path cho bản PDF đã ký xong (final).
     * Format: {accountId}/{docId}/v{signingOrder}_{sessionId}.pdf
     */
    public String finalDocument(Long accountId, Integer docId, int signingOrder, String sessionId) {
        return String.format("%d/%d/v%d_%s.pdf", accountId, docId, signingOrder, sessionId);
    }

    // ─── Archived version ───────────────────────────────────────────────

    /**
     * Path cho bản archive (version cũ trước khi ký tiếp).
     * Format: {accountId}/{docId}/v{previousOrder}_{timestamp}.pdf
     */
    public String archivedVersion(Long accountId, Integer docId, int previousOrder) {
        return String.format("%d/%d/v%d_%d.pdf", accountId, docId, previousOrder, System.currentTimeMillis());
    }

    // ─── Temp pre-seal (session-scoped, ngắn hạn) ───────────────────────

    /**
     * Path cho file pre-sealed tạm thời.
     * Format: {sessionId}/{docId}.pdf
     * Không cần accountId vì file temp bị xóa sau khi ký xong.
     */
    public String tempPreSeal(String sessionId, Integer docId) {
        return sessionId + "/" + docId + ".pdf";
    }

    // ─── Signature image (user-scoped) ──────────────────────────────────

    /**
     * Path cho ảnh chữ ký visual.
     * Format: {userId}/{timestamp}{extension}
     * Chữ ký gắn với user cá nhân, không phải account.
     */
    public String signatureImage(String userId, String extension) {
        return userId + "/" + System.currentTimeMillis() + extension;
    }

    /**
     * Path cho ảnh chữ ký tổ chức.
     * Format: org_{accountId}/{timestamp}{extension}
     */
    public String orgSignatureImage(Long accountId, String extension) {
        return "org_" + accountId + "/" + System.currentTimeMillis() + extension;
    }
}
