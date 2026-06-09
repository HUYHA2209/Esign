import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Shield, ShieldCheck, ShieldAlert, FileText,
    Eye, Send, PenTool, XCircle, CheckCircle2, Clock,
    Download, AlertTriangle, Loader2, RefreshCw, Monitor,
    Bell, ChevronDown, LogOut, User, FileSignature, Globe
} from 'lucide-react';
import { getAuditTrails, verifyAuditChain, getDocument, downloadDocumentsFile, downloadDocumentsFileToRecipients, getGroupDetail } from '../../service/documentApi';
import { getUserProfile, logoutUser, getWorkSpaces } from '../../service/userApi';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';

const EVENT_CONFIG = {
    UPLOAD: { icon: FileText, color: 'bg-blue-500', label: 'Tải lên', textColor: 'text-blue-600' },
    SENT: { icon: Send, color: 'bg-indigo-500', label: 'Gửi đi', textColor: 'text-indigo-600' },
    VIEWED: { icon: Eye, color: 'bg-amber-500', label: 'Đã xem', textColor: 'text-amber-600' },
    SIGNED: { icon: PenTool, color: 'bg-emerald-500', label: 'Đã ký', textColor: 'text-emerald-600' },
    DECLINED: { icon: XCircle, color: 'bg-red-500', label: 'Từ chối', textColor: 'text-red-600' },
    COMPLETED: { icon: CheckCircle2, color: 'bg-green-600', label: 'Hoàn tất', textColor: 'text-green-600' },
    EXPIRED: { icon: Clock, color: 'bg-gray-500', label: 'Hết hạn', textColor: 'text-gray-500' },
    VOIDED: { icon: AlertTriangle, color: 'bg-orange-500', label: 'Hủy bỏ', textColor: 'text-orange-600' },
    DOWNLOADED: { icon: Download, color: 'bg-cyan-500', label: 'Tải xuống', textColor: 'text-cyan-600' }
};

