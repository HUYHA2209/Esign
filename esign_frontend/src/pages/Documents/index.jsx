import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyDocuments, getDocumentsGroup, deleteDocumentGroup, getReceivedDocuments } from '../../service/documentApi';
import { toast } from 'react-toastify';
import {
    FileText, Upload, Filter, MoreHorizontal,
    Eye, Download, Trash2, Clock, CheckCircle2,
    AlertCircle, PenTool, FolderOpen, Plus, Share2, Copy, Edit, Search, User
} from 'lucide-react';

const Documents = () => {
    const navigate = useNavigate();
    const [filterStatus, setFilterStatus] = useState('all');
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('my'); // 'my' or 'received'
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
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

    const fetchDocuments = async (mode = viewMode) => {
        try {
            setLoading(true);
            const data = mode === 'received' ? await getReceivedDocuments() : await getMyDocuments();
            let processedData = data;
            if (typeof data === 'string') {
                try {
                    processedData = JSON.parse(data);
                } catch (e) {
                    console.error("Error parsing document data:", e);
                    processedData = [];
                }
            }

            // Ensure data is an array before setting state
            setDocuments(Array.isArray(processedData) ? processedData : []);
            if (!Array.isArray(processedData)) {
                console.warn("API did not return an array:", data);
            }
        } catch (error) {
            console.error("Failed to fetch documents:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, [viewMode]);

    const handleDeleteDocument = async (groupId) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa tài liệu này không?")) return;

        try {
            await deleteDocumentGroup(groupId);
            toast.success("Xóa tài liệu thành công!");
            // Refresh list
            fetchDocuments();
        } catch (error) {
            console.error("Lỗi khi xóa tài liệu:", error);
            toast.error("Không thể xóa tài liệu. Xảy ra lỗi hệ thống.");
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            signed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            pending: 'bg-amber-100 text-amber-700 border-amber-200',
            draft: 'bg-slate-100 text-slate-600 border-slate-200',
            expired: 'bg-red-100 text-red-700 border-red-200'
        };
        const labels = {
            signed: 'Đã ký',
            pending: 'Chờ ký',
            draft: 'Bản nháp',
            expired: 'Hết hạn'
        };
        const icons = {
            signed: <CheckCircle2 className="w-3.5 h-3.5" />,
            pending: <Clock className="w-3.5 h-3.5" />,
            draft: <FileText className="w-3.5 h-3.5" />,
            expired: <AlertCircle className="w-3.5 h-3.5" />
        };
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
                {icons[status]}
                {labels[status]}
            </span>
        );
    };

    const stats = [
        { label: 'Tổng tài liệu', value: documents.length, icon: FolderOpen, color: 'bg-indigo-500' },
        { label: 'Đã ký', value: documents.filter(d => d.status === 'SIGNED').length, icon: CheckCircle2, color: 'bg-emerald-500' },
        { label: 'Chờ ký', value: documents.filter(d => d.status === 'PENDING').length, icon: Clock, color: 'bg-amber-500' },
        { label: 'Bản nháp', value: documents.filter(d => d.status === 'DRAFT').length, icon: FileText, color: 'bg-slate-500' }
    ];

    // Group documents by groupId instead of title
    const groupedDocuments = documents.reduce((acc, doc) => {
        const key = doc.groupId || `temp-${doc.documentId}`;
        if (!acc[key]) {
            acc[key] = {
                ...doc,
                fileCount: 0,
                allIds: [],
                groupId: key
            };
        }
        acc[key].fileCount += 1;
        // Keep track of all IDs
        acc[key].allIds.push(doc.documentId);
        return acc;
    }, {});

    const displayList = Object.values(groupedDocuments);

    // Filter by status and search
    // displayList contains a representative doc for each group. 
    // We filter based on that representative doc.
    const filteredDocs = displayList
        .filter(d => filterStatus === 'all' || d.status?.toUpperCase() === filterStatus.toUpperCase())
        .filter(d => d.title.toLowerCase().includes(searchQuery.toLowerCase()));

    const getActionItems = (doc) => {
        // Use groupId for routing and grouping actions
        const docId = doc.groupId || doc.documentId;

        const baseActions = [
            { icon: Eye, label: 'Xem chi tiết', onClick: () => console.log('View', docId) },
            { icon: Download, label: 'Tải xuống', onClick: () => console.log('Download', docId) },
            { icon: Share2, label: 'Chia sẻ', onClick: () => console.log('Share', docId) },
            { icon: Copy, label: 'Sao chép', onClick: () => console.log('Copy', docId) },
        ];

        const status = doc.status?.toUpperCase();

        if (status === 'PENDING') {
            baseActions.unshift({
                icon: PenTool,
                label: 'Ký ngay',
                onClick: () => console.log('Sign', docId),
                highlight: true
            });
        }

        if (status === 'DRAFT') {
            baseActions.unshift({
                icon: Edit,
                label: 'Chỉnh sửa',
                onClick: () => navigate(`/document-editor/${doc.groupId || doc.documentId}`),
                highlight: true
            });
        }

        baseActions.push({ icon: Trash2, label: 'Xóa', onClick: () => handleDeleteDocument(docId), danger: true });

        return baseActions;
    };

    const handleUploadClick = () => {
        navigate('/document-editor');
    };

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Tài liệu</h1>
                    <p className="text-slate-500 mt-1">Quản lý và theo dõi tất cả tài liệu của bạn</p>
                </div>
                <button
                    onClick={handleUploadClick}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all font-medium"
                >
                    <Upload className="w-5 h-5" />
                    Tải tài liệu lên
                </button>
            </div>
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 mb-6">
                <button
                    onClick={() => setViewMode('my')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${viewMode === 'my' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    Tài liệu của tôi
                </button>
                <button
                    onClick={() => setViewMode('received')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${viewMode === 'received' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    Gửi tới tôi
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {stats.map((stat, index) => (
                    <div key={index} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                                <p className="text-sm text-slate-500">{stat.label}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search & Filters */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Search */}
                    <div className="flex items-center bg-slate-100 rounded-lg px-4 py-2.5 w-full md:w-80">
                        <Search className="w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm tài liệu..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent border-none focus:outline-none text-sm ml-3 w-full text-slate-700 placeholder-slate-400"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                        {['all', 'signed', 'pending', 'draft'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterStatus === status
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {status === 'all' ? 'Tất cả' : status === 'signed' ? 'Đã ký' : status === 'pending' ? 'Chờ ký' : 'Nháp'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Documents Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-visible">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="text-left py-4 px-6 text-sm font-semibold text-slate-600 rounded-tl-xl">Tên tài liệu</th>
                            <th className="text-left py-4 px-6 text-sm font-semibold text-slate-600">Trạng thái</th>
                            <th className="text-left py-4 px-6 text-sm font-semibold text-slate-600">Người gửi</th>
                            <th className="text-left py-4 px-6 text-sm font-semibold text-slate-600">Người nhận</th>
                            <th className="text-left py-4 px-6 text-sm font-semibold text-slate-600">Ngày tạo</th>
                            <th className="text-center py-4 px-6 text-sm font-semibold text-slate-600 w-10 rounded-tr-xl">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredDocs.map((doc) => (
                            <tr key={doc.documentId} className="hover:bg-slate-50 transition-colors group">
                                <td className="py-4 px-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 group-hover:bg-indigo-200 transition-colors">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <span className="font-medium text-slate-900 block">{doc.title}</span>
                                            {doc.fileCount >= 1 && (
                                                <span className="text-xs text-slate-500">{doc.fileCount} tệp tin</span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="py-4 px-6">{getStatusBadge(doc.status?.toLowerCase() || 'draft')}</td>
                                <td className="py-4 px-6">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center">
                                            <User className="w-4 h-4 text-slate-500" />
                                        </div>
                                        <span className="text-sm text-slate-700">{doc.uploadedBy?.fullName || 'Me'}</span>
                                    </div>
                                </td>
                                <td className="py-4 px-6">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center">
                                            <User className="w-4 h-4 text-slate-500" />
                                        </div>
                                        <span className="text-sm text-slate-700">{doc.recipient || '—'}</span>
                                    </div>
                                </td>
                                <td className="py-4 px-6 text-sm text-slate-500">{doc.createdAt}</td>
                                <td className="py-4 px-6" ref={activeDropdown === doc.documentId ? dropdownRef : null}>
                                    {viewMode === 'received' ? (
                                        <button
                                            onClick={() => navigate(`/sign/${doc.groupId || doc.documentId}`)}
                                            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] hover:bg-blue-700 hover:-translate-y-0.5 transition-all duration-300 active:scale-95 group"
                                        >
                                            <PenTool className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" />
                                            Ký ngay
                                        </button>
                                    ) : (
                                        <div className="relative inline-flex items-center justify-center">
                                            <button
                                                onClick={() => setActiveDropdown(activeDropdown === doc.documentId ? null : doc.documentId)}
                                                className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                <MoreHorizontal className="w-5 h-5" />
                                            </button>

                                            {activeDropdown === doc.documentId && (
                                                <div className="absolute right-0 bottom-full mb-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200 z-[60] overflow-hidden text-left">
                                                    <div className="py-2">
                                                        {getActionItems(doc).map((action, idx) => (
                                                            <button
                                                                key={idx}
                                                                onClick={() => {
                                                                    action.onClick();
                                                                    setActiveDropdown(null);
                                                                }}
                                                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${action.danger
                                                                    ? 'text-red-600 hover:bg-red-50'
                                                                    : action.highlight
                                                                        ? 'text-indigo-600 hover:bg-indigo-50 font-medium'
                                                                        : 'text-slate-700 hover:bg-slate-50'
                                                                    }`}
                                                            >
                                                                <action.icon className="w-4 h-4" />
                                                                {action.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Empty State */}
            {filteredDocs.length === 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center mt-6">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FolderOpen className="w-10 h-10 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">Không có tài liệu nào</h3>
                    <p className="text-slate-500 mb-6">Bắt đầu bằng việc tải lên tài liệu đầu tiên của bạn</p>
                    <button onClick={handleUploadClick} className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium">
                        <Plus className="w-5 h-5" />
                        Tải tài liệu lên
                    </button>
                </div>
            )}
        </div>
    );
};

export default Documents;
