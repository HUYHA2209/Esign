import React, { useState } from 'react';
import { X } from 'lucide-react';

const AddOrganizationModal = ({ isOpen, onClose, onSubmit, isLoading = false }) => {
    const [orgName, setOrgName] = useState('');
    const [orgUrl, setOrgUrl] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (orgName.trim() && orgUrl.trim() && !isLoading) {
            onSubmit({ name: orgName, url: orgUrl });
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop with blur */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 opacity-100">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-900">Thêm tổ chức mới</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full p-1 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="mb-4">
                        <label htmlFor="orgName" className="block text-sm font-medium text-gray-700 mb-2">
                            Tên tổ chức
                        </label>
                        <input
                            id="orgName"
                            type="text"
                            autoFocus
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="Nhập tên tổ chức..."
                        />
                    </div>

                    <div className="mb-4">
                        <label htmlFor="orgUrl" className="block text-sm font-medium text-gray-700 mb-2">
                            Đường dẫn URL
                        </label>
                        <input
                            id="orgUrl"
                            type="text"
                            value={orgUrl}
                            onChange={(e) => setOrgUrl(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="Nhập đường dẫn URL (ví dụ: my-company)"
                        />
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={!orgName.trim() || !orgUrl.trim() || isLoading}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center gap-2"
                        >
                            {isLoading && (
                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                            )}
                            {isLoading ? 'Đang tạo...' : 'Thêm tổ chức'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddOrganizationModal;
