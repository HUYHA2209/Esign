import { useState, useEffect, useRef } from 'react';

export function useLoadDraft({
    id,
    setDocumentName,
    setRecipients,
    setCurrentStep,
    setFields,
    setUploadedFiles,
}) {
    const [isLoading, setIsLoading] = useState(false);
    const hasLoadedRef = useRef(false);

    useEffect(() => {
        if (!id) return;

        // ─── Guard: chỉ load 1 lần duy nhất cho mỗi id ───
        if (hasLoadedRef.current) return;
        hasLoadedRef.current = true;

        const loadDraft = async () => {
            setIsLoading(true);
            try {
                const { getGroupDetail, downloadDocumentsFile } = await import('../../../service/documentApi');

                const groupDetail = await getGroupDetail(id);

                if (groupDetail) {
                    setDocumentName(groupDetail.groupName || 'Tài liệu không tên');

                    if (groupDetail.currentStep) {
                        setCurrentStep(groupDetail.currentStep);
                    }

                    // Load recipients from structured data
                    if (groupDetail.recipients && groupDetail.recipients.length > 0) {
                        const mappedRecipients = groupDetail.recipients.map((r, idx) => ({
                            id: r.signerId,
                            email: r.email,
                            name: r.name,
                            role: r.role || 'signer',
                        }));
                        setRecipients(mappedRecipients);
                    }

                    // Download files
                    const docs = groupDetail.documents || [];
                    const loadedFiles = [];
                    for (const doc of docs) {
                        const blob = await downloadDocumentsFile(doc.documentId);
                        const fileName = doc.originalFileUrl
                            ? doc.originalFileUrl.split('_').slice(1).join('_')
                            : `document_${doc.documentId}.pdf`;

                        const file = new File([blob], fileName, { type: 'application/pdf' });
                        loadedFiles.push({
                            id: Date.now() + Math.random(),
                            name: fileName,
                            size: file.size,
                            file: file,
                            isExisting: true,
                            serverDocumentId: doc.documentId
                        });
                    }

                    setUploadedFiles(loadedFiles);

                    // Load fields from structured data
                    if (groupDetail.fields && groupDetail.fields.length > 0 && groupDetail.recipients) {
                        const restoredFields = groupDetail.fields.map(f => {
                            let recipientIndex = 0;
                            if (f.recipientId && groupDetail.recipients) {
                                const idx = groupDetail.recipients.findIndex(r => r.signerId === f.recipientId);
                                recipientIndex = idx + 1;
                            }

                            return {
                                id: `field_${f.fieldId}_${Date.now()}`,
                                type: f.type || 'signature',
                                page: f.page,
                                fileIndex: f.fileIndex,
                                fileId: f.fileIndex !== undefined && loadedFiles[f.fileIndex]
                                    ? loadedFiles[f.fileIndex].id
                                    : undefined,
                                x: f.x,
                                y: f.y,
                                width: f.width,
                                height: f.height,
                                recipientId: f.recipientId,
                                recipientIndex: recipientIndex,
                            };
                        });
                        setFields(restoredFields);
                    }
                }
            } catch (error) {
                console.error("Failed to load draft:", error);
                if (error.response && error.response.data instanceof Blob) {
                    try {
                        const errorText = await error.response.data.text();
                        console.error("Backend error message:", errorText);
                        try {
                            const errorJson = JSON.parse(errorText);
                            if (errorJson.message) {
                                alert(`Lỗi tải tài liệu: ${errorJson.message}`);
                            }
                        } catch (e) {
                            alert(`Lỗi tải tài liệu: ${errorText}`);
                        }
                    } catch (e) {
                        console.error("Could not read error blob");
                    }
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadDraft();
    }, [id]);

    return { isLoading };
}
