import React from 'react';
import {
    ArrowLeft, Send, Settings, Paperclip, FileSignature
} from 'lucide-react';

const EditorHeader = ({
    documentName,
    isEditingName,
    setIsEditingName,
    setDocumentName,
    handleBackNavigation,
    handleSendDocument,
    canProceed,
    isSending,
}) => {
    return (
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-50 shadow-sm">
            <div className="flex items-center gap-4">
                <button
                    onClick={handleBackNavigation}
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <FileSignature className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-slate-900">DigiSign</span>
                </div>

                <div className="h-8 w-px bg-slate-200 mx-2" />

                {isEditingName ? (
                    <input
                        type="text"
                        value={documentName}
                        onChange={(e) => setDocumentName(e.target.value)}
                        onBlur={() => setIsEditingName(false)}
                        onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                        className="text-lg font-medium text-slate-900 bg-transparent border-b-2 border-indigo-500 focus:outline-none px-1"
                        autoFocus
                    />
                ) : (
                    <h1
                        onClick={() => setIsEditingName(true)}
                        className="text-lg font-medium text-slate-700 cursor-pointer hover:text-indigo-600 transition-colors"
                    >
                        {documentName}
                    </h1>
                )}

                <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full border border-slate-200">
                    Bản nháp
                </span>
            </div>

            <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors">
                    <Paperclip className="w-4 h-4" />
                    Tệp đính kèm
                </button>
                <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    <Settings className="w-5 h-5" />
                </button>
                <button
                    disabled={!canProceed || isSending}
                    onClick={handleSendDocument}
                    className={`px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${(!canProceed || isSending)
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/25'
                        }`}
                >
                    {isSending ? (
                        <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                        <Send className="w-4 h-4" />
                    )}
                    {isSending ? 'Đang gửi...' : 'Gửi tài liệu'}
                </button>
            </div>
        </header>
    );
};

export default EditorHeader;
