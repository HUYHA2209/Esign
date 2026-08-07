import React, { useState } from 'react';
import { X, Building2, Globe, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AddOrganizationModal = ({ isOpen, onClose, onSubmit, isLoading = false }) => {
    const [orgName, setOrgName] = useState('');
    const [orgUrl, setOrgUrl] = useState('');
    const [accountType, setAccountType] = useState('ORGANIZATION');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (orgName.trim() && orgUrl.trim() && !isLoading) {
            onSubmit({ name: orgName, url: orgUrl, type: 'ORGANIZATION' });
            // Reset fields on success
            setOrgName('');
            setOrgUrl('');
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-secondary-950/40 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 15 }}
                        transition={{ type: "spring", duration: 0.4 }}
                        className="relative bg-white rounded-[32px] shadow-premium border border-secondary-100 w-full max-w-md overflow-hidden z-10"
                    >
                        {/* Header */}
                        <div className="px-8 pt-8 pb-4 flex items-center justify-between border-b border-secondary-50">
                            <div>
                                <h3 className="text-xl font-bold text-secondary-900 font-display">Tạo không gian mới</h3>
                                <p className="text-xs text-secondary-400 font-medium mt-0.5">Xây dựng không gian làm việc số cho bạn hoặc doanh nghiệp</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-secondary-400 hover:text-secondary-600 hover:bg-secondary-50 rounded-xl p-2 transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            {/* Removed Account Type Selection */}

                            {/* Org Name */}
                            <div className="space-y-2">
                                <label htmlFor="orgName" className="text-[10px] font-bold text-secondary-400 uppercase tracking-[0.2em] px-1">
                                    Tên tổ chức
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-secondary-400 group-focus-within:text-primary-500 transition-colors">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <input
                                        id="orgName"
                                        type="text"
                                        autoFocus
                                        value={orgName}
                                        onChange={(e) => setOrgName(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 bg-secondary-50 border border-secondary-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all duration-300 font-medium text-sm text-secondary-800 placeholder-secondary-400"
                                        placeholder="Ví dụ: Công ty TNHH E-Sign"
                                    />
                                </div>
                            </div>

                            {/* Org URL */}
                            <div className="space-y-2">
                                <label htmlFor="orgUrl" className="text-[10px] font-bold text-secondary-400 uppercase tracking-[0.2em] px-1 block">
                                    Đường dẫn URL
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-secondary-400 group-focus-within:text-primary-500 transition-colors">
                                        <Globe className="w-5 h-5" />
                                    </div>
                                    <input
                                        id="orgUrl"
                                        type="text"
                                        value={orgUrl}
                                        onChange={(e) => setOrgUrl(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 bg-secondary-50 border border-secondary-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all duration-300 font-medium text-sm text-secondary-800 placeholder-secondary-400"
                                        placeholder="ví-du: my-workspace"
                                    />
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-secondary-50">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-5 py-3 text-sm font-bold text-secondary-500 hover:text-secondary-800 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={!orgName.trim() || !orgUrl.trim() || isLoading}
                                    className="px-6 py-3.5 text-sm font-bold text-white premium-gradient rounded-2xl shadow-lg shadow-primary-500/25 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                                >
                                    {isLoading && (
                                        <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                        </svg>
                                    )}
                                    {isLoading ? 'Đang tạo...' : 'Tạo không gian'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AddOrganizationModal;
