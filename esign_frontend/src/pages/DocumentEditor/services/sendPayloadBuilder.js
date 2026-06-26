/**
 * Build the send payload for backend mapping.
 *
 * Returned shape:
 * {
 *   message: string,
 *   signers: [
 *     {
 *       email: string,
 *       name: string,
 *       role: string,
 *       signingOrder: number,
 *       fields: [
 *         {
 *           type: string,       // 'signature' | 'text' | etc.
 *           pageNumber: number, // 1-based page index within the file
 *           fileId: string|number, // local file id or server id
 *           fileIndex: number,   // index in uploadedFiles array
 *           x: number,           // percent (0-100)
 *           y: number,           // percent (0-100)
 *           width: number,       // percent width
 *           height: number,      // percent height
 *           fontSize: number
 *         }
 *       ]
 *     }
 *   ]
 * }
 */

export function buildSendPayload({
    message = 'Vui lòng xem và ký tài liệu này.',
    recipients = [],
    fields = [],
    enableSigningOrder = false,
    expiresAt = null
}) {
    const validRecipients = recipients.filter(r => r.email && r.email.trim() !== '');

    const signers = validRecipients.map((r, index) => {
        const signerFields = fields
            .filter(f => String(f.recipientId) === String(r.id))
            .map(f => ({
                type: f.type,
                pageNumber: f.page,
                fileId: f.fileId,
                fileIndex: f.fileIndex,      // kept as fallback
                documentId: f.documentId,    // preferred: real DB PK
                x: f.x,
                y: f.y,
                width: f.width,
                height: f.height,
                fontSize: f.fontSize || null
            }));

        return {
            email: r.email,
            name: r.name,
            role: r.role,
            signingOrder: enableSigningOrder ? index + 1 : 1,
            accountId: r.accountId || null,
            fields: signerFields
        };
    });

    return { message, signers, enableSigningOrder, expiresAt };
}

export default buildSendPayload;
