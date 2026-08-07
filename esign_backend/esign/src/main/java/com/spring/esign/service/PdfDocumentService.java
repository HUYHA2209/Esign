package com.spring.esign.service;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;
import java.text.Normalizer;
import java.util.List;
import java.util.Map;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.spring.esign.entity.DocumentSigner;
import com.spring.esign.entity.OrganizationSignature;
import com.spring.esign.entity.SignatureField;
import com.spring.esign.entity.Signatures;
import com.spring.esign.enums.AccountType;
import com.spring.esign.enums.FieldType;
import com.spring.esign.exception.AppException;
import com.spring.esign.exception.ErrorCode;
import com.spring.esign.repository.OrganizationSignatureRepository;
import com.spring.esign.repository.SignatureFieldRepository;
import com.spring.esign.repository.SignatureRepository;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
@Slf4j
public class PdfDocumentService {

    MinioService minioService;
    SignatureFieldRepository signatureFieldRepository;
    SignatureRepository signatureRepository;
    OrganizationSignatureRepository orgSignatureRepository;

    // ─── Danh sách font hệ thống hỗ trợ Unicode/Tiếng Việt (ưu tiên theo thứ tự) ───
    private static final String[] SYSTEM_FONT_PATHS = {
        // Windows
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/tahoma.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
        // Linux
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        // macOS
        "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    };

    /**
     * Load font TrueType hỗ trợ Unicode (tiếng Việt) từ hệ thống.
     * Nếu không tìm thấy font TTF → trả về null, caller sẽ fallback sang Helvetica.
     */
    private PDFont loadUnicodeFont(PDDocument document) {
        for (String fontPath : SYSTEM_FONT_PATHS) {
            File fontFile = new File(fontPath);
            if (fontFile.exists()) {
                try {
                    PDFont font = PDType0Font.load(document, fontFile);
                    log.info("[Font] Đã load font Unicode: {}", fontPath);
                    return font;
                } catch (Exception e) {
                    log.warn("[Font] Không thể load font {}: {}", fontPath, e.getMessage());
                }
            }
        }
        log.warn("[Font] Không tìm thấy font TTF Unicode nào! Sẽ dùng Helvetica (không hỗ trợ tiếng Việt)");
        return null;
    }

    /**
     * Loại bỏ dấu tiếng Việt — fallback khi không có font Unicode.
     * Ví dụ: "Nguyễn Văn An" → "Nguyen Van An"
     */
    private String stripVietnameseDiacritics(String text) {
        if (text == null) return "";
        String normalized = Normalizer.normalize(text, Normalizer.Form.NFD);
        String stripped = normalized.replaceAll("\\p{M}", "");
        stripped = stripped.replace("đ", "d").replace("Đ", "D");
        return stripped;
    }

    /**
     * Vẽ text an toàn — tự strip dấu nếu font không hỗ trợ Unicode.
     */
    private void safeShowText(PDPageContentStream cs, PDFont font, String text) throws java.io.IOException {
        if (font instanceof PDType0Font) {
            cs.showText(text);
        } else {
            cs.showText(stripVietnameseDiacritics(text));
        }
    }

    /**
     * Hàm vẽ (burn) các nét chữ ký và text lên file PDF trong bộ nhớ (RAM).
     *
     * @param originalPdfInputStream Luồng data của file PDF gốc tải từ MinIO
     * @param fieldValues            Map<fieldId, value> do Frontend gửi lên
     * @param documentId             ID của Document đang xử lý
     * @return byte[] của file PDF đã được vẽ (Pre-sealed)
     */
    public byte[] burnVisualsToPdf(
            InputStream originalPdfInputStream,
            Map<String, String> fieldValues,
            Integer documentId,
            java.util.List<Integer> allowedSignerIds) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();

        if (fieldValues == null || fieldValues.isEmpty()) {
            log.info("[burnVisuals] Không có fieldValues cho docId={}, trả về PDF gốc", documentId);
            return inputStreamToByteArray(originalPdfInputStream);
        }

        byte[] pdfBytes = inputStreamToByteArray(originalPdfInputStream);
        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            // Load font Unicode hỗ trợ tiếng Việt
            PDFont unicodeFont = loadUnicodeFont(document);
            PDFont textFont = unicodeFont != null ? unicodeFont : new PDType1Font(Standard14Fonts.FontName.HELVETICA);

            // Lấy danh sách các SignatureField từ DB thuộc về document này
            List<SignatureField> fields = signatureFieldRepository.findByDocument_DocumentId(documentId);

            log.info(
                    "[burnVisuals] docId={}, fields DB={}, fieldValues FE={}",
                    documentId,
                    fields.size(),
                    fieldValues.keySet());

            for (SignatureField field : fields) {
                if (allowedSignerIds != null
                        && !allowedSignerIds.contains(field.getDocSigner().getDocSignerId())) {
                    continue; // Skip fields not belonging to the allowed signers
                }
                String fieldValue = fieldValues.get(String.valueOf(field.getFieldId()));
                if (fieldValue == null || fieldValue.isEmpty()) {
                    log.info(
                            "[burnVisuals] Field {} ({}) không có giá trị trong fieldValues, bỏ qua",
                            field.getFieldId(),
                            field.getFieldType());
                    continue;
                }

                // Lấy trang PDF (index từ 0)
                int pageIndex = field.getPageNumber() - 1;
                if (pageIndex < 0 || pageIndex >= document.getNumberOfPages()) {
                    log.warn("Page number {} out of range for document {}", field.getPageNumber(), documentId);
                    continue;
                }
                PDPage page = document.getPage(pageIndex);

                // ─── Convert % → PDF points ───
                float pageWidth = page.getMediaBox().getWidth();
                float pageHeight = page.getMediaBox().getHeight();

                float xPercent = field.getPosX() != null ? field.getPosX() : 0;
                float yPercent = field.getPosY() != null ? field.getPosY() : 0;
                float wPercent = field.getWidth() != null ? field.getWidth() : 10;
                float hPercent = field.getHeight() != null ? field.getHeight() : 5;

                float x = (xPercent / 100f) * pageWidth;
                float width = (wPercent / 100f) * pageWidth;
                float height = (hPercent / 100f) * pageHeight;
                float feY = (yPercent / 100f) * pageHeight;
                float pdfY = pageHeight - feY - height;

                try (PDPageContentStream cs =
                        new PDPageContentStream(document, page, PDPageContentStream.AppendMode.APPEND, true, true)) {

                    FieldType type = field.getFieldType();

                    if (type == FieldType.SIGNATURE || type == FieldType.INITIAL) {
                        // ─── Dùng ảnh signature đã lưu trong MinIO ───
                        DocumentSigner ds = field.getDocSigner();
                        String imageUrl = null;
                        if (ds != null
                                && ds.getAccount() != null
                                && ds.getAccount().getAccountType() == AccountType.ORGANIZATION) {
                            OrganizationSignature orgSig = orgSignatureRepository
                                    .findByAccount_AccountId(ds.getAccount().getAccountId())
                                    .orElseThrow(() -> new AppException(ErrorCode.SIGNATURE_NOT_FOUND));
                            imageUrl = orgSig.getImageUrl();
                        } else {
                            Signatures personalSig = signatureRepository
                                    .findByUserId(userId)
                                    .orElseThrow(() -> new AppException(ErrorCode.SIGNATURE_NOT_FOUND));
                            imageUrl = personalSig.getImageUrl();
                        }

                        if (imageUrl == null || imageUrl.isEmpty()) {
                            throw new AppException(ErrorCode.SIGNATURE_NOT_FOUND);
                        }

                        byte[] signatureBytes = minioService
                                .downloadFile("signatures", imageUrl)
                                .readAllBytes();
                        PDImageXObject signatureImage = PDImageXObject.createFromByteArray(
                                document, signatureBytes, "signature-" + field.getFieldId());

                        cs.drawImage(signatureImage, x, pdfY, width, height);
                        log.info(
                                "[burnVisuals] Field {} ({}) — vẽ ảnh MinIO tại x={}, y={}, w={}, h={}",
                                field.getFieldId(),
                                type,
                                x,
                                pdfY,
                                width,
                                height);

                    } else if (type == FieldType.CHECKBOX) {
                        // ─── Checkbox — vẽ dấu ✓ ───
                        if ("true".equalsIgnoreCase(fieldValue)
                                || "1".equals(fieldValue)
                                || "checked".equals(fieldValue)) {
                            cs.beginText();
                            cs.setFont(new PDType1Font(Standard14Fonts.FontName.ZAPF_DINGBATS), 14);
                            cs.newLineAtOffset(x + (width / 2) - 5, pdfY + (height / 2) - 5);
                            cs.showText("\u2714");
                            cs.endText();
                            log.info(
                                    "[burnVisuals] Field {} (CHECKBOX) — vẽ ✓ tại x={}, y={}",
                                    field.getFieldId(),
                                    x,
                                    pdfY);
                        }

                    } else {
                        // ─── TEXT, NAME, EMAIL, DATE, NUMBER — vẽ text Unicode ───
                        float fontSize = Math.max(8, Math.min(14, height * 0.6f));
                        cs.beginText();
                        cs.setFont(textFont, fontSize);
                        cs.newLineAtOffset(x + 2, pdfY + (height / 2) - (fontSize / 3));
                        safeShowText(cs, textFont, fieldValue);
                        cs.endText();
                        log.info(
                                "[burnVisuals] Field {} ({}) — vẽ text '{}' tại x={}, y={}",
                                field.getFieldId(),
                                type,
                                fieldValue,
                                x,
                                pdfY);
                    }
                }
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            document.save(baos);
            log.info("[burnVisuals] docId={} — PDF pre-sealed thành công, size={} bytes", documentId, baos.size());
            return baos.toByteArray();

        } catch (Exception e) {
            log.error("Error burning visuals to PDF for docId: " + documentId, e);
            throw new RuntimeException("Error writing visuals to PDF", e);
        }
    }

