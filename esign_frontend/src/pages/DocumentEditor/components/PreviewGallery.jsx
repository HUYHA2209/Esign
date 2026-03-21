import React, { useState } from 'react';
import { Document, Page } from 'react-pdf';
import { Check } from 'lucide-react';

const PreviewGallery = ({ uploadedFiles, fields, previewFileIndex, setPreviewFileIndex }) => {
    const [previewNumPages, setPreviewNumPages] = useState(0);

    if (!uploadedFiles || uploadedFiles.length === 0) return null;

    const onLoadSuccess = ({ numPages }) => setPreviewNumPages(numPages);

    return (
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
                    onLoadSuccess={onLoadSuccess}
                >
                    <div className="flex gap-4 overflow-x-auto pb-6">
                        {Array.from(new Array(previewNumPages), (el, index) => (
                            <div key={`preview_page_${previewFileIndex}_${index + 1}`} className="inline-block relative bg-white p-3 rounded shadow-lg">
                                <Page
                                    pageNumber={index + 1}
                                    width={600}
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                    style={{ pointerEvents: 'none' }}
                                />
                                {/* Render preview-only fields for this file/page */}
                                {fields.filter(f => f.fileIndex === previewFileIndex && f.page === index + 1).map(f => (
                                    <div key={f.id} style={{ position: 'absolute', left: `${f.x}%`, top: `${f.y}%`, width: `${f.width}%`, height: `${f.height}%`, pointerEvents: 'none' }} className="border-2 border-dashed border-indigo-300 bg-indigo-50/50 rounded">
                                        <div className="text-xs text-indigo-700 p-1">{f.type}{f.recipientIndex ? ` #${f.recipientIndex}` : ''}</div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </Document>
            )}
        </div>
    );
};

export default PreviewGallery;
