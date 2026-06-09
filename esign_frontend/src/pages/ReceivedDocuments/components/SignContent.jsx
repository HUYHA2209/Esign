import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Loader2, PenTool, Type, Calendar, Mail, User, Hash, CheckSquare, X, ShieldCheck, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const FIELD_ICONS = {
    signature: PenTool,
    text: Type,
    date: Calendar,
    email: Mail,
    name: User,
    number: Hash,
    initial: PenTool,
    checkbox: CheckSquare,
};

const FIELD_COLORS = {
    unsigned: {
        border: 'border-emerald-400',
        bg: 'bg-emerald-50/80',
        text: 'text-emerald-700',
        hover: 'hover:bg-emerald-100',
        ring: 'ring-emerald-400',
    },
    signed: {
        border: 'border-primary-400',
        bg: 'bg-primary-50/60',
        text: 'text-primary-700',
        hover: 'hover:bg-primary-100/50',
        ring: 'ring-primary-400',
    },
};

const SignContent = ({ pdfUrl, fields, fieldValues, updateFieldValue, savedSignature, fullName }) => {
    const [numPages, setNumPages] = useState(null);
    const [activeField, setActiveField] = useState(null);
    const [inputModal, setInputModal] = useState({ isOpen: false, field: null, value: '' });

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
    };

    const handleFieldClick = (field) => {
        const fieldType = field.type?.toLowerCase() || 'signature';

        if (fieldValues[field.fieldId]) {
            updateFieldValue(field.fieldId, null);
            setActiveField(null);
            return;
        }

        switch (fieldType) {
            case 'signature':
            case 'initial':
                const sigVal = savedSignature?.imageUrl || savedSignature?.imageBase64;
                if (sigVal) {
                    const sigData = (sigVal.startsWith('http') || sigVal.startsWith('data:'))
                        ? sigVal
                        : `data:image/png;base64,${sigVal}`;
                    updateFieldValue(field.fieldId, sigData);
                } else {
                    alert('Bạn chưa cấu hình chữ ký. Vui lòng tạo chữ ký trước khi ký tài liệu.');
                }
                break;
            case 'name':
                updateFieldValue(field.fieldId, fullName || 'Nhập họ tên...');
                break;
            case 'date':
                updateFieldValue(field.fieldId, new Date().toLocaleDateString('vi-VN'));
                break;
            case 'checkbox':
                updateFieldValue(field.fieldId, 'checked');
                break;
            case 'text':
            case 'email':
            case 'number':
                setInputModal({ isOpen: true, field: field, value: '' });
                break;
            default:
                setInputModal({ isOpen: true, field: field, value: '' });
                break;
        }
    };

    const renderFieldOverlay = (field) => {
        const isFilled = !!fieldValues[field.fieldId];
        const colors = isFilled ? FIELD_COLORS.signed : FIELD_COLORS.unsigned;
        const fieldType = field.type?.toLowerCase() || 'signature';
        const Icon = FIELD_ICONS[fieldType] || PenTool;

        return (
            <motion.div
                initial={false}
                animate={isFilled ? { scale: [1, 1.05, 1] } : {}}
                key={field.fieldId}
                onClick={() => handleFieldClick(field)}
                className={`absolute cursor-pointer border-2 backdrop-blur-sm ${colors.border} ${colors.bg} ${colors.hover} rounded-lg transition-all duration-300 flex items-center justify-center z-10 
                    ${!isFilled ? 'animate-pulse-slow shadow-lg shadow-emerald-500/10' : 'shadow-md shadow-primary-500/5'}
                    ${activeField === field.fieldId ? `ring-4 ${colors.ring} ring-offset-2` : ''}
                `}
                style={{
                    left: `${field.x}%`,
                    top: `${field.y}%`,
                    width: `${field.width}%`,
                    height: `${field.height}%`,
                }}
                title={isFilled ? 'Nhấn để xóa' : `Nhấn để ${fieldType === 'signature' ? 'ký' : 'điền'}`}
            >
                {isFilled ? (
                    fieldType === 'signature' || fieldType === 'initial' ? (
                        (fieldValues[field.fieldId]?.startsWith('data:') || fieldValues[field.fieldId]?.startsWith('http')) ? (
                            <img
                                src={fieldValues[field.fieldId]}
                                alt="signature"
                                className="w-full h-full object-contain p-1"
                            />
                        ) : (
                            <span className={`text-sm font-bold ${colors.text} truncate px-2 font-display`}>
                                {fieldValues[field.fieldId]}
                            </span>
                        )
                    ) : fieldType === 'checkbox' ? (
                        <CheckSquare className={`w-6 h-6 ${colors.text} fill-white`} />
                    ) : (
                        <span className={`text-sm font-bold ${colors.text} truncate px-2 font-display`}>
                            {fieldValues[field.fieldId]}
                        </span>
                    )
                ) : (
                    <div className={`flex items-center gap-2 ${colors.text}`}>
                        <Icon className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.15em] hidden md:block">
                            {fieldType === 'signature' ? 'KÝ TẠI ĐÂY' : fieldType === 'name' ? 'HỌ TÊN' : fieldType === 'date' ? 'NGÀY KÝ' : fieldType.toUpperCase()}
                        </span>
                    </div>
                )}
            </motion.div>
        );
    };

    if (!pdfUrl) {
        return (
            <div className="flex justify-center p-12">
                <div className="flex items-center justify-center w-full max-w-[900px] min-h-[600px] bg-white rounded-[40px] border border-secondary-100 shadow-premium">
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
                        </div>
                        <p className="text-sm font-bold text-secondary-400 uppercase tracking-widest">Đang tải tài liệu...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center p-6 md:p-12 gap-8 w-full">
            <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                    <div className="flex flex-col items-center gap-6">
                        {Array.from({ length: 3 }, (_, i) => (
                            <div key={i} className="w-[800px] h-[1100px] bg-white rounded-[32px] shadow-premium animate-pulse flex items-center justify-center">
                                <FileText className="w-12 h-12 text-secondary-100" />
                            </div>
                        ))}
                    </div>
                }
            >
                {numPages && Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => {
                    const pageFields = fields.filter(f => f.page === pageNum);

                    return (
                        <div key={pageNum} className="relative shadow-premium border border-secondary-100 bg-white rounded-[32px] mb-10 flex justify-center w-full max-w-full overflow-hidden group">
                            <div className="inline-block relative max-w-full">
                                <Page
                                    pageNumber={pageNum}
                                    width={800}
                                    renderAnnotationLayer={false}
                                    renderTextLayer={false}
                                    className="bg-white block"
                                />
                                {/* Signature field overlays exactly positioned with % */}
                                {pageFields.map(field =>
                                    renderFieldOverlay(field)
                                )}
                            </div>
                            <div className="absolute top-6 left-6 w-10 h-10 bg-white/80 backdrop-blur-md rounded-xl shadow-md border border-secondary-100 flex items-center justify-center text-[10px] font-bold text-secondary-400 uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                                {pageNum}
                            </div>
                        </div>
                    );
                })}
            </Document>

            <AnimatePresence>
                {inputModal.isOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setInputModal({ isOpen: false, field: null, value: '' })}
                            className="absolute inset-0 bg-secondary-900/40 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative bg-white rounded-[32px] shadow-2xl p-10 w-full max-w-md border border-secondary-100"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 shadow-sm">
                                        <Type className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-secondary-900 font-display">Nhập thông tin</h3>
                                        <p className="text-xs font-medium text-secondary-400 uppercase tracking-widest mt-1">
                                            {inputModal.field?.type?.toLowerCase() || 'text'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setInputModal({ isOpen: false, field: null, value: '' })}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-secondary-50 text-secondary-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-2 mb-10">
                                <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-[0.2em] px-1">Nội dung hiển thị</label>
                                <input
                                    type={inputModal.field?.type?.toLowerCase() === 'number' ? 'number' : 
                                          inputModal.field?.type?.toLowerCase() === 'email' ? 'email' : 'text'}
                                    value={inputModal.value}
                                    onChange={(e) => setInputModal({ ...inputModal, value: e.target.value })}
                                    className="w-full px-6 py-5 bg-secondary-50 border border-secondary-100 rounded-2xl text-secondary-900 font-medium focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all placeholder:text-secondary-300"
                                    placeholder="Nhập nội dung vào đây..."
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && inputModal.value.trim()) {
                                            updateFieldValue(inputModal.field.fieldId, inputModal.value.trim());
                                            setInputModal({ isOpen: false, field: null, value: '' });
                                        }
                                    }}
                                />
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setInputModal({ isOpen: false, field: null, value: '' })}
                                    className="flex-1 py-4 bg-secondary-50 text-secondary-600 font-bold rounded-2xl hover:bg-secondary-100 transition-all uppercase tracking-widest text-[10px]"
                                >
                                    Hủy bỏ
                                </button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => {
                                        if (inputModal.value.trim()) {
                                            updateFieldValue(inputModal.field.fieldId, inputModal.value.trim());
                                            setInputModal({ isOpen: false, field: null, value: '' });
                                        }
                                    }}
                                    disabled={!inputModal.value.trim()}
                                    className="flex-1 py-4 premium-gradient text-white font-bold rounded-2xl shadow-xl shadow-primary-500/30 hover:shadow-primary-500/40 disabled:opacity-50 transition-all uppercase tracking-widest text-[10px]"
                                >
                                    Xác nhận
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                @keyframes pulse-slow {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.8; transform: scale(0.98); }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 3s ease-in-out infinite;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
            `}</style>
        </div>
    );
};

export default SignContent;
