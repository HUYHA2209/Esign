import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useParams, useNavigate } from 'react-router-dom';
import SignHeader from './components/SignHeader';
import SignSidebar from './components/SignSidebar';
import SignContent from './components/SignContent';
import { getReceivedGroupDetail, downloadDocumentsFileToRecipients, rejectSign } from '../../service/documentApi';
import { prepareGroupSigning, completeGroupSigning } from '../../service/signingApi';
import { base64urlToBuffer, credentialToJSON } from '../../utils/webauthn';
import { getSignature } from '../../service/signatureApi';
import { getOrgSignature } from '../../service/organizationApi';
import { ChevronUp, Loader2, AlertCircle } from 'lucide-react';
import DeclineModal from './components/DeclineModal';


const ReceivedDocuments = () => {
    const { id: groupId, orgUrl } = useParams();
    const navigate = useNavigate();

    // ─── State ───
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Group info
    const [groupDetail, setGroupDetail] = useState(null);

    // Documents & PDF blobs
    const [documents, setDocuments] = useState([]); // [{documentId, fileName, status, fields}]
    const [pdfUrls, setPdfUrls] = useState({}); // {documentId: blobUrl}

    // Fields assigned to current user
    const [myFields, setMyFields] = useState([]); // [{fieldId, type, page, x, y, width, height, documentId, value}]
    const [fieldValues, setFieldValues] = useState({}); // {fieldId: value}

    // User info
    const [currentUserEmail, setCurrentUserEmail] = useState('');
    const [fullName, setFullName] = useState('');

    // Saved signature
    const [savedSignature, setSavedSignature] = useState(null); // {imageBase64, signatureType, textStyle}

    // Currently active document index (for multi-doc groups)
    const [activeDocIndex, setActiveDocIndex] = useState(0);

    // Signing state
    const [isSigning, setIsSigning] = useState(false);
    const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);

    // Add guard ref to prevent React 18 Strict Mode from fetching API twice
    const dataLoadedRef = useRef(false);

    // ─── Load data on mount ───
    useEffect(() => {
        if (!groupId) return;
        if (dataLoadedRef.current) return;
        dataLoadedRef.current = true;

        loadSignData();

        return () => {
            // Cleanup function for object URLs to prevent memory leaks
            setPdfUrls(currentUrls => {
                Object.values(currentUrls).forEach(url => {
                    if (typeof url === 'string' && url.startsWith('blob:')) {
                        URL.revokeObjectURL(url);
                    }
                });
                return currentUrls;
            });
        };
    }, [groupId]);

    const loadSignData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Load group detail using the new received-specific API
            const detail = await getReceivedGroupDetail(groupId);

            if (!detail || !detail.documents || detail.documents.length === 0) {
                setError('Không tìm thấy tài liệu');
                return;
            }

            setGroupDetail(detail);
            setDocuments(detail.documents);

            // Set user info from response instead of token
            setCurrentUserEmail(detail.signerEmail || '');
            setFullName(detail.signerName || '');

            // The new API already filters fields and only returns fields assigned to the current signer
            const allMyFields = [];
            for (const doc of detail.documents) {
                if (!doc.fields) continue;

                for (const f of doc.fields) {
                    allMyFields.push({
                        ...f,
                        documentId: doc.documentId,
                        value: f.value || null,
                    });
                }
            }
            setMyFields(allMyFields);

            // Fetch signature: dùng con dấu tổ chức nếu đang ở workspace tổ chức,
            // chữ ký cá nhân nếu ở workspace cá nhân.
            let sigResponse = null;
            try {
                if (orgUrl) {
                    sigResponse = await getOrgSignature(orgUrl);
                } else {
                    sigResponse = await getSignature();
                }
            } catch (e) { console.warn('No signature found or error', e); }

            if (sigResponse?.result) {
                setSavedSignature(sigResponse.result);
            }

            // Download PDFs in parallel and store as object URLs
            const newPdfUrls = {};
            await Promise.all(
                detail.documents.map(async (doc) => {
                    try {
                        const blob = await downloadDocumentsFileToRecipients(doc.documentId);
                        newPdfUrls[doc.documentId] = URL.createObjectURL(blob);
                    } catch (e) {
                        console.error(`Failed to download doc ${doc.documentId}`, e);
                    }
                })
            );
            setPdfUrls(newPdfUrls);

        } catch (err) {
            console.error('Failed to load sign data:', err);
            const errorMessage = err.response?.data?.message || 'Không thể tải dữ liệu tài liệu.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // ─── Field value management ───
    const updateFieldValue = useCallback((fieldId, value) => {
        setFieldValues(prev => {
            if (value === null || value === '') {
                const newValues = { ...prev };
                delete newValues[fieldId];
                return newValues;
            }
            return { ...prev, [fieldId]: value };
        });
    }, []);

    // ─── Compute progress ───
    const totalFields = myFields.length;
    const completedFields = myFields.filter(f => fieldValues[f.fieldId]).length;
    const fieldsRemaining = totalFields - completedFields;
    const progress = totalFields > 0 ? (completedFields / totalFields) * 100 : 0;

    // ─── Handle Complete Sign ───
    const handleCompleteSign = async () => {
        if (fieldsRemaining > 0) {
            alert(`Còn ${fieldsRemaining} trường chưa điền. Vui lòng hoàn thành hết trước khi hoàn tất.`);
            return;
        }

        setIsSigning(true);
        try {
            // Bước 1: Prepare — Gửi fieldValues để BE vẽ lên PDF (Pre-seal), tính hash bản đã vẽ,
            //         tạo WebAuthn challenge dựa trên hash mới, lưu SigningSession
            const prepareResult = await prepareGroupSigning(parseInt(groupId), fieldValues);
            const sessionId = prepareResult.sessionId;
            const options = prepareResult.webAuthnOptions;

            // Bước 2: Chuyển Base64URL challenge → ArrayBuffer cho WebAuthn Browser API
            const publicKeyOptions = {
                ...options,
                challenge: base64urlToBuffer(options.challenge),
                allowCredentials: options.allowCredentials.map(cred => ({
                    ...cred,
                    id: base64urlToBuffer(cred.id)
                }))
            };

            // Trình duyệt bật popup sinh trắc học (FaceID / Vân tay / YubiKey)
            const credential = await navigator.credentials.get({ publicKey: publicKeyOptions });
            const credentialJson = credentialToJSON(credential);

            // Sinh dấu vân tay trình duyệt cơ bản
            const rawFingerprint = [
                navigator.userAgent,
                navigator.language,
                screen.width + 'x' + screen.height,
                Intl.DateTimeFormat().resolvedOptions().timeZone
            ].join('|');
            const deviceFingerprint = btoa(unescape(encodeURIComponent(rawFingerprint)));

            // Bước 3: Gửi về BE: chỉ cần assertion WebAuthn
            // fieldValues đã gửi ở bước prepare — BE đã vẽ lên PDF và hash bản pre-sealed
            // BE sẽ verify assertion, nếu hợp lệ → append Audit page → PAdES seal → upload final
            await completeGroupSigning(
                sessionId,
                parseInt(groupId),
                credentialJson,
                deviceFingerprint
            );

            navigate(orgUrl ? `/o/${orgUrl}/documents/document-sign-success/${groupId}` : `/documents/document-sign-success/${groupId}`);
        } catch (err) {
            console.error('Sign error:', err);
            if (err.name === 'NotAllowedError') {
                alert('Bạn đã hủy xác thực sinh trắc học. Quá trình ký được dừng lại.');
            } else {
                const errorMessage = err.response?.data?.message || err.message || 'Có lỗi xảy ra khi hoàn tất ký.';
                toast.error(errorMessage);
                if (err.response?.status === 400 || err.response?.status === 500) {
                    loadSignData();
                }
            }
        } finally {
            setIsSigning(false);
        }
    };

    // ─── Handle Reject Sign ───
    const handleRejectSign = async (reason) => {
        setIsSigning(true);
        try {
            await rejectSign(parseInt(groupId), { reason });
            toast.success('Đã từ chối ký tài liệu.');
            setIsDeclineModalOpen(false);
            navigate(orgUrl ? `/o/${orgUrl}/documents` : '/documents');
        } catch (err) {
            console.error('Reject error:', err);
            const errorMessage = err.response?.data?.message || 'Có lỗi xảy ra khi từ chối ký.';
            toast.error(`Lỗi: ${errorMessage}`);
        } finally {
            setIsSigning(false);
        }
    };

    // ─── Handle Download PDF ───
    const handleDownloadPdf = async () => {
        try {
            const activeDoc = documents[activeDocIndex] || null;
            if (!activeDoc) return;
            const blob = await downloadDocumentsFileToRecipients(activeDoc.documentId, 'download');
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', activeDoc.fileName || 'document.pdf');
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            toast.success('Đã tải xuống tài liệu');
        } catch (err) {
            console.error('Download error:', err);
            toast.error('Có lỗi xảy ra khi tải xuống tài liệu');
        }
    };


    // ─── Active document ───
    const activeDoc = documents[activeDocIndex] || null;
    const activePdfUrl = activeDoc ? pdfUrls[activeDoc.documentId] : null;
    const activeDocFields = myFields.filter(f => f.documentId === activeDoc?.documentId);

    // ─── Loading / Error states ───
    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">Đang tải tài liệu...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <p className="text-red-500 text-lg font-medium mb-4">{error}</p>
                    <button onClick={() => navigate(orgUrl ? `/o/${orgUrl}/documents` : '/documents')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                        Quay lại
                    </button>
                </div>
            </div>
        );
    }

    const isDeclinedOrVoid = groupDetail?.status?.toUpperCase() === 'DECLINED' || groupDetail?.status?.toUpperCase() === 'VOID' || groupDetail?.status?.toUpperCase() === 'VOIDED';

    return (
        <div className="h-screen w-full overflow-hidden bg-slate-50 flex flex-col">
            <SignHeader
                documentTitle={groupDetail?.groupName || 'Tài liệu'}
                role="Signer"
                fieldsRemaining={fieldsRemaining}
                onComplete={handleCompleteSign}
                isSigning={isSigning}
                canComplete={fieldsRemaining === 0}
            />

            {isDeclinedOrVoid ? (
                <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
                    <div className="bg-red-50 border border-red-200 rounded-3xl p-10 max-w-lg w-full text-center shadow-xl shadow-red-900/5">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="w-10 h-10 text-red-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-red-800 mb-3 font-display">Tài liệu đã bị hủy hoặc từ chối</h2>
                        <p className="text-red-600/80 font-medium mb-8">
                            Quá trình ký tài liệu này đã bị dừng lại do có bên từ chối ký hoặc người gửi đã hủy bỏ yêu cầu ký. Bạn không thể thực hiện thêm thao tác nào trên tài liệu này.
                        </p>
                        <button 
                            onClick={() => navigate(orgUrl ? `/o/${orgUrl}/documents` : '/documents')}
                            className="inline-flex items-center gap-2 px-8 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                        >
                            Quay lại danh sách
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-1 overflow-hidden">
                    <SignSidebar
                        fieldsRemaining={fieldsRemaining}
                        totalFields={totalFields}
                        progress={progress}
                        fullName={fullName}
                        setFullName={setFullName}
                        savedSignature={savedSignature}
                        onComplete={handleCompleteSign}
                        onReject={() => setIsDeclineModalOpen(true)}
                        onDownload={handleDownloadPdf}
                        isSigning={isSigning}
                        canComplete={fieldsRemaining === 0}
                        documents={documents}
                        activeDocIndex={activeDocIndex}
                        setActiveDocIndex={setActiveDocIndex}
                        pdfUrls={pdfUrls}
                    />

                    <div className="embed--DocumentContainer flex-1 overflow-y-auto overflow-x-hidden relative w-full">
                        <SignContent
                            pdfUrl={activePdfUrl}
                            fields={activeDocFields}
                            fieldValues={fieldValues}
                            updateFieldValue={updateFieldValue}
                            savedSignature={savedSignature}
                            fullName={fullName}
                        />

                        {/* Mobile Bottom Actions */}
                        <div className="block pb-28 lg:hidden">
                            <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 flex justify-center px-2 pb-2 sm:px-4 sm:pb-6">
                                <div className="pointer-events-auto w-full max-w-[760px]">
                                    <div className="bg-white border-slate-200 overflow-hidden rounded-xl border shadow-2xl">
                                        <div className="flex items-center justify-between gap-4 p-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                    <button className="rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 ring-offset-white border border-slate-200 hover:bg-slate-100 text-slate-700 py-2 px-4 flex h-8 w-8 items-center justify-center">
                                                        <ChevronUp className="text-slate-500 h-5 w-5 flex-shrink-0" />
                                                    </button>
                                                    <div>
                                                        <h2 className="text-slate-900 text-lg font-semibold">Ký tài liệu</h2>
                                                        <p className="text-slate-500 -mt-0.5 text-sm">{fieldsRemaining} trường cần ký</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <button
                                                    onClick={handleCompleteSign}
                                                    disabled={fieldsRemaining > 0 || isSigning}
                                                    className="inline-flex items-center justify-center text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 ring-offset-white bg-indigo-600 text-white hover:bg-indigo-700 h-9 px-4 rounded-md w-full"
                                                >
                                                    {isSigning ? 'Đang ký...' : 'Hoàn tất ký'}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="px-4 pb-3">
                                            <div className="bg-slate-100 relative h-[4px] rounded-md overflow-hidden">
                                                <div className="bg-indigo-600 absolute inset-y-0 left-0 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            
            <DeclineModal 
                isOpen={isDeclineModalOpen} 
                onClose={() => setIsDeclineModalOpen(false)} 
                onConfirm={handleRejectSign} 
                isSubmitting={isSigning} 
            />
        </div>
    );
};

export default ReceivedDocuments;
