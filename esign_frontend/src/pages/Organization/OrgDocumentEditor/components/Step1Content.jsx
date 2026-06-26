import React from 'react';
import {
    FileText, Plus, X, Check, GripVertical, Mail, User,
    Trash2, FileUp, ChevronRight, CalendarClock
} from 'lucide-react';
import { formatFileSize } from '../constants';

const Step1Content = ({
    // File handling
    uploadedFiles,
    isFileDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileInput,
    removeFile,
    // Recipients
    recipients,
    orgSigners,
    addRecipient,
    handleEmailSearch,
    handleSelectUser,
    removeRecipient,
    enableSigningOrder,
    setEnableSigningOrder,
    expiresAt,
    setExpiresAt,
    // Navigation
    isStep1Complete,
    canProceed,
    goToStep,
    isStepAnimating,
}) => {
    // Logic for ExpiresAt
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const minDateTime = now.toISOString().slice(0, 16);
    const isExpired = expiresAt && new Date(expiresAt) <= new Date();

    return (
        <div className={`p-8 max-w-4xl mx-auto space-y-8 transition-all duration-300 ease-out ${isStepAnimating ? 'opacity-0 translate-x-2' : 'opacity-100 translate-x-0'}`}>
            {/* Documents Section */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                    <h2 className="text-xl font-semibold text-slate-900">Tài liệu</h2>
                    <p className="text-sm text-slate-500 mt-1">Thêm và cấu hình tài liệu</p>
                </div>
                <div className="p-6">
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${isFileDragging
                            ? 'border-indigo-400 bg-indigo-50'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                    >
                        <div className="flex justify-center mb-4">
                            <div className="flex -space-x-4">
                                <div className="w-14 h-18 bg-slate-100 rounded-lg border-2 border-white shadow flex items-center justify-center">
                                    <FileText className="w-7 h-7 text-slate-400" />
                                </div>
                                <div className="w-14 h-18 bg-indigo-100 rounded-lg border-2 border-white shadow flex items-center justify-center">
                                    <Plus className="w-7 h-7 text-indigo-500" />
                                </div>
                                <div className="w-14 h-18 bg-slate-100 rounded-lg border-2 border-white shadow flex items-center justify-center">
                                    <FileText className="w-7 h-7 text-slate-400" />
                                </div>
                            </div>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Thêm tài liệu</h3>
                        <p className="text-sm text-slate-500 mb-4">Kéo và thả tệp PDF vào đây</p>
                        <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors cursor-pointer font-medium text-sm">
                            <FileUp className="w-4 h-4" />
                            Chọn tệp
                            <input
                                type="file"
                                accept=".pdf"
                                multiple
                                onChange={handleFileInput}
                                className="hidden"
                            />
                        </label>
                    </div>

                    {uploadedFiles.length > 0 && (
                        <div className="mt-6 space-y-3">
                            {uploadedFiles.map((file) => (
                                <div
                                    key={file.id}
                                    className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl group"
                                >
                                    <div className="text-slate-400 cursor-grab">
                                        <GripVertical className="w-5 h-5" />
                                    </div>
                                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                        <FileText className="w-5 h-5 text-red-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                                        <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                                    </div>
                                    <button
                                        onClick={() => removeFile(file.id)}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Recipients Section */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm relative">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between rounded-t-2xl">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-900">Người nhận</h2>
                        <p className="text-sm text-slate-500 mt-1">Thêm người nhận vào tài liệu</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={addRecipient}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Thêm người ký
                        </button>
                    </div>
                </div>
                <div className="p-6">
                    {/* ─── Thời hạn ký & Thứ tự ký ─── */}
                    <div className="flex flex-col sm:flex-row sm:items-start gap-6 mb-6 pb-6 border-b border-slate-100">
                        {/* Thời hạn ký (bắt buộc) */}
                        <div className="flex-1">
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                                <CalendarClock className="w-4 h-4 text-indigo-500" />
                                Thời hạn ký
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="datetime-local"
                                step="1"
                                min={minDateTime}
                                value={expiresAt || ''}
                                onChange={(e) => setExpiresAt(e.target.value)}
                                className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                                    !expiresAt
                                        ? 'border-amber-300 bg-amber-50/50'
                                        : isExpired
                                            ? 'border-red-400 bg-red-50'
                                            : 'border-green-400 bg-green-50/50'
                                }`}
                            />
                            {!expiresAt && (
                                <p className="mt-1.5 text-xs text-amber-600">
                                    Bắt buộc — Vui lòng chọn thời hạn ký cho tài liệu
                                </p>
                            )}
                            {isExpired && (
                                <p className="mt-1.5 text-xs text-red-600">
                                    Thời hạn đã qua, vui lòng chọn thời điểm trong tương lai
                                </p>
                            )}
                            {expiresAt && !isExpired && (
                                <p className="mt-1.5 text-xs text-green-600">
                                    Tài liệu sẽ tự động hết hạn vào thời điểm đã chọn
                                </p>
                            )}
                        </div>

                        {/* Toggle thứ tự ký */}
                        <div className="flex-shrink-0 pt-7">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={enableSigningOrder}
                                        onChange={(e) => setEnableSigningOrder(e.target.checked)}
                                        className="sr-only"
                                    />
                                    <div className={`w-10 h-6 rounded-full transition-colors ${enableSigningOrder ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                                        <div className={`w-4 h-4 rounded-full bg-white shadow absolute top-1 transition-transform ${enableSigningOrder ? 'translate-x-5' : 'translate-x-1'}`} />
                                    </div>
                                </div>
                                <span className="text-sm text-slate-700">Bật thứ tự ký</span>
                            </label>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
                            <div className="col-span-6 flex items-center gap-2">
                                {enableSigningOrder && <span className="w-6 text-center">#</span>}
                                <span>Email</span>
                            </div>
                            <div className="col-span-4">Tên</div>
                            <div className="col-span-2"></div>
                        </div>

                        {recipients.map((recipient, index) => (
                            <div key={recipient.id} className={`grid grid-cols-12 gap-4 items-center relative ${recipient.isSearching ? 'z-20' : 'z-10'}`}>
                                <div className="col-span-6 flex items-center gap-2">
                                    {enableSigningOrder && (
                                        <div className="w-6 h-6 flex-shrink-0 bg-indigo-100 text-indigo-700 font-bold text-xs rounded-full flex items-center justify-center shadow-sm">
                                            {index + 1}
                                        </div>
                                    )}
                                    <div className="relative flex-1">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="email"
                                            placeholder="Nhập phần email để tìm..."
                                            value={recipient.email}
                                            onChange={(e) => handleEmailSearch(recipient.id, e.target.value)}
                                            className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${recipient.userId ? 'border-green-400 bg-green-50' : 'border-slate-200'}`}
                                        />
                                        {recipient.userId && (
                                            <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
                                        )}
                                        {recipient.isSearching && recipient.searchResults && recipient.searchResults.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-72 overflow-y-auto divide-y divide-slate-100">
                                                {recipient.searchResults.flatMap((user) => {
                                                    const items = [];
                                                    if (user.workspaces && user.workspaces.length > 0) {
                                                        user.workspaces.forEach((ws) => {
                                                            const isPersonal = ws.accountType === 'PERSONAL';
                                                            items.push(
                                                                <button
                                                                    key={`${user.id || user.email}-${ws.accountId}`}
                                                                    onClick={() => handleSelectUser(recipient.id, { 
                                                                        ...user, 
                                                                        selectedContextName: isPersonal
                                                                            ? `${user.name || user.fullName || 'Chưa cập nhật tên'} (Personal)`
                                                                            : `${user.name || user.fullName || 'Chưa cập nhật tên'} (${ws.accountName})`,
                                                                        accountId: ws.accountId
                                                                    })}
                                                                    className={`w-full text-left px-4 py-3 transition-colors duration-150 ${
                                                                        isPersonal ? 'hover:bg-slate-50' : 'hover:bg-indigo-50/30'
                                                                    }`}
                                                                >
                                                                    <div className="flex flex-col gap-1">
                                                                        <div className="flex items-center justify-between gap-2">
                                                                            <span className="text-sm font-semibold text-slate-800">{user.name || user.fullName || 'Chưa cập nhật tên'}</span>
                                                                            <span className={`px-2 py-0.5 text-[10px] font-medium rounded-md flex-shrink-0 border ${
                                                                                isPersonal 
                                                                                    ? 'bg-slate-100 text-slate-600 border-slate-200' 
                                                                                    : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                                                                            }`}>
                                                                                {isPersonal ? 'Cá nhân' : 'Tổ chức'}
                                                                            </span>
                                                                        </div>
                                                                        <span className="text-xs text-slate-500 break-all">{user.email}</span>
                                                                        {!isPersonal && (
                                                                            <span className="text-xs text-indigo-600 font-medium bg-indigo-50/55 px-2 py-0.5 rounded border border-indigo-100/50 self-start mt-0.5">
                                                                                {ws.accountName}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </button>
                                                            );
                                                        });
                                                    } else {
                                                        items.push(
                                                            <button
                                                                key={`${user.id || user.email}-personal`}
                                                                onClick={() => handleSelectUser(recipient.id, { ...user, selectedContextName: `${user.name || user.fullName || 'Chưa cập nhật tên'} (Personal)` })}
                                                                className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors duration-150"
                                                            >
                                                                <div className="flex flex-col gap-1">
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <span className="text-sm font-semibold text-slate-800">{user.name || user.fullName || 'Chưa cập nhật tên'}</span>
                                                                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-100 text-slate-600 border border-slate-200 flex-shrink-0">Cá nhân</span>
                                                                    </div>
                                                                    <span className="text-xs text-slate-500 break-all">{user.email}</span>
                                                                </div>
                                                            </button>
                                                        );
                                                    }
                                                    return items;
                                                })}
                                            </div>
                                        )}
                                        {recipient.isSearching && recipient.email.length >= 2 && recipient.searchResults && recipient.searchResults.length === 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-4 text-center text-sm text-slate-500">
                                                Không tìm thấy tài khoản nào với email này.
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="col-span-4">
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder={`Tên (Hệ thống tự điền)`}
                                            value={recipient.name}
                                            readOnly
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-500 focus:outline-none cursor-not-allowed"
                                        />
                                    </div>
                                </div>
                                <div className="col-span-2 flex items-center justify-end gap-2">
                                    <button
                                        onClick={() => removeRecipient(recipient.id)}
                                        disabled={recipients.length === 1}
                                        className={`p-2 rounded-lg transition-colors ${recipients.length === 1
                                            ? 'text-slate-300 cursor-not-allowed'
                                            : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                                            }`}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end rounded-b-2xl">
                    <button
                        onClick={() => goToStep(2)}
                        disabled={!isStep1Complete}
                        className={`px-6 py-3 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${canProceed
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                    >
                        Thêm trường ký
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </section>
        </div>
    );
};

export default Step1Content;
