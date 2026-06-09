import React from 'react';

const FileSelector = ({ uploadedFiles, currentIndex, setCurrentIndex }) => {
    if (!uploadedFiles || uploadedFiles.length === 0) return null;

    return (
        <div className="flex items-center justify-between mb-3">
            <div className="flex gap-2 overflow-x-auto">
                {uploadedFiles.map((f, idx) => (
                    <button
                        key={f.id}
                        onClick={() => setCurrentIndex(idx)}
                        className={`px-3 py-1 rounded-md text-sm ${currentIndex === idx ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                        {f.name}
                    </button>
                ))}
            </div>
            <div className="flex items-center gap-2">
                <button disabled={currentIndex === 0} onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} className="px-3 py-1 bg-slate-100 rounded">Prev</button>
                <button disabled={currentIndex === uploadedFiles.length - 1} onClick={() => setCurrentIndex(i => Math.min(uploadedFiles.length - 1, i + 1))} className="px-3 py-1 bg-slate-100 rounded">Next</button>
            </div>
        </div>
    );
};

export default FileSelector;
