import { saveDraft } from '../../../service/documentApi';
import { buildSendPayload } from './sendPayloadBuilder';

export async function performSaveDraft(uploadedFiles, metadata) {
    const formData = new FormData();
    let hasNewFiles = false;

    uploadedFiles.forEach(f => {
        if (f.file instanceof File && !f.isExisting) {
            formData.append('files', f.file);
            hasNewFiles = true;
        }
    });

    const payloadMeta = {
        groupId: metadata.documentId || null,
        documentName: metadata.documentName,
        recipients: metadata.recipients,
        currentStep: metadata.currentStep,
        totalFiles: uploadedFiles.length,
        fields: metadata.fields,
        existingFiles: uploadedFiles.filter(f => f.isExisting).map(f => ({ id: f.id, name: f.name, size: f.size }))
    };

    formData.append('data', JSON.stringify(payloadMeta));

    if (hasNewFiles || metadata.documentId || uploadedFiles.length > 0) {
        return await saveDraft(formData);
    }

    return null;
}


export async function sendDocumentFlow({
    id,
    uploadedFiles,
    documentName,
    recipients,
    enableSigningOrder,
    fields,
    signatureFontSize,
    sendDocument,
    toast,
    navigate,
    setIsSending
}) {
    setIsSending(true);
    try {
        try {
            await performSaveDraft(uploadedFiles, {
                documentId: id ? parseInt(id) : null,
                documentName,
                recipients,
                currentStep: 2,
                fields
            });
        } catch (e) {
            // continue even if draft save fails
            console.error('Saving draft failed before send:', e);
        }

        // Build explicit payload with helper for clarity and easier backend mapping
        const payload = buildSendPayload({
            message: 'Vui lòng xem và ký tài liệu này.',
            recipients,
            fields,
            enableSigningOrder
        });

        // normalize fontSize into each field
        payload.signers.forEach(s => {
            s.fields = s.fields.map(f => ({ ...f, fontSize: signatureFontSize }));
        });

        await sendDocument(id, payload);

        toast.success('Gửi tài liệu thành công! Người nhận có thể đăng nhập để xem và ký.');
        navigate('/documents');
    } catch (error) {
        toast.error(error?.response?.data?.message || 'Gửi tài liệu thất bại. Vui lòng thử lại!');
        console.error('Lỗi gửi tài liệu:', error);
    } finally {
        setIsSending(false);
    }
}
