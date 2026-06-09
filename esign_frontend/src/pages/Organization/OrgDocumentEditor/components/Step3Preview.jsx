import React from 'react';
import { Send } from 'lucide-react';
import { Document, Page } from 'react-pdf';

const Step3Preview = ({
    uploadedFiles,
    previewFileIndex,
    setPreviewFileIndex,
    previewNumPages,
    onPreviewDocumentLoadSuccess,
    fields,
    recipients,
    isStep1Complete,
    isStep2Complete,
    isSending,
    handleSendDocument,
    goToStep,
    isStepAnimating,
}) => {
    return (
        <div className={`p-8 max-w-5xl mx-auto transition-all duration-300 ease-out ${isStepAnimating ? 'opacity-0 translate-x-2' : 'opacity-100 translate-x-0'}`}>
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-900">Xem trước tài liệu</h2>
                        <p className="text-sm text-slate-500 mt-1">Kiểm tra lại trước khi gửi</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span>{uploadedFiles.length} tài liệu</span>
                        <span>•</span>
                        <span>{recipients.filter(r => r.email).length} người nhận</span>
                    </div>
                </div>

                {/* PDF Preview */}
                <div className="p-6 bg-slate-50">
                    <div className="w-full max-w-5xl mx-auto">
                        {/* File selector for preview */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex gap-2 overflow-x-auto">
                                {uploadedFiles.map((f, idx) => (
                                    <button
                                        key={f.id}
                                        onClick={() => setPreviewFileIndex(idx)}
                                        className={`px-3 py-1 rounded-md text-sm ${previewFileIndex === idx ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                                        {f.name}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <button disabled={previewFileIndex === 0} onClick={() => setPreviewFileIndex(i => Math.max(0, i - 1))} className="px-3 py-1 bg-slate-100 rounded">Prev</button>
                                <button disabled={previewFileIndex === uploadedFiles.length - 1} onClick={() => setPreviewFileIndex(i => Math.min(uploadedFiles.length - 1, i + 1))} className="px-3 py-1 bg-slate-100 rounded">Next</button>
                            </div>
                        </div>

                        {uploadedFiles[previewFileIndex] && (
                            <Document
                                file={uploadedFiles[previewFileIndex].file}
                                onLoadSuccess={onPreviewDocumentLoadSuccess}
                                className=""
                            >
                                <div className="flex flex-col gap-6 overflow-y-auto pb-6 items-center">
                                    {Array.from(new Array(previewNumPages), (el, index) => (
                                        <div key={`preview_page_${previewFileIndex}_${index + 1}`} className="bg-white p-3 rounded shadow-lg w-full flex justify-center">
                                            <div className="inline-block relative">
                                                <Page
                                                    pageNumber={index + 1}
                                                    width={600}
                                                    renderTextLayer={false}
                                                    renderAnnotationLayer={false}
                                                    style={{ pointerEvents: 'none' }}
                                                />
                                                {/* Render preview-only fields */}
                                                {fields.filter(f => f.fileIndex === previewFileIndex && f.page === index + 1).map(f => (
                                                    <div key={f.id} style={{ position: 'absolute', left: `${f.x}%`, top: `${f.y}%`, width: `${f.width}%`, height: `${f.height}%`, pointerEvents: 'none' }} className="border-2 border-dashed border-indigo-300 bg-indigo-50/50 rounded">
                                                        <div className="text-xs text-indigo-700 p-1">{f.type}{f.recipientIndex ? ` #${f.recipientIndex}` : ''}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Document>
                        )}
                    </div>
                </div>

                {/* Recipients Summary */}
                <div className="p-6 border-t border-slate-100">
                    <div className="flex flex-wrap gap-3">
                        {recipients.filter(r => r.email).map((r, idx) => (
                            <div key={r.id} className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg">
                                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-sm font-bold">
                                    {idx + 1}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-900">{r.name || 'Chưa có tên'}</p>
                                    <p className="text-xs text-slate-500">{r.email}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between">
                    <button
                        onClick={() => goToStep(2)}
                        className="px-6 py-3 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-white transition-colors"
                    >
                        Quay lại chỉnh sửa
                    </button>
                    <button
                        disabled={!isStep1Complete || !isStep2Complete || isSending}
                        onClick={handleSendDocument}
                        className={`px-8 py-3 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors shadow-lg ${(!isStep1Complete || !isStep2Complete || isSending)
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-transparent'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/25'
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
            </section>
        </div>
    );
};

export default Step3Preview;
