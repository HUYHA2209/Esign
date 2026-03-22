import { useEffect, useRef, useCallback } from 'react';
import { saveDraft } from '../../../service/documentApi';

export function useAutoSaveDraft({
    id,
    documentName,
    recipients,
    currentStep,
    fields,
    uploadedFiles,
    navigate,
    isLoading,
}) {
    const isSaving = useRef(false);
    const hasUnsavedChanges = useRef(false);
    const hasMounted = useRef(false);
    const draftJustLoaded = useRef(false);

    // ─── Ref luôn có giá trị mới nhất ───
    const stateRef = useRef({});
    stateRef.current = { id, documentName, recipients, currentStep, fields, uploadedFiles, navigate };

    // ─── Helper: Strip recipients (remove UI-only fields) ───
    const stripRecipients = (recipients) =>
        recipients.map(({ id, email, name, role }) => ({ id, email, name, role }));

    // ─── Core: Build FormData & gọi API ───
    const buildAndSave = useCallback(async (extraFiles = [], overrideName = null) => {
        const { id, documentName, recipients, currentStep, fields, uploadedFiles, navigate } = stateRef.current;
        const finalDocName = overrideName !== null ? overrideName : documentName;

        if (uploadedFiles.length === 0 && extraFiles.length === 0) return null;
        if (isSaving.current) return null;

        // Skip if no changes (unless uploading new files)
        if (extraFiles.length === 0 && !hasUnsavedChanges.current) {
            return null;
        }

        const payloadMeta = {
            groupId: id ? parseInt(id) : null,
            documentName: finalDocName,
            recipients: stripRecipients(recipients),
            currentStep,
            totalFiles: uploadedFiles.length + extraFiles.length,
            fields,
            existingFiles: uploadedFiles
                .filter(f => f.isExisting)
                .map(f => ({ id: f.id, name: f.name, size: f.size }))
        };

        isSaving.current = true;
        try {
            const formData = new FormData();
            extraFiles.forEach(f => formData.append('files', f.file));
            formData.append('data', JSON.stringify(payloadMeta));

            const newId = await saveDraft(formData);
            hasUnsavedChanges.current = false;

            if (newId && String(newId) !== String(id)) {
                navigate(`/document-editor/${newId}`, { replace: true });
            }
            return newId;
        } catch (error) {
            console.error("Save draft failed:", error);
            return null;
        } finally {
            isSaving.current = false;
        }
    }, []);

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
            setTimeout(() => {
                draftJustLoaded.current = false;
            }, 3000);
        }
        prevIsLoading.current = isLoading;
    }, [isLoading]);

    useEffect(() => {
        if (!hasMounted.current) {
            hasMounted.current = true;
            return;
        }
        if (isLoading) return;
        if (stateRef.current.uploadedFiles.length === 0) return;
        if (draftJustLoaded.current) return;

        hasUnsavedChanges.current = true;
    }, [recipients, fields, documentName, currentStep, isLoading]);

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

    return { saveWithFiles, saveNow, confirmAndSave, isSaving: isSaving.current, hasUnsavedChanges };
}