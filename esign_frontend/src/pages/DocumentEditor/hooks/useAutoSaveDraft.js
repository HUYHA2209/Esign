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
    const debounceTimer = useRef(null);
    const isSaving = useRef(false);
    const hasMounted = useRef(false);
    const lastSavedData = useRef(null);
    const draftJustLoaded = useRef(false);

    // ─── Ref luôn có giá trị mới nhất ───
    const stateRef = useRef({});
    stateRef.current = { id, documentName, recipients, currentStep, fields, uploadedFiles, navigate };

    // ─── Helper: Build FormData & gọi API ───
    const buildAndSave = useCallback(async (extraFiles = [], overrideName = null) => {
        const { id, documentName, recipients, currentStep, fields, uploadedFiles, navigate } = stateRef.current;
        const finalDocName = overrideName !== null ? overrideName : documentName;

        if (uploadedFiles.length === 0 && extraFiles.length === 0) return null;
        if (isSaving.current) return null;

        const payloadMeta = {
            groupId: id ? parseInt(id) : null,
            documentName: finalDocName,
            recipients,
            currentStep,
            totalFiles: uploadedFiles.length + extraFiles.length,
            fields,
            existingFiles: uploadedFiles
                .filter(f => f.isExisting)
                .map(f => ({ id: f.id, name: f.name, size: f.size }))
        };

        const dataKey = JSON.stringify(payloadMeta);
        if (extraFiles.length === 0 && lastSavedData.current === dataKey) {
            return null;
        }

        isSaving.current = true;
        try {
            const formData = new FormData();
            extraFiles.forEach(f => formData.append('files', f.file));
            formData.append('data', JSON.stringify(payloadMeta));

            const newId = await saveDraft(formData);
            lastSavedData.current = dataKey;

            if (newId && String(newId) !== String(id)) {
                navigate(`/document-editor/${newId}`, { replace: true });
            }
            return newId;
        } catch (error) {
            console.error("Auto save draft failed:", error);
            return null;
        } finally {
            isSaving.current = false;
        }
    }, []);

    // ─── Save ngay khi upload file ───
    const saveWithFiles = useCallback(async (newFiles, overrideName = null) => {
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
            debounceTimer.current = null;
        }
        return await buildAndSave(newFiles, overrideName);
    }, [buildAndSave]);

    // ─── Flush save ngay lập tức ───
    const saveNow = useCallback(async () => {
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
            debounceTimer.current = null;
        }
        return await buildAndSave([]);
    }, [buildAndSave]);

    // ─── Khi load xong → bật cờ draftJustLoaded ───
    const prevIsLoading = useRef(isLoading);
    useEffect(() => {
        if (prevIsLoading.current === true && isLoading === false) {
            // Load vừa hoàn tất → đánh dấu để skip tất cả thay đổi tiếp theo
            draftJustLoaded.current = true;
            // Tắt cờ sau 3 giây — đủ thời gian cho mọi state re-render ổn định
            setTimeout(() => {
                draftJustLoaded.current = false;
            }, 3000);
        }
        prevIsLoading.current = isLoading;
    }, [isLoading]);

    // ─── Debounce 2s khi metadata thay đổi ───
    useEffect(() => {
        if (!hasMounted.current) {
            hasMounted.current = true;
            return;
        }
        if (isLoading) return;
        if (stateRef.current.uploadedFiles.length === 0) return;

        // Bỏ qua mọi thay đổi ngay sau khi load draft
        if (draftJustLoaded.current) return;

        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        debounceTimer.current = setTimeout(() => {
            buildAndSave([]);
        }, 2000);

        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, [recipients, fields, documentName, currentStep, isLoading, buildAndSave]);

    // ─── Save khi rời trang ───
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
                buildAndSave([]);
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [buildAndSave]);

    // ─── Cleanup khi unmount ───
    useEffect(() => {
        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, []);

    return { saveWithFiles, saveNow, isSaving: isSaving.current };
}