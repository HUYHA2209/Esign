import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSensors, useSensor } from '@dnd-kit/core';
import { pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { toast } from 'react-toastify';

// Services & API
import { sendDocumentFlow } from './services/sendHandlers';
import { validateBeforeSend } from './services/validators';
import { deleteDocument, sendDocument } from '../../../service/documentApi';
import { getWorkSpaces, searchUsersByEmail } from '../../../service/userApi';
import { getOrganizationSigners } from '../../../service/organizationApi';

// Constants & Hooks
import { fieldTypes, steps, quickActions } from './constants';
import { SmartPointerSensor } from './components/DndComponents';
import { useLoadDraft } from './hooks/useLoadDraft';
import { useAutoSaveDraft } from './hooks/useAutoSaveDraft';

// Components
import EditorSidebar from './components/EditorSidebar';
import EditorHeader from './components/EditorHeader';
import Step1Content from './components/Step1Content';
import Step2Content from './components/Step2Content';
import Step3Preview from './components/Step3Preview';

// Configure PDF Worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// ═══════════════════════════════════════════════════════════
// DocumentEditor – Orchestrator chính
// Quản lý state + logic, delegate UI cho các Step component
// ═══════════════════════════════════════════════════════════

const DocumentEditor = () => {
    const navigate = useNavigate();
    const { id, orgUrl } = useParams();
    const pdfScrollRef = useRef(null);
    const lastPointerPosition = useRef({ x: 0, y: 0 });

    // ─── DnD Sensors ───
    const sensors = useSensors(
        useSensor(SmartPointerSensor, {
            activationConstraint: { distance: 5 },
        })
    );

    // ─── State: Wizard Steps ───
    const [currentStep, setCurrentStep] = useState(1);
    const [documentName, setDocumentName] = useState(id ? 'Tài liệu đang chỉnh sửa' : 'Tài liệu mới');
    const [isEditingName, setIsEditingName] = useState(false);

    // ─── State: Files ───
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [isFileDragging, setIsFileDragging] = useState(false);
    const [currentFileIndex, setCurrentFileIndex] = useState(0);

    // ─── State: Recipients ───
    const [recipients, setRecipients] = useState([
        { id: 1, userId: null, email: '', name: '', role: 'signer', isSearching: false, searchResults: [] }
    ]);
    const [enableSigningOrder, setEnableSigningOrder] = useState(false);
    const [selectedRecipient, setSelectedRecipient] = useState(1);
    const [expiresAt, setExpiresAt] = useState(null);

    // ─── State: Fields & PDF ───
    const [signatureFontSize, setSignatureFontSize] = useState(18);
    const [fields, setFields] = useState([]);
    const [numPages, setNumPages] = useState(null);
    const [activeDragItem, setActiveDragItem] = useState(null);

    // ─── State: UI ───
    const [isSending, setIsSending] = useState(false);
    const [isStepAnimating, setIsStepAnimating] = useState(false);
    const [previewFileIndex, setPreviewFileIndex] = useState(0);
    const [previewNumPages, setPreviewNumPages] = useState(0);

    const [orgSigners, setOrgSigners] = useState([]);
    const [orgId, setOrgId] = useState(null);

    // ─── Fetch Organization Signers ───
    useEffect(() => {
        if (!orgUrl) return;
        const fetchOrgSigners = async () => {
            try {
                const workspacesRes = await getWorkSpaces();
                if (workspacesRes && workspacesRes.result) {
                    const ws = workspacesRes.result.find(w => w.accountUrl === orgUrl);
                    if (ws) {
                        setOrgId(ws.accountId);
                        const signersRes = await getOrganizationSigners(ws.accountId);
                        if (signersRes && signersRes.result) {
                            setOrgSigners(signersRes.result);
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to fetch org signers", error);
            }
        };
        fetchOrgSigners();
    }, [orgUrl]);

    // ─── Hook: Load Draft ───
    const { isLoading } = useLoadDraft({
        id,
        setDocumentName,
        setRecipients,
        setCurrentStep,
        setFields,
        setUploadedFiles,
    });

    const { saveWithFiles, saveNow, confirmAndSave } = useAutoSaveDraft({
        id,
        documentName,
        recipients,
        currentStep,
        fields,
        uploadedFiles,
        navigate,
        isLoading,
        enableSigningOrder,
        orgUrl
    });

    // ─── PDF Callbacks ───
    const onDocumentLoadSuccess = ({ numPages }) => setNumPages(numPages);
    const onPreviewDocumentLoadSuccess = ({ numPages }) => setPreviewNumPages(numPages);

    // Track vị trí chuột thực tế (cho DnD chính xác khi scroll)
    useEffect(() => {
        const onPointerMove = (e) => {
            lastPointerPosition.current = { x: e.clientX, y: e.clientY };
        };
        window.addEventListener('pointermove', onPointerMove);
        return () => window.removeEventListener('pointermove', onPointerMove);
    }, []);

    // Sync selectedRecipient khi danh sách recipients thay đổi
    useEffect(() => {
        const validRecipients = recipients.filter(r => r.email && r.email.trim() !== '');
        if (validRecipients.length > 0 && !validRecipients.some(r => r.id === selectedRecipient)) {
            setSelectedRecipient(validRecipients[0].id);
        }
    }, [recipients]);

    // Step animation
    useEffect(() => {
        setIsStepAnimating(true);
        const t = setTimeout(() => setIsStepAnimating(false), 250);
        return () => clearTimeout(t);
    }, [currentStep]);

    // Ngăn trình duyệt mở file PDF khi kéo thả ra ngoài
    useEffect(() => {
        const preventDefault = (e) => e.preventDefault();
        window.addEventListener('dragover', preventDefault);
        window.addEventListener('drop', preventDefault);
        return () => {
            window.removeEventListener('dragover', preventDefault);
            window.removeEventListener('drop', preventDefault);
        };
    }, []);

    // ═══════════════════════════════════════════
    // Drag & Drop Handlers (kéo thả trường ký)
    // ═══════════════════════════════════════════

    const handleDragStart = (event) => {
        setActiveDragItem(event.active.data.current);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveDragItem(null);

        if (!over) return;
        if (!over.id?.toString().startsWith('page-')) return;

        const { pageNumber, fileIndex } = over.data.current;
        const pageNode = document.getElementById(`page-${fileIndex}-${pageNumber}`);
        if (!pageNode) return;

        const rect = pageNode.getBoundingClientRect();
        const clientX = lastPointerPosition.current.x;
        const clientY = lastPointerPosition.current.y;

        const isSidebarItem = !!active.data.current.isSidebar;
        let fieldWidth = active.data.current.width ?? 14;
        let fieldHeight = active.data.current.height ?? 5;

        let x, y;

        if (isSidebarItem) {
            const percentX = ((clientX - rect.left) / rect.width) * 100;
            const percentY = ((clientY - rect.top) / rect.height) * 100;
            x = percentX - fieldWidth / 2;
            y = percentY - fieldHeight / 2;
        } else {
            const initialRect = active.rect.current.initial;
            const activatorEvent = event.activatorEvent;
            const startX = activatorEvent?.clientX ?? activatorEvent?.changedTouches?.[0]?.clientX ?? clientX;
            const startY = activatorEvent?.clientY ?? activatorEvent?.changedTouches?.[0]?.clientY ?? clientY;
            if (initialRect) {
                const mouseOffsetX = startX - initialRect.left;
                const mouseOffsetY = startY - initialRect.top;
                x = ((clientX - mouseOffsetX - rect.left) / rect.width) * 100;
                y = ((clientY - mouseOffsetY - rect.top) / rect.height) * 100;
            } else {
                const percentX = ((clientX - rect.left) / rect.width) * 100;
                const percentY = ((clientY - rect.top) / rect.height) * 100;
                x = percentX - fieldWidth / 2;
                y = percentY - fieldHeight / 2;
            }
        }

        const clampedX = Math.max(0, Math.min(x, 100 - fieldWidth));
        const clampedY = Math.max(0, Math.min(y, 100 - fieldHeight));

        const file = uploadedFiles[fileIndex];
        const fileId = file?.id;
        const documentId = file?.serverDocumentId ?? null;

        if (isSidebarItem) {
            const newField = {
                id: `field-${crypto.randomUUID()}`,
                type: active.data.current.type,
                page: pageNumber,
                fileIndex,
                fileId,
                documentId,
                x: clampedX,
                y: clampedY,
                width: fieldWidth,
                height: fieldHeight,
                recipientId: selectedRecipient,
            };
            setFields(prev => [...prev, newField]);
        } else {
            const fieldId = active.id;
            setFields(prev =>
                prev.map(f =>
                    f.id === fieldId
                        ? { ...f, page: pageNumber, fileIndex, fileId, documentId, x: clampedX, y: clampedY }
                        : f
                )
            );
        }
    };

    const removeField = (id) => {
        setFields(prev => prev.filter(f => f.id !== id));
    };

    const updateFieldSize = (id, newWidth, newHeight) => {
        setFields(prev => prev.map(f => f.id === id ? { ...f, width: newWidth, height: newHeight } : f));
    };

    // ═══════════════════════════════════════════
    // File Handling (upload, drag-drop file, xóa)
    // ═══════════════════════════════════════════

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        if (e.dataTransfer.types.includes('Files')) {
            setIsFileDragging(true);
        }
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        setIsFileDragging(false);
    }, []);

    const processUploadedFiles = async (files) => {
        const newFiles = files.map(f => ({
            id: Date.now() + Math.random(),
            name: f.name,
            size: f.size,
            file: f
        }));
        setUploadedFiles(prev => [...prev, ...newFiles]);

        const docName = documentName === 'Tài liệu mới' ? files[0].name.replace(/\.pdf$/i, '') : documentName;
        if (documentName === 'Tài liệu mới') {
            setDocumentName(docName);
        }

        // ✅ Save ngay lập tức (vì cần gửi file binary)
        await saveWithFiles(newFiles, docName);
    };

    const handleDrop = useCallback(async (e) => {
        e.preventDefault();
        setIsFileDragging(false);
        if (!e.dataTransfer.types.includes('Files')) return;
        const files = Array.from(e.dataTransfer.files).filter(file => file.type === 'application/pdf');
        if (files.length > 0) await processUploadedFiles(files);
    }, [documentName, id, recipients, currentStep, fields, uploadedFiles, navigate]);

    const handleFileInput = async (e) => {
        const files = Array.from(e.target.files).filter(file => file.type === 'application/pdf');
        if (files.length > 0) await processUploadedFiles(files);
    };

    const removeFile = async (fileId) => {
        const fileToDelete = uploadedFiles.find(f => f.id === fileId);
        if (!fileToDelete) return;

        // Helper: remove fields belonging to this file from state
        const cleanupFields = () => {
            setFields(prev => prev.filter(f =>
                f.fileId !== fileId &&
                f.documentId !== fileToDelete.serverDocumentId
            ));
        };

        if (fileToDelete.isExisting && fileToDelete.serverDocumentId) {
            // File is already saved in DB — ask before permanently deleting
            if (!window.confirm('Bạn có chắc chắn muốn xóa tài liệu này? Hành động này không thể hoàn tác.')) {
                return;
            }
            try {
                await deleteDocument(fileToDelete.serverDocumentId);
                setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
                cleanupFields();
                // Adjust currentFileIndex if needed
                setCurrentFileIndex(prev =>
                    prev >= uploadedFiles.length - 1 ? Math.max(0, prev - 1) : prev
                );
            } catch (error) {
                console.error('Failed to delete document:', error);
                toast.error('Không thể xóa tài liệu. Vui lòng thử lại.');
            }
        } else {
            // Local-only file (not yet saved to server) — remove from state only
            setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
            cleanupFields();
            setCurrentFileIndex(prev =>
                prev >= uploadedFiles.length - 1 ? Math.max(0, prev - 1) : prev
            );
        }
    };

    // ═══════════════════════════════════════════
    // Recipients Handling (tìm kiếm, thêm, xóa)
    // ═══════════════════════════════════════════

    const addRecipient = () => {
        const newId = Math.floor(Math.random() * 1000000);
        setRecipients(prev => [...prev, {
            id: newId, userId: null, email: '', name: '', role: 'signer', isSearching: false, searchResults: []
        }]);
    };

    const handleEmailSearch = async (recipientId, emailValue) => {
        setRecipients(prev => prev.map(r =>
            r.id === recipientId ? { ...r, email: emailValue, userId: null, name: '' } : r
        ));
        if (emailValue.length < 2) {
            setRecipients(prev => prev.map(r =>
                r.id === recipientId ? { ...r, isSearching: false, searchResults: [] } : r
            ));
            return;
        }
        setRecipients(prev => prev.map(r =>
            r.id === recipientId ? { ...r, isSearching: true } : r
        ));
        try {
            const results = await searchUsersByEmail(emailValue);
            setRecipients(prev => prev.map(r =>
                r.id === recipientId ? { ...r, searchResults: results || [] } : r
            ));
        } catch (error) {
            console.error("Tìm kiếm user thất bại:", error);
            setRecipients(prev => prev.map(r =>
                r.id === recipientId ? { ...r, searchResults: [] } : r
            ));
        }
    };

    const handleSelectUser = (recipientId, user) => {
        setRecipients(prev => prev.map(r =>
            r.id === recipientId ? {
                ...r, userId: user.id || user.userId, email: user.email, name: user.selectedContextName || user.fullName || user.email, accountId: user.accountId || null, isSearching: false, searchResults: []
            } : r
        ));
    };

    const removeRecipient = (recipientId) => {
        if (recipients.length > 1) {
            setRecipients(prev => prev.filter(r => r.id !== recipientId));
        }
    };

    // ═══════════════════════════════════════════
    // Step Validation & Navigation
    // ═══════════════════════════════════════════

    const hasAtLeastOnePdf = uploadedFiles.length > 0;
    const recipientsWithEmail = recipients.filter(r => (r.email || '').trim().length > 0);
    const hasAtLeastOneRecipientEmail = recipientsWithEmail.length > 0;
    const isStep1Complete = hasAtLeastOnePdf && hasAtLeastOneRecipientEmail;

    const fieldRecipientIds = new Set(fields.map(f => String(f.recipientId)));

    const recipientsMissingFields = recipientsWithEmail.filter(
        r => !fieldRecipientIds.has(String(r.id))
    );
    const isStep2Complete = recipientsWithEmail.length > 0 && recipientsMissingFields.length === 0;
    const canProceed = isStep1Complete;

    const canGoToStep = useCallback((targetStep) => {
        if (targetStep <= 1) return true;
        if (targetStep === 2) return isStep1Complete;
        if (targetStep === 3) return isStep1Complete && isStep2Complete;
        return false;
    }, [isStep1Complete, isStep2Complete]);

    const goToStep = useCallback((targetStep) => {
        if (targetStep === currentStep) return;
        if (canGoToStep(targetStep)) {
            setCurrentStep(targetStep);
            return;
        }
        if (targetStep === 2 && !isStep1Complete) {
            toast.error('Vui lòng tải ít nhất 1 file PDF và nhập email người nhận trước khi sang bước 2.');
            return;
        }
        if (targetStep === 3) {
            if (!isStep1Complete) {
                toast.error('Vui lòng hoàn tất bước 1 trước khi sang bước 3.');
                return;
            }
            if (!isStep2Complete) {
                if (recipientsMissingFields.length > 0) {
                    const missingNames = recipientsMissingFields.map(r => r.name || r.email).join(', ');
                    toast.error(`Mỗi người nhận phải có ít nhất 1 trường ký. Thiếu: ${missingNames}`);
                } else {
                    toast.error('Vui lòng hoàn tất bước 2 trước khi sang bước 3.');
                }
                return;
            }
        }
    }, [canGoToStep, currentStep, isStep1Complete, isStep2Complete, recipientsMissingFields, saveNow]);

    // ═══════════════════════════════════════════
    // Send & Navigation
    // ═══════════════════════════════════════════

    const handleBackNavigation = async () => {
        await confirmAndSave();  // Hỏi confirm nếu có unsaved changes
        navigate(orgUrl ? `/o/${orgUrl}/documents` : '/documents');
    };

    const handleSendDocument = async () => {
        if (!id) {
            toast.error("Vui lòng lưu bản nháp trước khi gửi!");
            return;
        }
        await saveNow();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const validRecipients = recipients.filter(r => r.email && r.email.trim() !== '');
        if (validRecipients.length === 0) {
            toast.error('Vui lòng thêm ít nhất 1 người nhận hợp lệ (email).');
            return;
        }
        const identities = validRecipients.map(r => `${r.email.toLowerCase()}-${r.accountId || 'personal'}`);
        const dupIndex = identities.findIndex((id, i) => identities.indexOf(id) !== i);
        if (dupIndex !== -1) {
            const dupEmail = validRecipients[dupIndex].email;
            toast.error(`Bạn đã thêm tư cách ký này cho email ${dupEmail} rồi. Không thể thêm trùng lặp!`);
            return;
        }
        for (const r of validRecipients) {
            if (!emailRegex.test(r.email)) {
                toast.error(`Email không hợp lệ: ${r.email}`);
                return;
            }
            if ((!r.name || r.name.trim() === '') && (!r.role || r.role === 'signer')) {
                toast.error(`Vui lòng nhập tên cho người nhận: ${r.email}`);
                return;
            }
        }

        // Validate expiresAt bắt buộc
        if (!expiresAt) {
            toast.error('Vui lòng chọn thời hạn ký tài liệu (bước 1).');
            return;
        }
        const expDate = new Date(expiresAt);
        if (expDate <= new Date()) {
            toast.error('Thời hạn ký phải nằm trong tương lai.');
            return;
        }

        // Validate chữ ký: mỗi người nhận + mỗi file phải có ít nhất 1 trường SIGNATURE
        const validation = validateBeforeSend(recipients, fields, uploadedFiles);
        if (!validation.valid) {
            validation.errors.forEach(err => toast.error(err));
            return;
        }

        await sendDocumentFlow({
            id, uploadedFiles, documentName, recipients, enableSigningOrder, fields, signatureFontSize,
            sendDocument, toast, navigate, setIsSending, orgUrl, expiresAt
        });
    };

    // ═══════════════════════════════════════════
    // Render
    // ═══════════════════════════════════════════

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col">
            {isLoading && (
                <div className="fixed inset-0 bg-white/50 z-[60] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            )}

            <EditorHeader
                documentName={documentName}
                isEditingName={isEditingName}
                setIsEditingName={setIsEditingName}
                setDocumentName={setDocumentName}
                handleBackNavigation={handleBackNavigation}
                handleSendDocument={handleSendDocument}
                canProceed={canProceed}
                isSending={isSending}
            />

            <div className="flex flex-1 overflow-hidden">
                <EditorSidebar
                    steps={steps}
                    currentStep={currentStep}
                    goToStep={goToStep}
                    quickActions={quickActions}
                    handleBackNavigation={handleBackNavigation}
                />

                <main className="flex-1 overflow-hidden">
                    <div className="h-[calc(100vh-4rem)] overflow-auto">

                        {currentStep === 1 && (
                            <Step1Content
                                uploadedFiles={uploadedFiles}
                                isFileDragging={isFileDragging}
                                handleDragOver={handleDragOver}
                                handleDragLeave={handleDragLeave}
                                handleDrop={handleDrop}
                                handleFileInput={handleFileInput}
                                removeFile={removeFile}
                                recipients={recipients}
                                orgSigners={orgSigners}
                                addRecipient={addRecipient}
                                handleEmailSearch={handleEmailSearch}
                                handleSelectUser={handleSelectUser}
                                removeRecipient={removeRecipient}
                                enableSigningOrder={enableSigningOrder}
                                setEnableSigningOrder={setEnableSigningOrder}
                                expiresAt={expiresAt}
                                setExpiresAt={setExpiresAt}
                                isStep1Complete={isStep1Complete}
                                canProceed={canProceed}
                                goToStep={goToStep}
                                isStepAnimating={isStepAnimating}
                            />
                        )}

                        {currentStep === 2 && (
                            <Step2Content
                                sensors={sensors}
                                handleDragStart={handleDragStart}
                                handleDragEnd={handleDragEnd}
                                activeDragItem={activeDragItem}
                                uploadedFiles={uploadedFiles}
                                currentFileIndex={currentFileIndex}
                                setCurrentFileIndex={setCurrentFileIndex}
                                numPages={numPages}
                                onDocumentLoadSuccess={onDocumentLoadSuccess}
                                fields={fields}
                                fieldTypes={fieldTypes}
                                removeField={removeField}
                                updateFieldSize={updateFieldSize}
                                pdfScrollRef={pdfScrollRef}
                                selectedRecipient={selectedRecipient}
                                setSelectedRecipient={setSelectedRecipient}
                                recipients={recipients}
                                isStep2Complete={isStep2Complete}
                                goToStep={goToStep}
                                isStepAnimating={isStepAnimating}
                            />
                        )}

                        {currentStep === 3 && (
                            <Step3Preview
                                uploadedFiles={uploadedFiles}
                                previewFileIndex={previewFileIndex}
                                setPreviewFileIndex={setPreviewFileIndex}
                                previewNumPages={previewNumPages}
                                onPreviewDocumentLoadSuccess={onPreviewDocumentLoadSuccess}
                                fields={fields}
                                recipients={recipients}
                                expiresAt={expiresAt}
                                isStep1Complete={isStep1Complete}
                                isStep2Complete={isStep2Complete}
                                isSending={isSending}
                                handleSendDocument={handleSendDocument}
                                goToStep={goToStep}
                                isStepAnimating={isStepAnimating}
                            />
                        )}

                    </div>
                </main>
            </div>
        </div>
    );
};

export default DocumentEditor;