const AuditTrailPage = () => {
    const { documentId, orgUrl } = useParams();
    const navigate = useNavigate();
    const [trails, setTrails] = useState([]);
    const [docData, setDocData] = useState(null);

    const [loading, setLoading] = useState(true);
    const [verifyResult, setVerifyResult] = useState(null);
    const [verifying, setVerifying] = useState(false);
    const [downloading, setDownloading] = useState(false);

    // User profile and workspace states
    const [userProfile, setUserProfile] = useState(null);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [orgName, setOrgName] = useState('');
    const dropdownRef = useRef(null);

    const [activeDocId, setActiveDocId] = useState(documentId);
    const [groupDocs, setGroupDocs] = useState([]);
    const [activePdfUrl, setActivePdfUrl] = useState(null);

    const fetchData = useCallback(async (docId) => {
        try {
            setLoading(true);
            const [trailsData, docResp] = await Promise.all([
                getAuditTrails(docId).catch(e => []),
                getDocument(docId).catch(e => null)
            ]);

            setTrails(trailsData || []);
            setDocData(docResp);

            if (docResp && docResp.groupId && groupDocs.length === 0) {
                try {
                    const groupInfo = await getGroupDetail(docResp.groupId);
                    if (groupInfo && groupInfo.documents && groupInfo.documents.length > 0) {
                        setGroupDocs(groupInfo.documents);
                    } else {
                        // fallback if group detail doesn't return documents array properly
                        setGroupDocs([docResp]);
                    }
                } catch (e) { console.error("Failed to fetch group details", e); }
            } else if (!docResp?.groupId && groupDocs.length === 0) {
                setGroupDocs([docResp]);
            }

            if (docResp && (docResp.status === 'COMPLETED' || docResp.status === 'SIGNED')) {
                // Fetch PDF for completed view
                try {
                    const blob = await downloadDocumentsFile(docId);
                    const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
                    setActivePdfUrl(url);
                } catch (pdfErr) {
                    try {
                        const blobRec = await downloadDocumentsFileToRecipients(docId);
                        const url = URL.createObjectURL(new Blob([blobRec], { type: 'application/pdf' }));
                        setActivePdfUrl(url);
                    } catch (e2) {
                        console.error('Failed to load PDF preview', e2);
                        setActivePdfUrl(null);
                    }
                }
            } else {
                setActivePdfUrl(null);
            }
        } catch (err) {
            console.error(err);
            toast.error('Không thể tải dữ liệu tài liệu.');
        } finally {
            setLoading(false);
        }
    }, [groupDocs.length]);

    useEffect(() => {
        if (activeDocId) {
            fetchData(activeDocId);
        }
    }, [activeDocId, fetchData]);

    useEffect(() => {
        return () => {
            if (activePdfUrl) URL.revokeObjectURL(activePdfUrl);
        };
    }, [activePdfUrl]);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const profile = await getUserProfile();
                setUserProfile(profile);
            } catch (err) {
                console.error("Failed to fetch user profile", err);
            }
        };
        fetchProfile();
    }, []);

    useEffect(() => {
        if (!orgUrl) return;
        const fetchOrgName = async () => {
            try {
                const res = await getWorkSpaces();
                if (res && res.result) {
                    const ws = res.result.find(w => w.accountUrl === orgUrl);
                    if (ws) {
                        setOrgName(ws.accountName || ws.companyName || 'Tổ chức');
                    }
                }
            } catch (err) {
                console.error("Failed to fetch workspaces", err);
            }
        };
        fetchOrgName();
    }, [orgUrl]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowProfileMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        try {
            await logoutUser();
        } catch (error) {
            console.error("Logout failed:", error);
        }
        sessionStorage.clear();
        navigate('/');
    };

    const getInitials = (name) => {
        if (!name) return '';
        return name
            .trim()
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 3);
    };

    const handleVerify = async () => {
        try {
            setVerifying(true);
            const result = await verifyAuditChain(documentId);
            setVerifyResult(result);
            if (result.valid) {
                toast.success('Chuỗi Audit hợp lệ — không phát hiện sự can thiệp nào.');
            } else {
                toast.error('Phát hiện bất thường trong chuỗi Audit!');
            }
        } catch (err) {
            console.error(err);
            toast.error('Lỗi khi kiểm tra tính toàn vẹn.');
        } finally {
            setVerifying(false);
        }
    };

    const handleDownload = async () => {
        if (!docData) return;
        try {
            setDownloading(true);
            let blob;
            try {
                blob = await downloadDocumentsFile(documentId, 'download');
            } catch (err) {
                blob = await downloadDocumentsFileToRecipients(documentId, 'download');
            }
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${docData.title || 'document'}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
            toast.error('Có lỗi xảy ra khi tải xuống.');
        } finally {
            setDownloading(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    };

    const truncateHash = (hash) => {
        if (!hash) return null;
        if (hash.length <= 16) return hash;
        return hash.substring(0, 8) + '...' + hash.substring(hash.length - 8);
    };

    const parseUserAgent = (ua) => {
        if (!ua) return null;
        let browser = 'Unknown Browser';
        let os = 'Unknown OS';
        if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
        else if (ua.includes('Edg')) browser = 'Edge';
        else if (ua.includes('Firefox')) browser = 'Firefox';
        else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';

        if (ua.includes('Windows')) os = 'Windows';
        else if (ua.includes('Mac OS')) os = 'macOS';
        else if (ua.includes('Linux')) os = 'Linux';
        else if (ua.includes('Android')) os = 'Android';
        else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

        return { browser, os, raw: ua };
    };

    if (loading) {
        return (
            <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-50/50">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    <p className="text-sm text-slate-500 font-medium animate-pulse">Đang tải dữ liệu tài liệu...</p>
                </div>
            </div>
        );
    }

    const isCompleted = docData && (docData.status === 'COMPLETED' || docData.status === 'SIGNED');

    const handleBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate(orgUrl ? `/o/${orgUrl}/documents` : '/documents');
        }
    };

    return (
        <div className="w-screen h-screen flex flex-col bg-slate-50/30 overflow-hidden font-sans">
            {/* Custom Premium Header */}
            <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-40 flex-shrink-0">
                {/* Left Section: Back + Brand + Document Title */}
                <div className="flex items-center gap-4 min-w-0">
                    <button
                        onClick={handleBack}
                        className="p-2 hover:bg-slate-100 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 flex-shrink-0"
                        title="Quay lại"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </button>

                    <div className="w-px h-6 bg-slate-200 flex-shrink-0" />

                    {/* Brand or Workspace */}
                    <div className="flex-shrink-0 hidden md:block">
                        {orgUrl ? (
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                                    {orgName ? orgName.charAt(0).toUpperCase() : 'O'}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-800 leading-tight">{orgName || 'Tổ chức'}</span>
                                    <span className="text-[9px] text-slate-400 font-medium">Workspace</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 premium-gradient rounded-lg flex items-center justify-center shadow-md">
                                    <FileSignature className="w-4 h-4 text-white" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-800 leading-tight">DigiSign</span>
                                    <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">Enterprise</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="w-px h-6 bg-slate-200 hidden md:block flex-shrink-0" />

                    {/* Document title and status */}
                    <div className="min-w-0 flex items-center gap-3">
                        <div className="min-w-0">
                            <h1 className="text-sm font-bold text-slate-800 truncate max-w-[200px] sm:max-w-[300px]" title={docData?.title}>
                                {docData?.title || `Tài liệu #${documentId}`}
                            </h1>
                        </div>
                        <div className="flex-shrink-0">
                            {isCompleted ? (
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/50 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Hoàn tất
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/50 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    {docData ? (docData.status === 'SIGNED' ? 'Đã ký' : docData.status === 'DECLINED' ? 'Từ chối' : 'Chưa hoàn tất') : 'Chưa hoàn tất'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Section: Actions + Bell + Profile */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Integrity Verification Action */}
                    <button
                        onClick={handleVerify}
                        disabled={verifying}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-indigo-600 text-xs font-bold rounded-xl transition-all disabled:opacity-60 hover:scale-[1.02] active:scale-[0.98] shadow-sm"
                    >
                        {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">Xác minh toàn vẹn</span>
                    </button>

                    {/* Download Button (Only completed) */}
                    {isCompleted && (
                        <button
                            onClick={handleDownload}
                            disabled={downloading}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-primary-500/10 disabled:opacity-60 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">Tải xuống PDF</span>
                        </button>
                    )}

                    <div className="w-px h-6 bg-slate-200" />

                    {/* Notification Bell */}
                    <button className="relative p-2.5 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all">
                        <Bell className="w-4.5 h-4.5" />
                        <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full ring-2 ring-white" />
                    </button>

                    {/* User dropdown profile */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
                        >
                            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm">
                                <span className="text-[10px] font-bold">{userProfile?.name ? getInitials(userProfile.name) : 'NV'}</span>
                            </div>
                            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-300 ${showProfileMenu ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {showProfileMenu && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                    transition={{ type: "spring", duration: 0.3 }}
                                    className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden p-1.5"
                                >
                                    <div className="px-3.5 py-3 border-b border-slate-50 bg-slate-50/50 rounded-xl mb-1">
                                        <p className="font-bold text-slate-800 text-xs truncate">{userProfile?.name || 'Nguyễn Văn A'}</p>
                                        <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium">{userProfile?.email || 'nguyenvana@example.com'}</p>
                                    </div>
                                    <div className="space-y-0.5">
                                        <button
                                            onClick={() => {
                                                setShowProfileMenu(false);
                                                navigate(orgUrl ? `/o/${orgUrl}/profile` : '/profile');
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-lg transition-all text-left"
                                        >
                                            <User className="w-3.5 h-3.5 text-slate-400" />
                                            <span>Hồ sơ cá nhân</span>
                                        </button>
                                        <div className="border-t border-slate-50 my-1 mx-1.5" />
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-all text-left"
                                        >
                                            <LogOut className="w-3.5 h-3.5 text-red-400" />
                                            <span>Đăng xuất</span>
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 min-h-0 w-full bg-slate-50/40 p-6 md:p-8 overflow-hidden flex flex-col items-center">
                <div className="max-w-[1600px] w-full flex flex-col gap-4 h-full min-h-0">

                    {/* Group Documents Tabs */}
                    {groupDocs.length > 1 && (
                        <div className="w-full flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {groupDocs.map((d, index) => (
                                <button
                                    key={d.documentId}
                                    onClick={() => setActiveDocId(String(d.documentId))}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap border ${activeDocId === String(d.documentId)
                                            ? 'bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-500/20'
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                        }`}
                                >
                                    <FileText className={`w-4 h-4 ${activeDocId === String(d.documentId) ? 'text-white' : 'text-slate-400'}`} />
                                    {d.title || d.fileName || `Tài liệu ${index + 1}`}
                                </button>
                            ))}
                        </div>
                    )}

                    {isCompleted ? (
                        /* Layout chia đôi dạng Card cho tài liệu hoàn tất */
                        <div className="w-full h-full grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 min-h-0 overflow-hidden">
                            {/* Left Panel: PDF Viewer Card */}
                            <div className="lg:col-span-7 xl:col-span-8 bg-white rounded-[24px] border border-slate-200/80 shadow-sm flex flex-col min-h-0 relative p-3">
                                <div className="flex-1 rounded-[16px] overflow-hidden bg-slate-100/50 border border-slate-150 shadow-inner relative flex flex-col">
                                    {activePdfUrl ? (
                                        <iframe
                                            src={`${activePdfUrl}#toolbar=0`}
                                            className="w-full h-full border-none"
                                            title="PDF Preview"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center flex-1 gap-2 bg-slate-100/20">
                                            <Loader2 className="w-6 h-6 text-slate-350 animate-spin" />
                                            <p className="text-slate-400 font-medium text-xs">Đang tải bản xem trước PDF...</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Panel: Audit Trail Timeline Card */}
                            <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-[24px] border border-slate-200/80 shadow-sm flex flex-col min-h-0 overflow-hidden">
                                <div className="px-6 py-4.5 border-b border-slate-100 flex items-center bg-slate-50/30 flex-shrink-0">
                                    <h2 className="text-xs font-bold text-slate-850 flex items-center gap-2">
                                        <Shield className="w-4.5 h-4.5 text-indigo-500" />
                                        Lịch sử thao tác tài liệu
                                    </h2>
                                    <span className="ml-2.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold text-[10px]">
                                        {trails.length} sự kiện
                                    </span>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white">
                                    {/* Verification Alert Panel */}
                                    {verifyResult && (
                                        <div className={`mb-5 p-3.5 rounded-xl border flex items-start gap-3 transition-all ${verifyResult.valid ? 'bg-emerald-50 border-emerald-250/50' : 'bg-red-50 border-red-250/50'
                                            }`}>
                                            {verifyResult.valid ? (
                                                <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                                            ) : (
                                                <ShieldAlert className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className={`font-bold text-xs ${verifyResult.valid ? 'text-emerald-800' : 'text-red-800'}`}>
                                                    {verifyResult.valid ? 'Chuỗi Audit hợp lệ' : 'Phát hiện bất thường!'}
                                                </p>
                                                <p className={`text-[10px] mt-0.5 leading-relaxed ${verifyResult.valid ? 'text-emerald-600 font-medium' : 'text-red-650 font-medium'}`}>
                                                    {verifyResult.message}
                                                </p>
                                            </div>
                                            <button onClick={() => setVerifyResult(null)} className="p-0.5 hover:bg-black/5 rounded-lg flex-shrink-0">
                                                <XCircle className="w-4 h-4 opacity-55" />
                                            </button>
                                        </div>
                                    )}

                                    {renderTimeline(trails, parseUserAgent, truncateHash, formatDate)}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Layout đơn chính giữa cho tài liệu chưa hoàn tất */
                        <div className="h-full overflow-y-auto custom-scrollbar w-full py-4">
                            <div className="max-w-3xl mx-auto">
                                {verifyResult && (
                                    <div className={`mb-5 p-3.5 rounded-xl border flex items-start gap-3 transition-all ${verifyResult.valid ? 'bg-emerald-50 border-emerald-250/50' : 'bg-red-50 border-red-250/50'
                                        }`}>
                                        {verifyResult.valid ? (
                                            <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                                        ) : (
                                            <ShieldAlert className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-bold text-xs ${verifyResult.valid ? 'text-emerald-800' : 'text-red-800'}`}>
                                                {verifyResult.valid ? 'Chuỗi Audit hợp lệ' : 'Phát hiện bất thường!'}
                                            </p>
                                            <p className={`text-[10px] mt-0.5 leading-relaxed ${verifyResult.valid ? 'text-emerald-600 font-medium' : 'text-red-650 font-medium'}`}>
                                                {verifyResult.message}
                                            </p>
                                        </div>
                                        <button onClick={() => setVerifyResult(null)} className="p-0.5 hover:bg-black/5 rounded-lg flex-shrink-0">
                                            <XCircle className="w-4 h-4 opacity-55" />
                                        </button>
                                    </div>
                                )}

                                {trails.length === 0 ? (
                                    <div className="text-center py-16 bg-white rounded-[24px] border border-dashed border-slate-200/80 shadow-sm my-8">
                                        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                        <p className="text-slate-500 text-sm font-medium">Chưa có lịch sử thao tác nào cho tài liệu này.</p>
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-[24px] border border-slate-200/80 shadow-sm p-6 sm:p-8">
                                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                                            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                                <Shield className="w-4.5 h-4.5 text-indigo-500" />
                                                Lịch sử thao tác tài liệu
                                            </h2>
                                            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold text-[10px]">
                                                {trails.length} sự kiện
                                            </span>
                                        </div>
                                        <div className="relative">
                                            <div className="space-y-1">
                                                {renderTimeline(trails, parseUserAgent, truncateHash, formatDate)}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {trails.length > 0 && (
                                    <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-200/40 flex items-center gap-3">
                                        <Shield className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                                        <p className="text-[11px] text-slate-500 leading-normal">
                                            Mỗi hành động trong hệ thống đều được lưu vết kèm mã hash SHA-256 độc lập. Nhấn <strong>"Xác minh toàn vẹn"</strong> ở góc trên bên phải để kiểm tra sự can thiệp.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Hàm hỗ trợ render timeline để tái sử dụng ở cả 2 nơi (hoàn tất & chưa hoàn tất)
function renderTimeline(trails, parseUserAgent, truncateHash, formatDate) {
    return trails.map((trail, index) => {
        const config = EVENT_CONFIG[trail.eventType] || EVENT_CONFIG.UPLOAD;
        const Icon = config.icon;
        const uaInfo = parseUserAgent(trail.deviceFingerprint);
        const isLast = index === trails.length - 1;
        const isCrypto = trail.eventType === 'SIGNED';

        return (
            <div key={trail.auditId} className="relative pl-12 pb-6 last:pb-2 group">
                {/* Timeline Line Connector */}
                {!isLast && (
                    <div className="absolute left-[17px] top-6 bottom-0 w-0.5 bg-slate-200" />
                )}

                {/* Timeline Badge/Icon */}
                <div className={`absolute left-2 w-7 h-7 rounded-full ${config.color} flex items-center justify-center shadow-md ring-4 ring-white z-10 hover:scale-110 transition-transform duration-200`}>
                    <Icon className="w-3.5 h-3.5 text-white" />
                </div>

                {/* Card Container */}
                <div className={`bg-white rounded-2xl border border-slate-250/60 p-5 shadow-sm hover:shadow-md hover:border-slate-350 transition-all duration-300 ${isLast ? 'ring-2 ring-indigo-50/50 border-indigo-200/80 shadow-indigo-100/10' : ''}`}>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${config.color} bg-opacity-10 ${config.textColor}`}>
                                    {config.label}
                                </span>
                                {isCrypto && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-750 border border-emerald-100/50 flex items-center gap-1">
                                        <Shield className="w-3 h-3" /> Có chữ ký số
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-slate-700 font-semibold leading-relaxed">{trail.eventDescription}</p>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap sm:text-right mt-0.5">
                            {formatDate(trail.timestamp)}
                        </span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs border-t border-slate-100 pt-3.5">
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Người thực hiện</span>
                            <p className="text-slate-700 font-semibold mt-0.5 truncate">{trail.signerName || 'Hệ thống'}</p>
                            <p className="text-slate-400 text-[11px] truncate mt-0.5">{trail.signerEmail || 'system@esign.vn'}</p>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Thiết bị & Địa chỉ IP</span>
                            {trail.signerIp && <p className="text-slate-700 font-semibold font-mono text-[11px] mt-0.5">{trail.signerIp}</p>}
                            {uaInfo && (
                                <p className="text-slate-550 text-[11px] flex items-center gap-1.5 mt-0.5 truncate" title={uaInfo.raw}>
                                    <Monitor className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> {uaInfo.browser} trên {uaInfo.os}
                                </p>
                            )}
                            {!trail.signerIp && !uaInfo && <p className="text-slate-400 font-medium mt-0.5">—</p>}
                        </div>
                    </div>

                    {isCrypto && (
                        <div className="mt-4 pt-3.5 border-t border-slate-100 bg-slate-50/50 -mx-5 -mb-5 px-5 pb-5 rounded-b-2xl">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Bằng chứng mật mã</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                                {trail.pdfHashBefore && (
                                    <div>
                                        <span className="text-[10px] text-slate-400">Hash PDF trước ký</span>
                                        <p className="text-slate-600 font-mono text-[11px] mt-0.5 truncate" title={trail.pdfHashBefore}>{truncateHash(trail.pdfHashBefore)}</p>
                                    </div>
                                )}
                                {trail.pdfHashAfter && (
                                    <div>
                                        <span className="text-[10px] text-slate-400">Hash PDF sau ký</span>
                                        <p className="text-slate-600 font-mono text-[11px] mt-0.5 truncate" title={trail.pdfHashAfter}>{truncateHash(trail.pdfHashAfter)}</p>
                                    </div>
                                )}
                                {trail.credentialId && (
                                    <div>
                                        <span className="text-[10px] text-slate-400">Credential ID</span>
                                        <p className="text-slate-600 font-mono text-[11px] mt-0.5 truncate" title={trail.credentialId}>{truncateHash(trail.credentialId)}</p>
                                    </div>
                                )}
                                {trail.keyAlgorithm && (
                                    <div>
                                        <span className="text-[10px] text-slate-400">Thuật toán khóa</span>
                                        <p className="text-slate-600 font-mono text-[11px] mt-0.5">{trail.keyAlgorithm}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {!isCrypto && (trail.pdfHashBefore || trail.pdfHashAfter) && (
                        <div className="mt-4 pt-3.5 border-t border-slate-100 bg-slate-50/50 -mx-5 -mb-5 px-5 pb-5 rounded-b-2xl">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                                {trail.pdfHashBefore && (
                                    <div>
                                        <span className="text-[10px] text-slate-400">Hash tài liệu (SHA-256)</span>
                                        <p className="text-slate-600 font-mono text-[11px] mt-0.5 truncate" title={trail.pdfHashBefore}>{truncateHash(trail.pdfHashBefore)}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    });
}

export default AuditTrailPage;
