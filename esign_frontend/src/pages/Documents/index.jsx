import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyDocuments, getDocumentsGroup, deleteDocumentGroup, getReceivedDocuments, getReceivedGroupDetail, rejectSign, downloadDocumentsFile, downloadDocumentsFileToRecipients } from '../../service/documentApi';
import { checkOrder } from '../../service/signingApi';
import { toast } from 'react-toastify';
import {
    FileText, Upload, Filter, MoreHorizontal,
    Eye, Download, Trash2, Clock, CheckCircle2,
    AlertCircle, PenTool, FolderOpen, Plus, Share2, Copy, Edit, Search, User, ArrowRight, Grid, List as ListIcon, Ban, XCircle, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CancelModal from './components/CancelModal';
import DeclineModal from '../ReceivedDocuments/components/DeclineModal';
import CountdownTimer from './components/CountdownTimer';
import { useParams } from 'react-router-dom';
import { getWorkSpaces } from '../../service/userApi';
const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return dateStr; }
};
const renderEmailsList = (emailsStr, defaultText) => {
    if (!emailsStr) return <span className="text-sm text-secondary-700 truncate block font-medium" title={defaultText}>{defaultText}</span>;
    if (typeof emailsStr !== 'string') return <span className="text-sm text-secondary-700 truncate block font-medium" title={String(emailsStr)}>{String(emailsStr)}</span>;
    const emails = emailsStr.split(',').map(e => e.trim()).filter(Boolean);
    if (emails.length === 0) return <span className="text-sm text-secondary-700 truncate block font-medium" title={defaultText}>{defaultText}</span>;
    return (
        <div className="flex flex-col min-w-0 justify-center">
            {emails.map((email, i) => (
                <span key={i} className="text-sm text-secondary-700 truncate block font-medium" title={email}>
                    {email}
                </span>
            ))}
        </div>
    );
};
const Documents = () => {
    const navigate = useNavigate();
    const { orgUrl } = useParams();
    const [filterStatus, setFilterStatus] = useState('all');
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('my');
    const dropdownRef = useRef(null);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [selectedCancelGroupId, setSelectedCancelGroupId] = useState(null);
    const [isCanceling, setIsCanceling] = useState(false);
    // Decline modal state
    const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
    const [selectedDeclineGroupId, setSelectedDeclineGroupId] = useState(null);
    const [isDeclining, setIsDeclining] = useState(false);
    const [canUpload, setCanUpload] = useState(true);
    const [canViewDocs, setCanViewDocs] = useState(true);

    useEffect(() => {
        if (orgUrl) {
            getWorkSpaces().then(res => {
                if (res && res.result) {
                    const ws = res.result.find(w => w.accountUrl === orgUrl);
                    if (ws) {
                        setCanUpload(ws.role === 'ADMIN' || ws.canUpload);
                        setCanViewDocs(ws.role === 'ADMIN' || ws.canViewDocs);
                    }
                }
            }).catch(console.error);
        } else {
            setCanUpload(true);
            setCanViewDocs(true);
        }
    }, [orgUrl]);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pendingReceivedCount, setPendingReceivedCount] = useState(0);
    const fetchPendingCount = async () => {
        try {
            const data = await getReceivedDocuments();
            let processedData = data;
            if (typeof data === 'string') {
                try { processedData = JSON.parse(data); } catch (e) { }
            }
            if (Array.isArray(processedData)) {
                const grouped = processedData.reduce((acc, doc) => {
                    const key = doc.groupId || `temp-${doc.documentId}`;
                    if (!acc[key]) acc[key] = { ...doc };
                    return acc;
                }, {});
                const count = Object.values(grouped).filter(d => d.status?.toUpperCase() === 'PENDING').length;
                setPendingReceivedCount(count);
            }
        } catch (error) {
            console.error("Failed to fetch pending received count:", error);
        }
    };
    const fetchDocuments = async (mode = viewMode) => {
        try {
            setLoading(true);
            const data = mode === 'received' ? await getReceivedDocuments() : await getMyDocuments();
            let processedData = data;
            if (typeof data === 'string') {
                try {
                    processedData = JSON.parse(data);
                } catch (e) { processedData = []; }
            }
            setDocuments(Array.isArray(processedData) ? processedData : []);
        } catch (error) {
            console.error("Failed to fetch documents:", error);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchDocuments();
        fetchPendingCount();
    }, [viewMode]);
    const handleDeleteDocument = async (groupId) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa tài liệu này không?")) return;
        try {
            await deleteDocumentGroup(groupId);
            toast.success("Xóa tài liệu thành công!");
            fetchDocuments();
        } catch (error) {
            toast.error("Không thể xóa tài liệu. Xảy ra lỗi hệ thống.");
        }
    };
    const handleCancelDocument = async (reason) => {
        if (!selectedCancelGroupId) return;
        setIsCanceling(true);
        try {
            const { cancelGroup } = await import('../../service/documentApi');
            await cancelGroup(selectedCancelGroupId, { reason });
            toast.success("Đã hủy yêu cầu ký tài liệu.");
            setIsCancelModalOpen(false);
            setSelectedCancelGroupId(null);
            fetchDocuments();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Không thể hủy tài liệu. Xảy ra lỗi hệ thống.");
        } finally {
            setIsCanceling(false);
        }
    };
    const handleDeclineDocument = async (reason) => {
        if (!selectedDeclineGroupId) return;
        setIsDeclining(true);
        try {
            await rejectSign(selectedDeclineGroupId, { reason });
            toast.success("Đã từ chối ký tài liệu.");
            setIsDeclineModalOpen(false);
            setSelectedDeclineGroupId(null);
            fetchDocuments();
            fetchPendingCount();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Không thể từ chối ký tài liệu.");
        } finally {
            setIsDeclining(false);
        }
    };

    const handleDownloadPdf = async (documentIds, mode = viewMode) => {
        try {
            if (!documentIds || documentIds.length === 0) return;
            for (let id of documentIds) {
                const blob = mode === 'received' 
                    ? await downloadDocumentsFileToRecipients(id, 'download')
                    : await downloadDocumentsFile(id, 'download');
                const url = window.URL.createObjectURL(new Blob([blob]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `document_${id}.pdf`);
                document.body.appendChild(link);
                link.click();
                link.parentNode.removeChild(link);
            }
            toast.success('Đã tải xuống tài liệu');
        } catch (err) {
            console.error('Download error:', err);
            toast.error('Có lỗi xảy ra khi tải xuống tài liệu. Bạn có thể không có quyền tải bản PDF này.');
        }
    };

    const getStatusBadge = (status) => {
        const configs = {
            signed: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Đã ký', icon: CheckCircle2 },
            completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Đã ký', icon: CheckCircle2 },
            pending: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Chờ ký', icon: Clock },
            draft: { bg: 'bg-secondary-50', text: 'text-secondary-600', border: 'border-secondary-200', label: 'Bản nháp', icon: FileText },
            expired: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Hết hạn', icon: AlertCircle },
            declined: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Bị từ chối', icon: Ban },
            void: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-300', label: 'Đã hủy', icon: Ban }
        };
        const config = configs[status] || configs.draft;
        const Icon = config.icon;
        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${config.bg} ${config.text} ${config.border}`}>
                <Icon className="w-3 h-3" />
                {config.label}
            </span>
        );
    };
    const stats = [
        { label: 'Tổng tài liệu', value: documents.length, icon: FolderOpen, color: 'bg-primary-600' },
        { label: 'Đã ký', value: documents.filter(d => d.status === 'SIGNED' || d.status === 'COMPLETED').length, icon: CheckCircle2, color: 'bg-emerald-600' },
        { label: 'Chờ ký', value: documents.filter(d => d.status === 'PENDING').length, icon: Clock, color: 'bg-amber-600' },
        { label: 'Từ chối/Hủy', value: documents.filter(d => d.status === 'DECLINED' || d.status === 'VOID').length, icon: Ban, color: 'bg-red-600' },
        { label: 'Bản nháp', value: documents.filter(d => d.status === 'DRAFT').length, icon: FileText, color: 'bg-secondary-600' }
    ];
    const groupedDocuments = documents.reduce((acc, doc) => {
        const key = doc.groupId || `temp-${doc.documentId}`;
        if (!acc[key]) {
            acc[key] = {
                ...doc,
                fileCount: 0,
                allIds: [],
                groupId: key,
                recipientsSet: new Set()
            };
        }
        acc[key].fileCount += 1;
        acc[key].allIds.push(doc.documentId);
        if (doc.recipient) {
            doc.recipient.split(',').forEach(r => {
                const trimmed = r.trim();
                if (trimmed) acc[key].recipientsSet.add(trimmed);
            });
        }
        return acc;
    }, {});
    const displayList = Object.values(groupedDocuments).map(g => {
        if (g.recipientsSet && g.recipientsSet.size > 0) {
            g.recipient = Array.from(g.recipientsSet).join(', ');
        }
        return g;
    });
    const filteredDocs = displayList
        .filter(d => {
            if (filterStatus === 'all') return true;
            const s = d.status?.toUpperCase();
            if (filterStatus === 'signed') return s === 'SIGNED' || s === 'COMPLETED';
            return s === filterStatus.toUpperCase();
        })
        .filter(d => d.title.toLowerCase().includes(searchQuery.toLowerCase()));
    const getActionItems = (doc) => {
        const docId = doc.groupId || doc.documentId;
        const status = doc.status?.toUpperCase();
        // PENDING: chỉ cho Hủy (cancel/void), KHÔNG cho Xóa
        if (status === 'PENDING') {
            return [
                { icon: Shield, label: 'Xem lịch sử', onClick: () => navigate(orgUrl ? `/o/${orgUrl}/documents/${doc.documentId || docId}/audit-trail` : `/documents/${doc.documentId || docId}/audit-trail`) },
                {
                    icon: XCircle,
                    label: 'Hủy tài liệu',
                    onClick: () => {
                        setSelectedCancelGroupId(docId);
                        setIsCancelModalOpen(true);
                    },
                    danger: true
                }
            ];
        }
        // DRAFT: Chỉnh sửa + Xóa
        if (status === 'DRAFT') {
            return [
                {
                    icon: Edit,
                    label: 'Chỉnh sửa',
                    onClick: () => navigate(orgUrl ? `/o/${orgUrl}/documents/document-editor/${doc.groupId || doc.documentId}` : `/documents/document-editor/${doc.groupId || doc.documentId}`),
                    highlight: true
                },
                { icon: Download, label: 'Tải xuống', onClick: () => handleDownloadPdf(doc.allIds || [doc.documentId]) },
                { icon: Trash2, label: 'Xóa', onClick: () => handleDeleteDocument(docId), danger: true }
            ];
        }
        // COMPLETED: chỉ xem/tải, KHÔNG cho Xóa hay Hủy
        if (status === 'COMPLETED' || status === 'SIGNED') {
            return [
                { icon: Download, label: 'Tải xuống', onClick: () => handleDownloadPdf(doc.allIds || [doc.documentId]) },
                { icon: Shield, label: 'Xem lịch sử', onClick: () => navigate(orgUrl ? `/o/${orgUrl}/documents/${doc.documentId || docId}/audit-trail` : `/documents/${doc.documentId || docId}/audit-trail`) },
                { icon: Share2, label: 'Chia sẻ', onClick: () => console.log('Share', docId) },
                { icon: Copy, label: 'Sao chép', onClick: () => console.log('Copy', docId) }
            ];
        }
        // VOID, DECLINED, EXPIRED: cho tải xuống + Xem lịch sử + Xóa (dọn dẹp)
        return [
            { icon: Download, label: 'Tải xuống', onClick: () => handleDownloadPdf(doc.allIds || [doc.documentId]) },
            { icon: Shield, label: 'Xem lịch sử', onClick: () => navigate(orgUrl ? `/o/${orgUrl}/documents/${doc.documentId || docId}/audit-trail` : `/documents/${doc.documentId || docId}/audit-trail`) },
            { icon: Trash2, label: 'Xóa', onClick: () => handleDeleteDocument(docId), danger: true }
        ];
    };
    const handleCheckOrder = async (groupId) => {
        try {
            const canSign = await checkOrder(groupId);
            if (canSign) {
                navigate(orgUrl ? `/o/${orgUrl}/documents/document-sign/${groupId}` : `/documents/document-sign/${groupId}`);
            } else {
                toast.warning('Chưa đến lượt bạn ký. Vui lòng chờ người ký trước hoàn tất.');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || `hehe ${groupId}`);
        }
    };
    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-bold text-secondary-900 font-display mb-2">Tài liệu</h1>
                    <div className="flex items-center gap-2">
                        <div className="flex bg-secondary-100 p-1 rounded-xl relative">
                            <button
                                onClick={() => setViewMode('my')}
                                className={`relative z-10 px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${viewMode === 'my' ? 'text-secondary-900' : 'text-secondary-500 hover:text-secondary-700'}`}>
                                Của tôi
                                {viewMode === 'my' && (
                                    <motion.div
                                        layoutId="activeTabPill"
                                        className="absolute inset-0 bg-white rounded-lg shadow-sm -z-10"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                            </button>
                            <button
                                onClick={() => setViewMode('received')}
                                className={`relative z-10 px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 flex items-center gap-2 ${viewMode === 'received' ? 'text-secondary-900' : 'text-secondary-500 hover:text-secondary-700'}`}>
                                <span>Nhận được</span>
                                {pendingReceivedCount > 0 && (
                                    <span className="bg-primary-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                        {pendingReceivedCount}
                                    </span>
                                )}
                                {viewMode === 'received' && (
                                    <motion.div
                                        layoutId="activeTabPill"
                                        className="absolute inset-0 bg-white rounded-lg shadow-sm -z-10"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
                {canUpload && (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate(orgUrl ? `/o/${orgUrl}/documents/document-editor` : '/documents/document-editor')}
                        className="inline-flex items-center gap-2 px-6 py-3.5 premium-gradient text-white rounded-2xl shadow-lg shadow-primary-500/25 hover:shadow-primary-500/35 transition-all font-bold text-sm"
                    >
                        <Upload className="w-5 h-5" />
                        Tải tài liệu mới
                    </motion.button>
                )}
            </div>
            {/* UX Hint for limited view */}
            {!canViewDocs && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    <p className="text-sm font-medium text-blue-700">
                        Bạn chỉ có thể xem các tài liệu do chính bạn tải lên hoặc các tài liệu bạn được yêu cầu xử lý.
                    </p>
                </div>
            )}
            {/* Stats Dashboard */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                {stats.map((stat, index) => (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        key={index}
                        className="bg-white rounded-[24px] p-6 shadow-premium border border-secondary-100 flex items-center gap-5"
                    >
                        <div className={`w-14 h-14 ${stat.color} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
                            <stat.icon className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-secondary-900 font-display">{stat.value}</p>
                            <p className="text-xs font-bold text-secondary-400 uppercase tracking-widest">{stat.label}</p>
                        </div>
                    </motion.div>
                ))}
            </div>
            {/* Filter & Table Container */}
            <div className="bg-white rounded-[32px] shadow-premium border border-secondary-100">
                {/* Search & Filter Bar */}
                <div className="p-6 border-b border-secondary-50 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-center bg-secondary-50 rounded-2xl px-5 py-3 w-full lg:max-w-md group focus-within:bg-white focus-within:ring-4 focus-within:ring-primary-500/10 transition-all border border-transparent focus-within:border-primary-500/30">
                        <Search className="w-5 h-5 text-secondary-400 group-focus-within:text-primary-600 transition-colors" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo tên tài liệu..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent border-none focus:outline-none text-sm ml-3 w-full text-secondary-700 font-medium"
                        />
                    </div>
                    <div className="flex items-center gap-2 p-1.5 bg-secondary-50 rounded-2xl overflow-x-auto whitespace-nowrap hide-scrollbar">
                        {['all', 'signed', 'pending', 'declined', 'draft'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${filterStatus === status
                                    ? 'bg-white text-primary-600 shadow-sm border border-secondary-100'
                                    : 'text-secondary-500 hover:text-secondary-800'
                                    }`}
                            >
                                {status === 'all' ? 'Tất cả' : status === 'signed' ? 'Đã ký' : status === 'pending' ? 'Chờ ký' : status === 'declined' ? 'Từ chối' : 'Nháp'}
                            </button>
                        ))}
                    </div>
                </div>
                {/* Table Content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={viewMode}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-x-auto pb-28"
                    >
                        <table className="w-full table-fixed min-w-[900px]">
                            <thead className="bg-secondary-50/50">
                                <tr>
                                    <th className="text-left py-5 px-8 text-[10px] font-bold text-secondary-400 uppercase tracking-widest w-[32%]">Tài liệu</th>
                                    <th className="text-left py-5 px-6 text-[10px] font-bold text-secondary-400 uppercase tracking-widest w-[13%]">Trạng thái</th>
                                    <th className="text-left py-5 px-6 text-[10px] font-bold text-secondary-400 uppercase tracking-widest w-[21%]">Gửi bởi</th>
                                    <th className="text-left py-5 px-6 text-[10px] font-bold text-secondary-400 uppercase tracking-widest w-[19%]">Nhận bởi</th>
                                    <th className="text-left py-5 px-6 text-[10px] font-bold text-secondary-400 uppercase tracking-widest text-center w-[15%]">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-50">
                                <AnimatePresence mode="popLayout">
                                    {filteredDocs.map((doc, idx) => (
                                        <motion.tr
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            key={doc.documentId}
                                            className="hover:bg-primary-50/30 transition-colors group cursor-default"
                                        >
                                            <td className="py-5 px-8">
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 group-hover:scale-110 transition-transform duration-500 flex-shrink-0">
                                                        <FileText className="w-6 h-6" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="font-bold text-secondary-900 block truncate text-sm" title={doc.title}>{doc.title}</span>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-tighter">ID: {doc.groupId?.toString().substring(0, 8)}</span>
                                                            <span className="w-1 h-1 bg-secondary-200 rounded-full"></span>
                                                            <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-tighter">{formatDate(doc.createdAt)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-5 px-6">
                                                <div className="flex flex-col gap-1.5">
                                                    {getStatusBadge(doc.status?.toLowerCase() || 'draft')}
                                                    {doc.status?.toUpperCase() === 'PENDING' && doc.expiresAt && (
                                                        <CountdownTimer expiresAt={doc.expiresAt} onExpire={() => fetchDocuments()} />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-5 px-6">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-8 h-8 bg-secondary-100 rounded-full flex items-center justify-center flex-shrink-0 ring-2 ring-white">
                                                        <User className="w-4 h-4 text-secondary-500" />
                                                    </div>
                                                    {renderEmailsList(viewMode === 'received' ? doc.uploadedBy : 'Tôi', '—')}
                                                </div>
                                            </td>
                                            <td className="py-5 px-6">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-8 h-8 bg-secondary-100 rounded-full flex items-center justify-center flex-shrink-0 ring-2 ring-white">
                                                        <User className="w-4 h-4 text-secondary-500" />
                                                    </div>
                                                    {renderEmailsList(viewMode === 'received' ? 'Tôi' : doc.recipient, '—')}
                                                </div>
                                            </td>
                                            <td className="py-5 px-6" ref={activeDropdown === doc.documentId ? dropdownRef : null}>
                                                <div className="flex items-center justify-center gap-2">
                                                    {viewMode === 'received' ? (
                                                        (() => {
                                                            const signerStatus = doc.signerStatus?.toUpperCase();
                                                            const overallStatus = doc.status?.toUpperCase();
                                                            const statusToCheck = (overallStatus === 'DECLINED' || overallStatus === 'VOID')
                                                                ? overallStatus
                                                                : (signerStatus || overallStatus);
                                                            const isLocalExpired = doc.expiresAt && new Date(doc.expiresAt) <= new Date();
                                                            const effectiveStatus = isLocalExpired ? 'EXPIRED' : statusToCheck;

                                                            if (effectiveStatus === 'PENDING') {
                                                                return (
                                                                    <div className="flex flex-col items-center gap-1.5">
                                                                        <motion.button
                                                                            whileHover={{ scale: 1.04 }}
                                                                            whileTap={{ scale: 0.96 }}
                                                                            onClick={() => handleCheckOrder(doc.groupId || doc.documentId)}
                                                                            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-primary-600 text-white text-[11px] font-bold rounded-lg shadow-md shadow-primary-500/20 hover:bg-primary-700 transition-all whitespace-nowrap"
                                                                        >
                                                                            <PenTool className="w-3.5 h-3.5" />
                                                                            Ký ngay
                                                                        </motion.button>
                                                                        <button
                                                                            onClick={() => {
                                                                                setSelectedDeclineGroupId(doc.groupId || doc.documentId);
                                                                                setIsDeclineModalOpen(true);
                                                                            }}
                                                                            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-red-500 bg-red-50 hover:bg-red-100 text-[11px] font-bold rounded-lg transition-all whitespace-nowrap border border-red-100 hover:border-red-200"
                                                                        >
                                                                            <Ban className="w-3.5 h-3.5" />
                                                                            Từ chối
                                                                        </button>
                                                                    </div>
                                                                );
                                                            }
                                                            if (effectiveStatus === 'SIGNED' || effectiveStatus === 'COMPLETED') {
                                                                return (
                                                                    <div className="flex flex-col items-center gap-1.5">
                                                                        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-lg border border-emerald-200 whitespace-nowrap">
                                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                                            Đã hoàn thành
                                                                        </span>
                                                                        {overallStatus === 'COMPLETED' && (
                                                                            <motion.button
                                                                                whileHover={{ scale: 1.04 }}
                                                                                whileTap={{ scale: 0.96 }}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleDownloadPdf(doc.allIds || [doc.documentId]);
                                                                                }}
                                                                                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white text-[11px] font-bold rounded-lg shadow-md hover:bg-indigo-700 transition-all whitespace-nowrap"
                                                                            >
                                                                                <Download className="w-3.5 h-3.5" />
                                                                                Tải bản PDF
                                                                            </motion.button>
                                                                        )}
                                                                    </div>
                                                                );
                                                            }
                                                            if (effectiveStatus === 'DECLINED') {
                                                                return (
                                                                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-red-50 text-red-600 text-[11px] font-bold rounded-lg border border-red-200 whitespace-nowrap">
                                                                        <Ban className="w-3.5 h-3.5" />
                                                                        Đã từ chối
                                                                    </span>
                                                                );
                                                            }
                                                            // VOID, EXPIRED, etc.
                                                            return (
                                                                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-slate-50 text-slate-500 text-[11px] font-bold rounded-lg border border-slate-200 whitespace-nowrap">
                                                                    <AlertCircle className="w-3.5 h-3.5" />
                                                                    {overallStatus === 'EXPIRED' ? 'Hết hạn' : 'Đã hủy'}
                                                                </span>
                                                            );
                                                        })()
                                                    ) : (
                                                        <div className="relative">
                                                            <button
                                                                onClick={() => setActiveDropdown(activeDropdown === doc.documentId ? null : doc.documentId)}
                                                                className={`p-2.5 rounded-xl transition-all duration-300 ${activeDropdown === doc.documentId ? 'bg-secondary-900 text-white' : 'bg-secondary-50 text-secondary-400 hover:text-secondary-600'}`}
                                                            >
                                                                <MoreHorizontal className="w-5 h-5" />
                                                            </button>
                                                            <AnimatePresence>
                                                                {activeDropdown === doc.documentId && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                                                        className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-secondary-100 z-[60] overflow-hidden p-2"
                                                                    >
                                                                        {getActionItems(doc).map((action, actionIdx) => (
                                                                            <button
                                                                                key={actionIdx}
                                                                                onClick={() => {
                                                                                    action.onClick();
                                                                                    setActiveDropdown(null);
                                                                                }}
                                                                                className={`w-full flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all ${action.danger
                                                                                    ? 'text-red-600 hover:bg-red-50'
                                                                                    : action.highlight
                                                                                        ? 'text-primary-600 hover:bg-primary-50'
                                                                                        : 'text-secondary-600 hover:bg-secondary-50'
                                                                                    }`}
                                                                            >
                                                                                <action.icon className="w-4 h-4" />
                                                                                {action.label}
                                                                            </button>
                                                                        ))}
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </motion.div>
                </AnimatePresence>
                {/* Empty State */}
                {filteredDocs.length === 0 && !loading && (
                    <div className="p-20 text-center flex flex-col items-center">
                        <div className="w-24 h-24 bg-secondary-50 rounded-full flex items-center justify-center mb-6">
                            <FolderOpen className="w-12 h-12 text-secondary-200" />
                        </div>
                        <h3 className="text-xl font-bold text-secondary-900 mb-2 font-display">Không tìm thấy tài liệu</h3>
                        <p className="text-secondary-500 font-medium mb-8 max-w-xs">Hãy thử thay đổi từ khóa tìm kiếm hoặc tải lên tài liệu mới.</p>
                        {canUpload && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate(orgUrl ? `/o/${orgUrl}/documents/document-editor` : '/documents/document-editor')}
                                className="inline-flex items-center gap-2 px-8 py-3.5 premium-gradient text-white rounded-2xl font-bold shadow-lg shadow-primary-500/20"
                            >
                                <Plus className="w-5 h-5" />
                                Tải tài liệu lên
                            </motion.button>
                        )}
                    </div>
                )}
            </div>
            <CancelModal
                isOpen={isCancelModalOpen}
                onClose={() => {
                    setIsCancelModalOpen(false);
                    setSelectedCancelGroupId(null);
                }}
                onConfirm={handleCancelDocument}
                isSubmitting={isCanceling}
            />
            <DeclineModal
                isOpen={isDeclineModalOpen}
                onClose={() => {
                    setIsDeclineModalOpen(false);
                    setSelectedDeclineGroupId(null);
                }}
                onConfirm={handleDeclineDocument}
                isSubmitting={isDeclining}
            />
        </div>
    );
};
export default Documents;