    /**
     * Thêm trang Audit Log (Certificate of Completion) vào cuối file PDF.
     */
    public void appendAuditLogPageToDocument(
            PDDocument document,
            com.spring.esign.entity.AuditTrail audit,
            com.spring.esign.entity.DocumentSigner signer) {
        try {
            // Load font Unicode cho trang audit
            PDFont unicodeFont = loadUnicodeFont(document);
            PDFont bodyFont = unicodeFont != null ? unicodeFont : new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            PDFont titleFont =
                    unicodeFont != null ? unicodeFont : new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);

            PDPage auditPage = new PDPage();
            document.addPage(auditPage);

            try (PDPageContentStream cs = new PDPageContentStream(document, auditPage)) {
                // ─── Title ───
                cs.beginText();
                cs.setFont(titleFont, 18);
                cs.newLineAtOffset(50, 700);
                safeShowText(cs, titleFont, "Certificate of Completion (Audit Log)");
                cs.endText();

                // ─── Body ───
                cs.beginText();
                cs.setFont(bodyFont, 12);
                cs.newLineAtOffset(50, 660);
                cs.setLeading(20f);

                safeShowText(cs, bodyFont, "Document ID: " + audit.getDocument().getDocumentId());
                cs.newLine();
                safeShowText(cs, bodyFont, "Signer Name: " + audit.getSignerName());
                cs.newLine();
                safeShowText(cs, bodyFont, "Signer Email: " + audit.getSignerEmail());
                cs.newLine();
                safeShowText(cs, bodyFont, "Signer IP: " + audit.getSignerIp());
                cs.newLine();
                safeShowText(
                        cs,
                        bodyFont,
                        "Signed At: " + java.time.LocalDateTime.now().toString());
                cs.newLine();
                safeShowText(cs, bodyFont, "Signature Format: WebAuthn PAdES");
                cs.newLine();
                safeShowText(cs, bodyFont, "WebAuthn Credential ID: " + audit.getCredentialId());
                cs.newLine();
                safeShowText(cs, bodyFont, "Document Hash (Before Seal): " + audit.getPdfHashBefore());

                cs.endText();
            }
        } catch (Exception e) {
            log.error("Error appending audit page", e);
            throw new RuntimeException("Error appending audit page", e);
        }
    }

    private byte[] inputStreamToByteArray(InputStream is) {
        try {
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            int nRead;
            byte[] data = new byte[16384];
            while ((nRead = is.read(data, 0, data.length)) != -1) {
                buffer.write(data, 0, nRead);
            }
            return buffer.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
