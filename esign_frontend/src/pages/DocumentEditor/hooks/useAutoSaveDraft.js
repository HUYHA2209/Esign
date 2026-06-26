import { useEffect, useRef, useCallback } from 'react';
import { uploadDocuments, updateDraft } from '../../../service/documentApi';

/**
 * Compute delta between current state and last-saved snapshot.
 * Returns { upsertSigners, deletedSignerEmails, upsertFields, deletedFieldIds }
 */
function computeDelta(currentRecipients, savedRecipients, currentFields, savedFields, enableSigningOrder) {
    // ── Signers delta (keyed by id) ──
    const savedIdSet = new Set(savedRecipients.filter(r => r.id).map(r => r.id));
    const currentIdSet = new Set(currentRecipients.filter(r => r.id).map(r => r.id));

    // Deleted: ids in saved but not in current
    const deletedDocSignerIds = [...savedIdSet].filter(id => !currentIdSet.has(id));

    // Upsert: all current recipients with valid email (BE will figure out create vs update)
    const upsertSigners = currentRecipients
        .filter(r => r.email && r.email.trim() !== '')
        .map((r, index) => ({
            email: r.email,
            name: r.name,
            role: r.role || 'signer',
            signingOrder: enableSigningOrder ? index + 1 : 1,
            accountId: r.accountId || null,
        }));

    // ── Fields delta (keyed by serverFieldId for existing, id for new) ──
    const savedFieldMap = new Map();
    for (const f of savedFields) {
        if (f.serverFieldId) savedFieldMap.set(f.serverFieldId, f);
    }

    const currentServerFieldIds = new Set();
    const upsertFields = [];

    for (const f of currentFields) {
        if (!f.recipientId) continue; // field must have recipient

        // Find recipient email for this field
        const recipient = currentRecipients.find(r => r.id === f.recipientId);
        if (!recipient || !recipient.email) continue;

        if (f.serverFieldId) {
            // Existing field from DB
            currentServerFieldIds.add(f.serverFieldId);
            const saved = savedFieldMap.get(f.serverFieldId);
            // Always send as upsert (BE will update if changed)
            const hasChanged = !saved
                || saved.x !== f.x || saved.y !== f.y
                || saved.width !== f.width || saved.height !== f.height
                || saved.page !== f.page || saved.type !== f.type
                || saved.documentId !== f.documentId
                || saved.recipientId !== f.recipientId;

            if (hasChanged) {
                upsertFields.push({
                    id: f.serverFieldId,
                    type: f.type,
                    page: f.page,
                    documentId: f.documentId,
                    x: f.x,
                    y: f.y,
                    width: f.width,
                    height: f.height,
                    recipientEmail: recipient.email,
                });
            }
        } else {
            // New field (no server ID yet)
            upsertFields.push({
                id: null,
                type: f.type,
                page: f.page,
                documentId: f.documentId,
                x: f.x,
                y: f.y,
                width: f.width,
                height: f.height,
                recipientEmail: recipient.email,
            });
        }
    }

    // Deleted: fields in saved (with serverFieldId) but not in current
    const deletedFieldIds = [];
    for (const [serverFieldId] of savedFieldMap) {
        if (!currentServerFieldIds.has(serverFieldId)) {
            deletedFieldIds.push(serverFieldId);
        }
    }

    return { upsertSigners, deletedDocSignerIds, upsertFields, deletedFieldIds };
}

