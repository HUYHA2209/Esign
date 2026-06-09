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

                    const docs = groupDetail.documents || [];

                    // ─── 1. Build global recipients (unique by email) ───
                    const emailMap = new Map(); // email -> { id, email, name, role }
                    let nextLocalId = 1;

                    // Also build a map: any signerId -> local id (for field mapping)
                    const signerIdToLocalId = new Map();

                    for (const doc of docs) {
                        if (doc.recipients) {
                            for (const r of doc.recipients) {
                                const emailKey = r.email.toLowerCase();
                                if (!emailMap.has(emailKey)) {
                                    const localId = nextLocalId++;
                                    emailMap.set(emailKey, {
                                        id: localId,
                                        email: r.email,
                                        name: r.name,
                                        role: r.role || 'signer',
                                    });
                                }
                                // Map this doc's signerId → the local id
                                signerIdToLocalId.set(r.signerId, emailMap.get(emailKey).id);
                            }
                        }
                    }

                    const mappedRecipients = [...emailMap.values()];
                    if (mappedRecipients.length > 0) {
                        setRecipients(mappedRecipients);
                    }

                    // ─── 2. Download files in parallel ───
                    const downloadResults = await Promise.all(
                        docs.map(async (doc) => {
                            const blob = await downloadDocumentsFile(doc.documentId);
                            const fileName = doc.originalFileUrl
                                ? doc.originalFileUrl.split('_').slice(1).join('_')
                                : `document_${doc.documentId}.pdf`;

                            const file = new File([blob], fileName, { type: 'application/pdf' });
                            return {
                                id: Date.now() + Math.random(),
                                name: fileName,
                                size: file.size,
                                file: file,
                                isExisting: true,
                                serverDocumentId: doc.documentId
                            };
                        })
                    );

                    setUploadedFiles(downloadResults);

                    // ─── 3. Build global fields from ALL documents ───
                    const allFields = [];
                    docs.forEach((doc, docIdx) => {
                        if (doc.fields) {
                            for (const f of doc.fields) {
                                // Map recipientId (per-doc signerId) → local recipient id
                                const localRecipientId = f.recipientId
                                    ? (signerIdToLocalId.get(f.recipientId) || null)
                                    : null;

                                allFields.push({
                                    id: `field_${f.fieldId}_${Date.now()}`,
                                    serverFieldId: f.fieldId, // DB primary key for upsert tracking
                                    type: f.type || 'signature',
                                    page: f.page,
                                    fileIndex: docIdx,
                                    fileId: downloadResults[docIdx]
                                        ? downloadResults[docIdx].id
                                        : undefined,
                                    documentId: downloadResults[docIdx]?.serverDocumentId ?? null,
                                    x: f.x,
                                    y: f.y,
                                    width: f.width,
                                    height: f.height,
                                    recipientId: localRecipientId,
                                });
                            }
                        }
                    });

                    if (allFields.length > 0) {
                        setFields(allFields);
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
