package com.spring.esign.service.signning;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spring.esign.dto.response.CompleteSigningResponse;
import com.spring.esign.dto.response.SessionSignningAuthResponse;
import com.spring.esign.entity.*;
import com.spring.esign.enums.*;
import com.spring.esign.exception.AppException;
import com.spring.esign.exception.ErrorCode;
import com.spring.esign.repository.*;
import com.spring.esign.service.*;
import com.spring.esign.util.PermissionChecker;
import com.spring.esign.util.StoragePathResolver;
import com.webauthn4j.WebAuthnManager;
import com.webauthn4j.authenticator.AuthenticatorImpl;
import com.webauthn4j.converter.util.ObjectConverter;
import com.webauthn4j.data.AuthenticationData;
import com.webauthn4j.data.AuthenticationParameters;
import com.webauthn4j.data.AuthenticationRequest;
import com.webauthn4j.data.attestation.authenticator.AAGUID;
import com.webauthn4j.data.attestation.authenticator.AttestedCredentialData;
import com.webauthn4j.data.attestation.authenticator.COSEKey;
import com.webauthn4j.data.client.Origin;
import com.webauthn4j.data.client.challenge.Challenge;
import com.webauthn4j.data.client.challenge.DefaultChallenge;
import com.webauthn4j.server.ServerProperty;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class SignningService {
    private final DocumentGroupRepository documentGroupRepository;
    // User Configuration
    String rpId = "localhost"; // ten mien
    String rpName = "Esign Service"; // ten ung dung
    String originUrl = "http://localhost:5173";

    SigningSessionRepository signingSessionRepository;
    SecureRandom random = new SecureRandom();
    SignaturePrepareRepository signaturePrepareRepository;
    UserRepository userRepository;
    DocumentRepository documentRepository;
    DocumentSignerRepository documentSignerRepository;
    UsersKeysRepository usersKeysRepository;
    OrganizationKeysRepository organizationKeysRepository;
    MinioService minioService;
    ObjectMapper mapper;
    PdfDocumentService pdfDocumentService;
    PdfSealingService pdfSealingService;
    WebAuthnParser webAuthnParser;
    WebAuthnManager webAuthnManager;
    RedisSignService redisSignService;
    AuditTrailService auditTrailService;
    PermissionChecker permissionChecker;
    StoragePathResolver storagePathResolver;
    NotificationsService notificationsService;

    public SessionSignningAuthResponse prepareSignning(Integer groupId, Map<String, String> fieldValues) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();

        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        List<DocumentSigner> documentSignerList = getDocumentSignerList(groupId, user.getEmail());

        for (DocumentSigner ds : documentSignerList) {
            if (ds.getDocument().getStatus() != DocumentStatus.PENDING) {
                throw new RuntimeException("Tài liệu không ở trạng thái chờ ký hoặc đã bị hủy.");
            }
        }

        boolean isOrgSign = false;
        Account orgAccount = null;
        if (!documentSignerList.isEmpty()) {
            DocumentSigner ds = documentSignerList.get(0);
            if (ds.getAccount() != null && ds.getAccount().getAccountType() == AccountType.ORGANIZATION) {
                isOrgSign = true;
                orgAccount = ds.getAccount();
            }
        }

        // Permission check: chỉ kiểm tra quyền SIGN khi người ký đại diện cho tổ chức
        // (org).
        // Với personal account, bản ghi DocumentSigner đã chứng minh người ký được ủy
        // quyền.
        if (isOrgSign) {
            permissionChecker.requirePermission(orgAccount.getAccountId(), userId, "SIGN");
        }
        // Không kiểm tra permission cho personal account vì người ký có thể thuộc
        // account khác.
        // Việc tồn tại DocumentSigner record đã xác nhận quyền ký.

        // Log VIEWED EVENT
        String ip = getClientIp();
        String ua = getUserAgent();
        for (DocumentSigner ds : documentSignerList) {
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

        StringJoiner combinedHashes = new StringJoiner("|");
        Map<Integer, String> preSealHashMap = new HashMap<>();
        String tempSessionId = UUID.randomUUID().toString();
        for (DocumentSigner ds : documentSignerList) {
            Document doc = ds.getDocument();
            String hashFile;
            try {
                byte[] baseBytes;
                if (doc.getFinalFileUrl() != null && !doc.getFinalFileUrl().isEmpty()) {
                    // Đã có người ký trước → dùng bản final cũ làm base
                    log.info(
                            "[prepareSignning] Doc {} đã có bản final từ người ký trước, dùng làm base",
                            doc.getDocumentId());
                    try (InputStream finalDoc =
                            minioService.downloadFile(StoragePathResolver.BUCKET_FINAL, doc.getFinalFileUrl())) {
                        baseBytes = finalDoc.readAllBytes();
                    }
                } else {
                    // Chưa ai ký → dùng file gốc
                    try (InputStream originalDoc =
                            minioService.downloadFile(StoragePathResolver.BUCKET_ORIGINAL, doc.getOriginalFileUrl())) {
                        baseBytes = originalDoc.readAllBytes();
                    }
                }

                byte[] preSealBytes = pdfDocumentService.burnVisualsToPdf(
                        new ByteArrayInputStream(baseBytes), fieldValues, doc.getDocumentId());
                String objectName = storagePathResolver.tempPreSeal(tempSessionId, doc.getDocumentId());

                redisSignService.save(tempSessionId, doc.getDocumentId(), objectName);
                // Lưu fieldValues để completeSignning có thể re-burn nếu cần (race condition)
                redisSignService.saveFieldValues(tempSessionId, doc.getDocumentId(), fieldValues);

                minioService.uploadFile(
                        new ByteArrayInputStream(preSealBytes),
                        StoragePathResolver.BUCKET_TEMP,
                        objectName,
                        "application/pdf",
                        preSealBytes.length);

                hashFile = hashDocumentSHA256(preSealBytes);
                preSealHashMap.put(doc.getDocumentId(), hashFile);
                combinedHashes.add(hashFile);
            } catch (IOException e) {
                throw new RuntimeException("Lỗi đọc file từ MinIO: " + doc.getDocumentId(), e);
            }
        }

        byte[] nonce = new byte[16];
        random.nextBytes(nonce);
        String nonceBase64 = Base64.getEncoder().encodeToString(nonce);

        String dataToHash = nonceBase64 + "|" + combinedHashes + "|" + user.getId() + "|" + System.currentTimeMillis();
        byte[] finalChallengeBytes;
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            finalChallengeBytes = digest.digest(dataToHash.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
        String challengeString = Base64.getUrlEncoder().withoutPadding().encodeToString(finalChallengeBytes);

        SigningSession session = SigningSession.builder()
                .sessionId(tempSessionId)
                .user(user)
                .groupId(groupId)
                .challenge(challengeString)
                .rpId(rpId)
                .origin(originUrl)
                .status(SessionStatus.ACTIVE)
                .build();
        session = signingSessionRepository.save(session);
        List<SignaturePrepare> prepareList = new ArrayList<>();
        for (DocumentSigner ds : documentSignerList) {
            String hashFile = preSealHashMap.get(ds.getDocument().getDocumentId());
            long timeStamp = System.currentTimeMillis();
            String messageToSign =
                    buildMessToSign(ds.getDocument().getDocumentId(), hashFile, ds.getSignerEmail(), timeStamp);
            String messageToSignHash = hashMessageToSign(messageToSign);

            SignaturePrepare prepare = SignaturePrepare.builder()
                    .signingSession(session)
                    .document(ds.getDocument())
                    .docSigner(ds)
                    .messageToSign(messageToSign)
                    .messageToSignHash(messageToSignHash)
                    .build();

            prepareList.add(prepare);
        }
        signaturePrepareRepository.saveAll(prepareList);

        List<Map<String, Object>> allowCredentials = new ArrayList<>();
        if (isOrgSign) {
            OrganizationKeys orgKey = organizationKeysRepository
                    .findByAccount_AccountIdAndUser_Id(orgAccount.getAccountId(), user.getId())
                    .orElseThrow(
                            () -> new RuntimeException(
                                    "Bạn chưa kích hoạt khóa xác thực PassKey cho tổ chức này. Vui lòng đăng ký trước khi thực hiện ký."));
            if (Boolean.FALSE.equals(orgKey.getIsActive())) {
                throw new RuntimeException("Khóa xác thực PassKey cho tổ chức này đã bị vô hiệu hóa.");
            }
            Map<String, Object> cred = new HashMap<>();
            cred.put("type", "public-key");
            cred.put("id", orgKey.getCredentialId());
            allowCredentials.add(cred);
        } else {
            List<UsersKeys> usersKeysList = usersKeysRepository.findByUserAndIsActiveTrue(user);
            if (usersKeysList.isEmpty()) {
                throw new RuntimeException("Người dùng chưa đăng ký bất kỳ phương thức xác thực WebAuthn nào.");
            }
            for (UsersKeys key : usersKeysList) {
                Map<String, Object> cred = new HashMap<>();
                cred.put("type", "public-key");
                cred.put("id", key.getCredentialId());
                allowCredentials.add(cred);
            }
        }

        Map<String, Object> webAuthnOptions = new HashMap<>();
        webAuthnOptions.put("challenge", challengeString);
        webAuthnOptions.put("rpId", rpId);
        webAuthnOptions.put("timeout", 60000);
        webAuthnOptions.put("userVerification", "required");
        webAuthnOptions.put("allowCredentials", allowCredentials);

        return SessionSignningAuthResponse.builder()
                .sessionId(session.getSessionId())
                .webAuthnOptions(webAuthnOptions)
                .build();
    }

    public String hashDocumentSHA256(byte[] data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");

            byte[] hashBytes = digest.digest(data);

            StringBuilder hex = new StringBuilder(hashBytes.length * 2);
            for (byte b : hashBytes) {
                hex.append(String.format("%02x", b));
            }

            return hex.toString();
        } catch (Exception e) {
            throw new RuntimeException("Hash message error", e);
        }
    }

    private String buildMessToSign(Integer documentId, String hashFile, String signerEmail, long timestamp) {

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("document_id", documentId);
        payload.put("document_hash", hashFile);
        payload.put("signer_email", signerEmail);
        payload.put("timestamp", timestamp);

        try {
            return mapper.writeValueAsString(payload);
        } catch (Exception e) {
            throw new RuntimeException("Error building message to sign payload", e);
        }
    }

    private String hashMessageToSign(String messToSign) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(messToSign.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception e) {
            throw new RuntimeException("Hash message error", e);
        }
    }

    /**
     * Bước 3: Complete — Verify WebAuthn assertion, seal PDF, upload final.
     *
     * Phương án C: Cả PARALLEL và SEQUENTIAL đều dùng chung logic versioning.
     * Ai ký xong thì người sau ký trên bản đã ký → bản final luôn chứa đầy đủ chữ
     * ký.
     */
    @Transactional
    public CompleteSigningResponse completeSignning(
            String sessionId, Integer groupId, String credentialJson, String ip, String ua, String deviceFingerprint)
            throws Exception {

        // 1. Validate session, user, order
        SigningContext ctx = validateAndLoadContext(sessionId, groupId, ip, ua, deviceFingerprint);

        // 2. Verify WebAuthn assertion
        WebAuthnResult webAuthnResult = verifyWebAuthn(ctx, credentialJson);

        // 3. Process từng document (resolve PDF → seal → upload → audit)
        for (DocumentSigner ds : ctx.getDocumentSignerList()) {
            processDocumentSigning(ctx, ds, webAuthnResult);
        }

        // 4. Finalize session & group
        finalizeSession(ctx.getSession(), ip, ua, deviceFingerprint);
        finalizeGroupIfComplete(groupId);

        return CompleteSigningResponse.builder()
                .success(true)
                .message("Ký tài liệu và Audit Trail thành công")
                .build();
    }

    // =====================================================================
    // PRIVATE METHODS — Chia nhỏ từ completeSignning
    // =====================================================================

    /**
     * Validate session, user, check order, load context.
     */
    private SigningContext validateAndLoadContext(
            String sessionId, Integer groupId, String ip, String ua, String deviceFingerprint) {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        long checkSigned = documentSignerRepository.countSignedDocumentsByUserAndGroup(user.getEmail(), groupId);
        if (checkSigned > 0) throw new AppException(ErrorCode.USER_SIGNED);

        SigningSession session = signingSessionRepository
                .findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy phiên ký."));

        if (!session.getUser().getId().equals(userId)) {
            throw new AppException(ErrorCode.USER_NO_PERMISSION);
        }
        if (session.getStatus() != SessionStatus.ACTIVE) {
            throw new RuntimeException("Phiên ký đã hết hiệu lực hoặc đã được sử dụng.");
        }
        if (LocalDateTime.now().isAfter(session.getExpiresAt())) {
            throw new RuntimeException("Phiên ký đã quá hạn.");
        }
        if (!checkOrder(groupId)) {
            throw new AppException(ErrorCode.INVALID_SIGNING_ORDER);
        }

        List<DocumentSigner> documentSignerList = getDocumentSignerList(groupId, user.getEmail());

        for (DocumentSigner ds : documentSignerList) {
            if (ds.getDocument().getStatus() != DocumentStatus.PENDING) {
                throw new RuntimeException("Tài liệu không ở trạng thái chờ ký hoặc đã bị hủy.");
            }
        }

        int signingOrder = documentSignerList.get(0).getSigningOrder();
        SigningMode signingMode = documentSignerList.get(0).getSigningMode();
        boolean lastSigner = !documentRepository.existsUnsignedNextSigners(groupId, signingOrder);

        return SigningContext.builder()
                .user(user)
                .session(session)
                .documentSignerList(documentSignerList)
                .signingMode(signingMode)
                .signingOrder(signingOrder)
                .isLastSigner(lastSigner)
                .ip(ip)
                .ua(ua)
                .deviceFingerprint(deviceFingerprint)
                .build();
    }

    /**
     * Parse và verify WebAuthn assertion, cập nhật counter chống replay.
     */
    private WebAuthnResult verifyWebAuthn(SigningContext ctx, String credentialJson) {
        SigningSession session = ctx.getSession();
        User user = ctx.getUser();
        byte[] challengeBytes = Base64.getUrlDecoder().decode(session.getChallenge());
        Challenge challenge = new DefaultChallenge(challengeBytes);

        try {
            AuthenticationRequest authenticationRequest = webAuthnParser.parseAuthenticationRequest(credentialJson);
            byte[] credentialId = authenticationRequest.getCredentialId();
            String credentialIdBase64 = Base64.getUrlEncoder().withoutPadding().encodeToString(credentialId);

            boolean isOrgSign = false;
            Account orgAccount = null;
            if (ctx.getDocumentSignerList() != null
                    && !ctx.getDocumentSignerList().isEmpty()) {
                DocumentSigner ds = ctx.getDocumentSignerList().get(0);
                if (ds.getAccount() != null && ds.getAccount().getAccountType() == AccountType.ORGANIZATION) {
                    isOrgSign = true;
                    orgAccount = ds.getAccount();
                }
            }

            byte[] publicKeyCose = null;
            String aaguidStr = null;
            long counter = 0L;
            OrganizationKeys orgKeys = null;
            UsersKeys usersKeys = null;

            if (isOrgSign) {
                orgKeys = organizationKeysRepository
                        .findByAccount_AccountIdAndUser_Id(orgAccount.getAccountId(), user.getId())
                        .orElseThrow(() -> new AppException(ErrorCode.CREDENTIAL_NOT_FOUND));
                if (!orgKeys.getCredentialId().equals(credentialIdBase64)) {
                    throw new AppException(ErrorCode.USER_NO_PERMISSION);
                }
                publicKeyCose = orgKeys.getPublicKeyCose();
                aaguidStr = orgKeys.getAaguid();
                counter = orgKeys.getCounter() != null ? orgKeys.getCounter() : 0L;
            } else {
                usersKeys = usersKeysRepository
                        .findByCredentialId(credentialIdBase64)
                        .orElseThrow(() -> new AppException(ErrorCode.CREDENTIAL_NOT_FOUND));
                if (!usersKeys.getUser().getId().equals(user.getId())) {
                    throw new AppException(ErrorCode.USER_NO_PERMISSION);
                }
                publicKeyCose = usersKeys.getPublicKeyCose();
                aaguidStr = usersKeys.getAaguid();
                counter = usersKeys.getCounter() != null ? usersKeys.getCounter() : 0L;
            }

            ObjectConverter objectConverter = new ObjectConverter();
            COSEKey coseKey = objectConverter.getCborConverter().readValue(publicKeyCose, COSEKey.class);

            AAGUID aaguid = (aaguidStr != null && !aaguidStr.isEmpty()) ? new AAGUID(aaguidStr) : AAGUID.NULL;
            AttestedCredentialData attestedCredentialData = new AttestedCredentialData(aaguid, credentialId, coseKey);
            AuthenticatorImpl authenticator = new AuthenticatorImpl(attestedCredentialData, null, counter);

            ServerProperty serverProperty = new ServerProperty(new Origin(originUrl), rpId, challenge, null);
            AuthenticationParameters authenticationParameters =
                    new AuthenticationParameters(serverProperty, authenticator, null, true);
            AuthenticationData authenticationData =
                    webAuthnManager.validate(authenticationRequest, authenticationParameters);

            log.info("WebAuthn assertion verified for user {} with credential {}", user.getId(), credentialIdBase64);

            // Cập nhật counter chống replay
            long newCounter = authenticationData.getAuthenticatorData().getSignCount();
            if (newCounter > 0) {
                if (newCounter <= counter) {
                    throw new RuntimeException("Potential replay attack detected");
                }
                if (isOrgSign) {
                    orgKeys.setCounter(newCounter);
                    organizationKeysRepository.save(orgKeys);
                } else {
                    usersKeys.setCounter(newCounter);
                    usersKeysRepository.save(usersKeys);
                }
            } else if (counter > 0) {
                log.warn(
                        "Counter went from {} to 0 for credential {} — possible cloned key",
                        counter,
                        credentialIdBase64);
            }

            String digitalSignatureBase64 =
                    Base64.getEncoder().encodeToString(credentialJson.getBytes(StandardCharsets.UTF_8));

            return WebAuthnResult.builder()
                    .credentialIdBase64(credentialIdBase64)
                    .digitalSignatureBase64(digitalSignatureBase64)
                    .build();

        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Authentication failed: ", e);
        }
    }

    /**
     * Xử lý ký 1 document: resolve PDF input → seal → upload → audit.
     */
    private void processDocumentSigning(SigningContext ctx, DocumentSigner ds, WebAuthnResult webAuthnResult) {
        Document doc = ds.getDocument();

        // 1. Resolve PDF input (Phương án C: dùng bản final mới nhất nếu có)
        byte[] inputPdfBytes = resolveInputPdf(ctx, ds);
        String pdfHashBefore = hashDocumentSHA256(inputPdfBytes);

        // 2. Lấy messageToSignHash từ SignaturePrepare
        SignaturePrepare prepare = signaturePrepareRepository
                .findBySigningSessionAndDocument_DocumentId(ctx.getSession(), doc.getDocumentId())
                .orElseThrow(() -> new RuntimeException("Lỗi dữ liệu: Không tìm thấy SignaturePrepare."));

        // 3. Build AuditTrail
        AuditTrail auditTrail = AuditTrail.builder()
                .document(doc)
                .eventType(AuditEvent.SIGNED)
                .eventDescription("Tài liệu đã được ký số thông qua WebAuthn/FIDO2 và file .p12 của hệ thống")
                .signerName(ctx.getUser().getFullName() != null ? ctx.getUser().getFullName() : ds.getSignerEmail())
                .signerEmail(ds.getSignerEmail())
                .signerIp(ctx.getIp())
                .deviceFingerprint(ctx.getDeviceFingerprint())
                .pdfHashBefore(pdfHashBefore)
                .credentialId(webAuthnResult.getCredentialIdBase64())
                .digitalSignature(webAuthnResult.getDigitalSignatureBase64())
                .messageToSignHash(prepare.getMessageToSignHash())
                .keyAlgorithm("WebAuthn-PAdES")
                .timestamp(LocalDateTime.now())
                .build();

        // 4. Seal document (append audit page + PAdES)
        byte[] finalPdfBytes = sealDocument(inputPdfBytes, auditTrail, ds);
        String pdfHashAfter = hashDocumentSHA256(finalPdfBytes);
        auditTrail.setPdfHashAfter(pdfHashAfter);

        // 5. Upload & archive version cũ
        uploadAndArchive(ctx, ds, finalPdfBytes, pdfHashAfter);

        // 6. Update DB entities
        updateDocumentEntities(ctx, ds, webAuthnResult);

        // 7. Log Audit Trail
        auditTrailService.logEvent(
                doc,
                auditTrail.getEventType(),
                ctx.getUser(),
                ds,
                auditTrail.getPdfHashBefore(),
                auditTrail.getPdfHashAfter(),
                auditTrail.getCredentialId(),
                auditTrail.getDigitalSignature(),
                auditTrail.getMessageToSignHash(),
                auditTrail.getSignerIp(),
                auditTrail.getDeviceFingerprint());

        if (doc.getStatus() == DocumentStatus.COMPLETED) {
            auditTrailService.logEvent(
                    doc,
                    com.spring.esign.enums.AuditEvent.COMPLETED,
                    ctx.getUser(),
                    ds,
                    auditTrail.getPdfHashAfter(),
                    auditTrail.getPdfHashAfter(),
                    null,
                    null,
                    null,
                    auditTrail.getSignerIp(),
                    auditTrail.getDeviceFingerprint());
        }

        // 8. Cleanup temp files
        String tempObjectName = redisSignService.get(ctx.getSession().getSessionId(), doc.getDocumentId());
        if (tempObjectName != null) {
            minioService.removeFile("document-temp", tempObjectName);
            redisSignService.delete(ctx.getSession().getSessionId(), doc.getDocumentId());
            redisSignService.deleteFieldValues(ctx.getSession().getSessionId(), doc.getDocumentId());
        }
    }

    /**
     * PHƯƠNG ÁN C: Resolve PDF input.
     * Re-fetch document từ DB để lấy latest finalFileUrl.
     * - Nếu finalFileUrl đã thay đổi kể từ lúc prepareSignning (người khác ký xong)
     * → download bản final mới nhất, re-burn visuals của signer hiện tại lên đó.
     * - Nếu chưa ai ký hoặc finalFileUrl chưa thay đổi → dùng bản pre-sealed từ
     * temp.
     */
    private byte[] resolveInputPdf(SigningContext ctx, DocumentSigner ds) {
        Document doc = ds.getDocument();
        String sessionId = ctx.getSession().getSessionId();

        // Re-fetch document từ DB để lấy trạng thái mới nhất (bypass Hibernate cache)
        String latestFinalUrl = documentRepository.findCurrentFinalFileUrl(doc.getDocumentId());

        // Kiểm tra xem có người khác ký xong giữa prepare và complete không
        // So sánh finalFileUrl hiện tại với lúc prepare:
        // - Nếu lúc prepare dùng file gốc (finalUrl == null) mà giờ có finalUrl → có
        // người mới ký
        // - Nếu lúc prepare dùng finalUrl cũ mà giờ finalUrl khác → có người mới ký
        if (latestFinalUrl != null && !latestFinalUrl.isEmpty()) {
            // Có bản final mới nhất → download và re-burn visuals của signer hiện tại
            log.info(
                    "[resolveInputPdf] Doc {} có bản final mới nhất ({}), re-burn visuals lên đó",
                    doc.getDocumentId(),
                    latestFinalUrl);
            try (InputStream latestFinalDoc = minioService.downloadFile("document-finally", latestFinalUrl)) {
                byte[] latestFinalBytes = latestFinalDoc.readAllBytes();

                // Lấy fieldValues từ Redis để re-burn
                Map<String, String> fieldValues = redisSignService.getFieldValues(sessionId, doc.getDocumentId());
                if (fieldValues != null && !fieldValues.isEmpty()) {
                    return pdfDocumentService.burnVisualsToPdf(
                            new ByteArrayInputStream(latestFinalBytes), fieldValues, doc.getDocumentId());
                } else {
                    // Không có fieldValues → dùng bản pre-sealed (fallback)
                    log.warn("[resolveInputPdf] Không tìm thấy fieldValues trong Redis, fallback sang pre-sealed");
                    return downloadPreSealed(sessionId, doc.getDocumentId());
                }
            } catch (IOException e) {
                throw new RuntimeException("Lỗi đọc bản final từ MinIO: " + doc.getDocumentId(), e);
            }
        }

        // Chưa ai ký → dùng bản pre-sealed từ temp
        return downloadPreSealed(sessionId, doc.getDocumentId());
    }

    /**
     * Download bản pre-sealed từ MinIO temp bucket.
     */
    private byte[] downloadPreSealed(String sessionId, Integer docId) {
        String tempObjectName = redisSignService.get(sessionId, docId);
        if (tempObjectName == null) {
            tempObjectName = storagePathResolver.tempPreSeal(sessionId, docId);
        }
        try (InputStream preSealDoc = minioService.downloadFile(StoragePathResolver.BUCKET_TEMP, tempObjectName)) {
            return preSealDoc.readAllBytes();
        } catch (IOException e) {
            throw new RuntimeException("Lỗi đọc file pre-sealed từ MinIO: " + docId, e);
        }
    }

    /**
     * Append Audit Page + PAdES Seal.
     */
    private byte[] sealDocument(byte[] inputPdfBytes, AuditTrail auditTrail, DocumentSigner ds) {
        return pdfSealingService.signPdfPAdES(inputPdfBytes, auditTrail, ds);
    }

    /**
     * Upload bản final mới, archive bản cũ nếu có (versioning).
     */
    private void uploadAndArchive(SigningContext ctx, DocumentSigner ds, byte[] finalPdfBytes, String pdfHashAfter) {
        Document doc = ds.getDocument();
        Long accountId = doc.getAccount() != null ? doc.getAccount().getAccountId() : 0L;

        // Archive bản final cũ nếu có
        if (doc.getFinalFileUrl() != null && !doc.getFinalFileUrl().isEmpty()) {
            String archiveKey =
                    storagePathResolver.archivedVersion(accountId, doc.getDocumentId(), ctx.getSigningOrder() - 1);
            try {
                minioService.copyFile(
                        StoragePathResolver.BUCKET_FINAL,
                        doc.getFinalFileUrl(),
                        StoragePathResolver.BUCKET_VERSIONS,
                        archiveKey);
                log.info("[uploadAndArchive] Archived old final for doc {} → {}", doc.getDocumentId(), archiveKey);
            } catch (Exception e) {
                log.warn("[uploadAndArchive] Không thể archive bản cũ: {}", e.getMessage());
            }
        }

        // Upload bản final mới
        String finalObjectName = storagePathResolver.finalDocument(
                accountId,
                doc.getDocumentId(),
                ctx.getSigningOrder(),
                ctx.getSession().getSessionId());
        minioService.uploadFile(
                new ByteArrayInputStream(finalPdfBytes),
                StoragePathResolver.BUCKET_FINAL,
                finalObjectName,
                "application/pdf",
                finalPdfBytes.length);

        doc.setFinalFileUrl(finalObjectName);
        doc.setFinalFileHash(pdfHashAfter);
    }

    /**
     * Cập nhật Document status và DocumentSigner status.
     */
    private void updateDocumentEntities(SigningContext ctx, DocumentSigner ds, WebAuthnResult webAuthnResult) {
        Document doc = ds.getDocument();

        ds.setStatus(SignerStatus.SIGNED);
        ds.setSignedAt(LocalDateTime.now());
        ds.setIpAddress(ctx.getIp());
        ds.setDeviceFingerprint(ctx.getDeviceFingerprint());
        ds.setCredentialId(webAuthnResult.getCredentialIdBase64());
        ds.setDigitalSignature(webAuthnResult.getDigitalSignatureBase64());
        ds.setKeyAlgorithm("WebAuthn-PAdES");
        documentSignerRepository.save(ds);

        // Check if all signers for THIS document are signed
        boolean allSigned = documentSignerRepository.isAllSignersSignedForDocument(doc.getDocumentId());
        if (allSigned) {
            doc.setStatus(DocumentStatus.COMPLETED);
            doc.setCompleteAt(LocalDateTime.now());
            documentRepository.save(doc);
        }
    }

    /**
     * Đánh dấu session đã sử dụng.
     */
    private void finalizeSession(SigningSession session, String ip, String ua, String deviceFingerprint) {
        session.setStatus(SessionStatus.USED);
        session.setUsedAt(LocalDateTime.now());
        session.setUsedFromIp(ip);
        session.setUsedFromUa(ua);
        session.setDeviceFingerprint(deviceFingerprint);
        signingSessionRepository.save(session);
    }

    /**
     * Kiểm tra và cập nhật DocumentGroup nếu tất cả document đã COMPLETED.
     */
    private void finalizeGroupIfComplete(Integer groupId) {
        boolean allDone = documentRepository.isAllDocumentsCompleted(groupId);
        if (allDone) {
            DocumentGroup group = documentGroupRepository.findByGroupId(groupId);
            group.setGr_status(DocumentStatus.COMPLETED.name());
            documentGroupRepository.save(group);
            log.info("[finalizeGroupIfComplete] Group {} đã hoàn tất!", groupId);
        }
    }

    private List<DocumentSigner> getDocumentSignerList(Integer groupId, String email) {
        List<Document> documentList = documentRepository.findByDocumentGroup_GroupIdWithGroupAndUser(groupId);
        if (documentList.isEmpty()) {
            throw new RuntimeException("Không tìm thấy tài liệu nào trong nhóm.");
        }

        List<Integer> documentIds = new ArrayList<>();
        for (Document d : documentList) {
            documentIds.add(d.getDocumentId());
        }

        List<DocumentSigner> documentSignerList =
                documentSignerRepository.findByEmailAndDocumentIdsWithFullFetch(email, documentIds);
        if (documentSignerList.isEmpty()) {
            throw new AppException(ErrorCode.USER_NO_PERMISSION);
        }

        return documentSignerList;
    }

    public boolean checkOrder(Integer groupId) {
        log.info("Bắt đầu checkOrder cho groupId: {}", groupId);
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String userId = authentication.getName();
            log.info("User ID hiện tại: {}", userId);

            User user = userRepository.findById(userId).orElseThrow(() -> {
                log.error("Không tìm thấy user {}", userId);
                return new AppException(ErrorCode.USER_NOT_EXISTED);
            });

            List<Document> docs = documentRepository.findByDocumentGroup_GroupId(groupId);
            if (docs.isEmpty()) {
                log.error("Không tìm thấy documents nào cho groupId: {}", groupId);
                throw new AppException(ErrorCode.DOCUMENT_NOT_FOUND);
            }
            log.info("Tìm thấy {} documents", docs.size());

            List<Integer> docIds = new ArrayList<>();
            for (Document doc : docs) {
                docIds.add(doc.getDocumentId());
            }

            int order = 1;
            SigningMode mode = SigningMode.PARALLEL;
            List<DocumentSigner> documentSignerList =
                    documentSignerRepository.findByEmailAndDocumentIdsWithFullFetch(user.getEmail(), docIds);
            if (documentSignerList.isEmpty()) {
                log.error("User {} không có quyền ký các document: {}", user.getEmail(), docIds);
                throw new AppException(ErrorCode.USER_NO_PERMISSION);
            } else {
                Integer dbOrder = documentSignerList.get(0).getSigningOrder();
                if (dbOrder != null) {
                    order = dbOrder;
                }
                SigningMode dbMode = documentSignerList.get(0).getSigningMode();
                if (dbMode != null) {
                    mode = dbMode;
                }
                log.info("User {} có order = {}, mode = {}", user.getEmail(), order, mode);
            }

            // Nếu là ký song song, ai cũng có thể ký bất cứ lúc nào
            if (mode == SigningMode.PARALLEL) {
                log.info("Chế độ PARALLEL -> Trả về true ngay lập tức");
                return true;
            }

            boolean existsPrevious = documentRepository.existsUnsignedPreviousSigners(groupId, order);
            log.info("Có người ký trước (order < {}) chưa ký: {}", order, existsPrevious);

            boolean canSign = !existsPrevious;
            return canSign;
        } catch (Exception e) {
            log.error("Lỗi xảy ra trong quá trình checkOrder: ", e);
            throw e;
        }
    }

    @Transactional
    public void declineSignning(Integer groupId, String reason, String ip, String deviceFingerprint) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();
        User user = userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        List<DocumentSigner> signers = getDocumentSignerList(groupId, user.getEmail());
        if (signers.isEmpty()) {
            throw new AppException(ErrorCode.USER_NO_PERMISSION);
        }

        DocumentSigner firstSigner = signers.get(0);
        if (!firstSigner.getStatus().canSign()) {
            throw new RuntimeException("Bạn không thể từ chối tài liệu ở trạng thái này.");
        }

        if (!checkOrder(groupId)) {
            throw new RuntimeException("Chưa đến lượt bạn xử lý tài liệu này.");
        }

        DocumentGroup group = documentGroupRepository.findByGroupId(groupId);
        if (group == null) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }

        group.setGr_status(DocumentStatus.DECLINED.name());
        documentGroupRepository.save(group);

        String uploaderEmail = null;

        // Cập nhật trạng thái của người từ chối
        for (DocumentSigner ds : signers) {
            ds.setStatus(SignerStatus.DECLINED);
            ds.setIpAddress(ip);
            ds.setDeviceFingerprint(deviceFingerprint);
            ds.setSignedAt(LocalDateTime.now());
            documentSignerRepository.save(ds);

            Document doc = ds.getDocument();
            doc.setStatus(DocumentStatus.DECLINED);
            documentRepository.save(doc);

            if (uploaderEmail == null && doc.getUploadedBy() != null) {
                uploaderEmail = doc.getUploadedBy().getEmail();
            }

            auditTrailService.logEvent(
                    doc, AuditEvent.DECLINED, user, ds, null, null, null, null, null, ip, deviceFingerprint);
        }

        // Cập nhật các signer còn lại (WAITING/VIEWED) trong group → hủy tất cả
        List<Document> allDocs = documentRepository.findByDocumentGroup_GroupId(groupId);
        for (Document doc : allDocs) {
            if (doc.getStatus() != DocumentStatus.DECLINED && doc.getStatus() != DocumentStatus.COMPLETED) {
                doc.setStatus(DocumentStatus.DECLINED);
                documentRepository.save(doc);
            }
            List<DocumentSigner> allSigners = documentSignerRepository.findByDocument_DocumentId(doc.getDocumentId());
            for (DocumentSigner otherDs : allSigners) {
                if (otherDs.getStatus() == SignerStatus.WAITING || otherDs.getStatus() == SignerStatus.VIEWED) {
                    otherDs.setStatus(SignerStatus.DECLINED);
                    documentSignerRepository.save(otherDs);
                }
            }
        }

        if (uploaderEmail != null) {
            String title = user.getFullName() + " đã từ chối ký tài liệu";
            String message = user.getFullName() + " đã từ chối ký nhóm tài liệu \"" + group.getGroupName() + "\"."
                    + (reason != null && !reason.trim().isEmpty() ? " Lý do: " + reason : "");
            notificationsService.sendToUser(
                    uploaderEmail,
                    Notifications.DOCUMENT_DECLINED,
                    title,
                    message,
                    groupId,
                    user.getFullName(),
                    user.getEmail());
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