export function useAutoSaveDraft({
    id,
    documentName,
    recipients,
    currentStep,
    fields,
    uploadedFiles,
    navigate,
    isLoading,
    enableSigningOrder,
    orgUrl,
}) {
    const isSaving = useRef(false);
    const hasUnsavedChanges = useRef(false);
    const hasMounted = useRef(false);
    const draftJustLoaded = useRef(false);

    // ─── Snapshot: last saved state (for computing delta) ───
    const savedRecipientsRef = useRef([]);
    const savedFieldsRef = useRef([]);

    // ─── Ref luôn có giá trị mới nhất ───
    const stateRef = useRef({});
    stateRef.current = { id, documentName, recipients, currentStep, fields, uploadedFiles, navigate, enableSigningOrder, orgUrl };

    // ─── Set snapshot after load or successful save ───
    const updateSnapshot = useCallback(() => {
        const { recipients, fields } = stateRef.current;
        savedRecipientsRef.current = recipients.map(r => ({ ...r }));
        savedFieldsRef.current = fields.map(f => ({ ...f }));
    }, []);



    // ─── Core: Build & save (POST for create, PUT for update) ───
    const buildAndSave = useCallback(async (extraFiles = [], overrideName = null) => {
        const { id, documentName, recipients, currentStep, fields, uploadedFiles, navigate, enableSigningOrder, orgUrl } = stateRef.current;
        const finalDocName = overrideName !== null ? overrideName : documentName;

        if (uploadedFiles.length === 0 && extraFiles.length === 0) return null;
        if (isSaving.current) return null;

        // Skip if no changes (unless uploading new files)
        if (extraFiles.length === 0 && !hasUnsavedChanges.current) {
            return null;
        }

        isSaving.current = true;
        try {
            // ── Nếu đã có groupId → dùng PUT update-draft (delta) ──
            if (id && extraFiles.length === 0) {
                const delta = computeDelta(
                    recipients,
                    savedRecipientsRef.current,
                    fields,
                    savedFieldsRef.current,
                    enableSigningOrder
                );

                const payload = {
                    documentName: finalDocName,
                    currentStep,
                    enableSigningOrder,
                    ...delta,
                };

                await updateDraft(parseInt(id), payload);
                hasUnsavedChanges.current = false;
                updateSnapshot();
                return id;
            }

            // ── Upload file mới → dùng POST /documents/upload ──
            const groupId = id ? parseInt(id) : null;
            const newId = await uploadDocuments(extraFiles, finalDocName, groupId);
            hasUnsavedChanges.current = false;
            updateSnapshot();

            if (newId && String(newId) !== String(id)) {
                navigate(orgUrl ? `/o/${orgUrl}/documents/document-editor/${newId}` : `/documents/document-editor/${newId}`, { replace: true });
            }
            return newId;
        } catch (error) {
            console.error("Save draft failed:", error);
            return null;
        } finally {
            isSaving.current = false;
        }
    }, [updateSnapshot]);

    // ─── Trigger 1: Save ngay khi upload file ───
    const saveWithFiles = useCallback(async (newFiles, overrideName = null) => {
        hasUnsavedChanges.current = true;
        return await buildAndSave(newFiles, overrideName);
    }, [buildAndSave]);

    // ─── Trigger 2: Save thủ công (flush) ───
    const saveNow = useCallback(async () => {
        return await buildAndSave([]);
    }, [buildAndSave]);

    // ─── Confirm + Save helper (dùng cho navigate away) ───
    const confirmAndSave = useCallback(async () => {
        if (!hasUnsavedChanges.current) return true; // no changes, proceed

        const shouldSave = window.confirm(
            'Bạn có thay đổi chưa lưu. Bạn có muốn lưu bản nháp trước khi rời trang không?\n\n• OK = Lưu rồi rời\n• Cancel = Rời mà không lưu'
        );

        if (shouldSave) {
            await buildAndSave([]);
        } else {
            hasUnsavedChanges.current = false;
        }
        return true; // always proceed after confirm
    }, [buildAndSave]);

    // ─── Track changes: đánh dấu có thay đổi khi state thay đổi ───
    const prevIsLoading = useRef(isLoading);
    useEffect(() => {
        if (prevIsLoading.current === true && isLoading === false) {
            draftJustLoaded.current = true;
            // Set initial snapshot khi draft vừa load xong
            updateSnapshot();
            setTimeout(() => {
                draftJustLoaded.current = false;
            }, 3000);
        }
        prevIsLoading.current = isLoading;
    }, [isLoading, updateSnapshot]);

    useEffect(() => {
        if (!hasMounted.current) {
            hasMounted.current = true;
            return;
        }
        if (isLoading) return;
        if (stateRef.current.uploadedFiles.length === 0) return;
        if (draftJustLoaded.current) return;

        hasUnsavedChanges.current = true;
    }, [recipients, fields, documentName, currentStep, isLoading, enableSigningOrder]);

    // ─── Trigger 3: Đóng tab / cửa sổ → hỏi người dùng ───
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (hasUnsavedChanges.current) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    // ─── Trigger 4: Browser back button → hỏi + lưu ───
    useEffect(() => {
        const handlePopState = async () => {
            if (hasUnsavedChanges.current) {
                const shouldSave = window.confirm(
                    'Bạn có thay đổi chưa lưu. Bạn có muốn lưu bản nháp không?'
                );
                if (shouldSave) {
                    await buildAndSave([]);
                } else {
                    hasUnsavedChanges.current = false;
                }
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [buildAndSave]);

    return { saveWithFiles, saveNow, confirmAndSave, isSaving: isSaving.current, hasUnsavedChanges, updateSnapshot };
}