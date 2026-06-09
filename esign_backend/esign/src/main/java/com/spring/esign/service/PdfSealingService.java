package com.spring.esign.service;

import static java.util.Arrays.asList;

import java.io.ByteArrayOutputStream;
import java.io.FileInputStream;
import java.io.InputStream;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.cert.Certificate;
import java.security.cert.X509Certificate;
import java.util.Calendar;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.interactive.digitalsignature.ExternalSigningSupport;
import org.apache.pdfbox.pdmodel.interactive.digitalsignature.PDSignature;
import org.apache.pdfbox.pdmodel.interactive.digitalsignature.SignatureOptions;
import org.bouncycastle.cert.jcajce.JcaCertStore;
import org.bouncycastle.cms.CMSProcessableByteArray;
import org.bouncycastle.cms.CMSSignedData;
import org.bouncycastle.cms.CMSSignedDataGenerator;
import org.bouncycastle.cms.CMSTypedData;
import org.bouncycastle.cms.jcajce.JcaSignerInfoGeneratorBuilder;
import org.bouncycastle.operator.ContentSigner;
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder;
import org.bouncycastle.operator.jcajce.JcaDigestCalculatorProviderBuilder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.spring.esign.entity.AuditTrail;
import com.spring.esign.entity.DocumentSigner;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class PdfSealingService {

    @Value("${platform.signature.keystore.path}")
    private String keystorePath;

    @Value("${platform.signature.keystore.password}")
    private String keystorePassword;

    @Autowired
    private PdfDocumentService pdfDocumentService;

    public byte[] signPdfPAdES(byte[] unsignedPdfBytes, AuditTrail auditTrail, DocumentSigner ds) {
        try {
            // 1. Load Keystore (PKCS12)
            KeyStore keyStore = KeyStore.getInstance("PKCS12");
            try (FileInputStream fis = new FileInputStream(keystorePath)) {
                keyStore.load(fis, keystorePassword.toCharArray());
            }

            String alias = keyStore.aliases().nextElement();
            PrivateKey privateKey = (PrivateKey) keyStore.getKey(alias, keystorePassword.toCharArray());
            Certificate[] certificateChain = keyStore.getCertificateChain(alias);

            // 2. Load PDF Document từ byte array
            PDDocument document = Loader.loadPDF(unsignedPdfBytes);

            // 3. Append Audit Page directly to the document to avoid NPE in saveIncremental
            if (auditTrail != null && ds != null) {
                pdfDocumentService.appendAuditLogPageToDocument(document, auditTrail, ds);
            }

            // 4. Tạo Object Chữ ký (PDSignature) tích hợp vào PDF
            PDSignature signature = new PDSignature();
            signature.setFilter(PDSignature.FILTER_ADOBE_PPKLITE);
            signature.setSubFilter(PDSignature.SUBFILTER_ADBE_PKCS7_DETACHED);
            signature.setName("E-Sign Hệ Thống");
            signature.setReason("Niêm phong tài liệu điện tử tin cậy WebAuthn");
            signature.setLocation("Internet");
            signature.setSignDate(Calendar.getInstance());

            // 5. Kích hoạt chỗ trống (hollow) trong PDF để nhét chữ ký PKCS#7 vào
            SignatureOptions options = new SignatureOptions();
            options.setPreferredSignatureSize(SignatureOptions.DEFAULT_SIGNATURE_SIZE * 2);
            document.addSignature(signature, options);

            // 6. Sử dụng ExternalSigningSupport — cách chuẩn PDFBox 3.x
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ExternalSigningSupport externalSigning = document.saveIncrementalForExternalSigning(baos);

            // 7. Đọc bytes cần ký
            byte[] bytesToSign;
            try (InputStream contentToSign = externalSigning.getContent()) {
                bytesToSign = contentToSign.readAllBytes();
            }

            // 8. Ký số PKCS#7 (CMS Signed Data) dùng BouncyCastle
            CMSSignedDataGenerator gen = new CMSSignedDataGenerator();

            ContentSigner sha256Signer = new JcaContentSignerBuilder("SHA256withRSA").build(privateKey);
            gen.addSignerInfoGenerator(
                    new JcaSignerInfoGeneratorBuilder(new JcaDigestCalculatorProviderBuilder().build())
                            .build(sha256Signer, (X509Certificate) certificateChain[0]));

            JcaCertStore certs = new JcaCertStore(asList(certificateChain));
            gen.addCertificates(certs);

            CMSTypedData msg = new CMSProcessableByteArray(bytesToSign);
            CMSSignedData signedData = gen.generate(msg, false);

            byte[] cmsSignature = signedData.getEncoded();

            // 9. Chèn chữ ký CMS
            externalSigning.setSignature(cmsSignature);

            byte[] finalPdfBytes = baos.toByteArray();
            document.close();

            log.info("PAdES sealing thành công, kích thước: {} bytes", finalPdfBytes.length);
            return finalPdfBytes;

        } catch (Exception e) {
            log.error("Lỗi khi Seal PAdES file PDF: ", e);
            throw new RuntimeException("Không thể ký Platform Sealing vào PDF", e);
        }
    }
}
