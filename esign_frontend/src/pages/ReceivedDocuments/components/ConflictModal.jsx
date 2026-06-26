import React from 'react';
import { X, RefreshCw } from 'lucide-react';

const ConflictModal = ({ isOpen, onClose, onConfirm, isSubmitting }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-blue-500">
                            <RefreshCw className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800">Cập nhật phiên bản</h3>
                    </div>
                    <button 
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-5 space-y-4">
                    <p className="text-sm text-slate-600">
                        Tài liệu này vừa được ký bởi một người khác. Phiên bản bạn đang chuẩn bị ký không còn là phiên bản mới nhất.
                        <br/><br/>
                        Đừng lo, bạn không cần điền lại thông tin! Vui lòng bấm xác nhận để hệ thống tự động áp dụng chữ ký của bạn lên phiên bản tài liệu mới nhất nhé.
                    </p>
                </div>
                
                <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100 bg-slate-50">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isSubmitting}
                        className="px-5 py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 active:bg-blue-700 rounded-xl transition-colors shadow-sm shadow-blue-500/20 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                Đang xử lý...
                            </>
                        ) : 'Ký lại trên bản mới'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConflictModal;
