import { buildSendPayload } from './sendPayloadBuilder';


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
    setIsSending,
    orgUrl
}) {
    setIsSending(true);
    try {

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
        navigate(orgUrl ? `/o/${orgUrl}/documents` : '/documents');
    } catch (error) {
        toast.error(error?.response?.data?.message || 'Gửi tài liệu thất bại. Vui lòng thử lại!');
        console.error('Lỗi gửi tài liệu:', error);
    } finally {
        setIsSending(false);
    }
}
