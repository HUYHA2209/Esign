import React from 'react';
import { ArrowLeft, CloudDownload, Ban, FileText, PenTool, CheckCircle2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const SignSidebar = ({
    fieldsRemaining, totalFields, progress,
    fullName, setFullName,
    savedSignature,
    onComplete, onReject, onDownload, isSigning, canComplete,
    documents, activeDocIndex, setActiveDocIndex,
    pdfUrls
}) => {
    const navigate = useNavigate();

    const signatureImgSrc = savedSignature?.imageUrl || null;

    return (
        <aside className="hidden lg:flex w-[340px] flex-shrink-0 flex-col bg-white border-r border-secondary-100 overflow-y-auto z-10 shadow-xl shadow-secondary-900/5">
            <div className="p-6 space-y-8">
                {/* Progress Section */}
                <div className="bg-secondary-50 rounded-[32px] p-6 border border-secondary-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-secondary-900 uppercase tracking-widest font-display">Tiến trình</h3>
                        <span className="text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded-lg border border-primary-100">
                            {progress.toFixed(0)}%
                        </span>
                    </div>
                    
                    <div className="relative h-2 rounded-full bg-white border border-secondary-100 overflow-hidden shadow-inner">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="absolute inset-y-0 left-0 premium-gradient rounded-full shadow-lg shadow-primary-500/20"
                        />
                    </div>
                    
                    <p className="mt-4 text-[10px] font-bold text-secondary-400 uppercase tracking-widest text-center">
                        {fieldsRemaining > 0 ? (
                            <span>Còn <span className="text-primary-600">{fieldsRemaining}</span> trường cần hoàn thiện</span>
                        ) : (
                            <span className="text-emerald-600 flex items-center justify-center gap-2">
                                <CheckCircle2 className="w-3 h-3" /> Sẵn sàng để ký
                            </span>
                        )}
                    </p>
                </div>

                {/* Identity Section */}
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest px-1">Xác nhận họ tên</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            placeholder="Họ và tên của bạn..."
                            className="w-full bg-secondary-50 border border-secondary-100 rounded-2xl px-4 py-3 text-sm text-secondary-900 font-medium focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all placeholder:text-secondary-300"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest px-1">Chữ ký của bạn</label>
                        {signatureImgSrc ? (
                            <div className="group relative aspect-[2/1] w-full rounded-2xl border border-secondary-100 bg-secondary-50 mt-2 overflow-hidden hover:border-primary-200 transition-colors shadow-inner">
                                <img
                                    src={signatureImgSrc}
                                    alt="Your signature"
                                    className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                    <button onClick={() => navigate('/signature')} className="px-4 py-2 bg-white text-primary-600 text-[10px] font-bold uppercase tracking-widest rounded-xl shadow-lg border border-primary-100">Thay đổi</button>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-2 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/50 p-6 text-center space-y-3">
                                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-500 mx-auto shadow-sm">
                                    <PenTool className="w-5 h-5" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Chưa có chữ ký</p>
                                    <p className="text-[10px] text-amber-600 font-medium leading-relaxed">Vui lòng tạo chữ ký để tiếp tục</p>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => navigate('/signature')}
                                    className="w-full py-2.5 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-amber-500/20"
                                >
                                    Tạo ngay
                                </motion.button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Document List */}
                {documents.length > 1 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h4 className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest">Danh sách tài liệu</h4>
                            <span className="text-[10px] font-bold text-secondary-400">{documents.length} tập tin</span>
                        </div>
                        <div className="space-y-2 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                            {documents.map((doc, index) => (
                                <button
                                    key={doc.documentId}
                                    onClick={() => setActiveDocIndex(index)}
                                    className={`w-full group flex items-center gap-3 p-3 rounded-2xl text-left transition-all border ${
                                        activeDocIndex === index
                                        ? 'bg-primary-50 border-primary-200 shadow-sm'
                                        : 'bg-white border-secondary-50 hover:border-secondary-200 hover:bg-secondary-50'
                                    }`}
                                >
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                                        activeDocIndex === index ? 'bg-primary-600 text-white shadow-lg' : 'bg-secondary-50 text-secondary-400 group-hover:bg-white'
                                    }`}>
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-bold truncate ${activeDocIndex === index ? 'text-primary-700' : 'text-secondary-600'}`}>
                                            {doc.fileName || `Tài liệu ${index + 1}`}
                                        </p>
                                    </div>
                                    {activeDocIndex === index && <ChevronRight className="w-3 h-3 text-primary-400" />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="pt-4 space-y-3">
                    <h4 className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest px-1">Tiện ích</h4>
                    <button onClick={onDownload} className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-secondary-100 rounded-2xl text-secondary-600 hover:text-primary-600 hover:bg-primary-50 hover:border-primary-100 transition-all group">
                        <CloudDownload className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold uppercase tracking-widest">Tải xuống PDF</span>
                    </button>
                    <button 
                        onClick={onReject}
                        disabled={isSigning}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-red-100 rounded-2xl text-red-500 hover:bg-red-50 transition-all group disabled:opacity-50"
                    >
                        <Ban className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                        <span className="text-xs font-bold uppercase tracking-widest">Từ chối ký</span>
                    </button>
                </div>
            </div>

            {/* Back Button */}
            <div className="mt-auto p-6 border-t border-secondary-50">
                <motion.button
                    whileHover={{ x: -4 }}
                    onClick={() => navigate('/documents')}
                    className="w-full flex items-center justify-center gap-2 py-3 text-secondary-400 hover:text-secondary-600 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">Quay lại danh sách</span>
                </motion.button>
            </div>
        </aside>
    );
};

export default SignSidebar;
