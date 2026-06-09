/**
 * Validate tài liệu trước khi gửi.
 * 
 * Điều kiện:
 * 1. Mỗi người nhận (có email) phải có ít nhất 1 trường CHỮ KÝ (signature)
 * 2. Mỗi file phải chứa ít nhất 1 trường CHỮ KÝ (signature) thuộc về 1 người nhận
 * 
 * @param {Array} recipients - danh sách người nhận
 * @param {Array} fields - danh sách trường đã đặt
 * @param {Array} uploadedFiles - danh sách file đã upload
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateBeforeSend(recipients, fields, uploadedFiles) {
    const errors = [];
    const validRecipients = recipients.filter(r => r.email && r.email.trim() !== '');
    const signatureFields = fields.filter(f => f.type === 'signature');

    // ─── Rule 1: Mỗi người nhận phải có ít nhất 1 trường SIGNATURE ───
    for (const r of validRecipients) {
        const hasSignature = signatureFields.some(
            f => String(f.recipientId) === String(r.id)
        );
        if (!hasSignature) {
            errors.push(`Người nhận "${r.name || r.email}" chưa có trường chữ ký.`);
        }
    }

    // ─── Rule 2: Mỗi file phải có ít nhất 1 trường SIGNATURE ───
    for (const file of uploadedFiles) {
        const hasSignature = signatureFields.some(
            f => String(f.fileId) === String(file.id)
        );
        if (!hasSignature) {
            errors.push(`Tệp "${file.name}" chưa có trường chữ ký nào.`);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
