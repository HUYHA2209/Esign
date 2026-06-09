import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';

const CancelModal = ({ isOpen, onClose, onConfirm, isSubmitting }) => {
    const [reason, setReason] = useState('');

    // Reset reason khi modal mở lại
    useEffect(() => {
        if (isOpen) setReason('');
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm(reason);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-50 text-red-500">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800">Hủy tài liệu</h3>
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
                        Bạn đang hủy yêu cầu ký nhóm tài liệu này. Quá trình ký sẽ bị dừng lại vĩnh viễn và các bên liên quan sẽ nhận được thông báo.
                        <br/><br/>
                        Vui lòng nhập lý do hủy (không bắt buộc):
                    </p>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Nhập lý do hủy tài liệu..."
                        className="w-full h-32 p-3 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
                        disabled={isSubmitting}
                    />
                </div>
                
                <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100 bg-slate-50">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
                    >
                        Đóng
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isSubmitting}
                        className="px-5 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 active:bg-red-700 rounded-xl transition-colors shadow-sm shadow-red-500/20 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                Đang xử lý...
                            </>
                        ) : 'Xác nhận hủy'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CancelModal;
