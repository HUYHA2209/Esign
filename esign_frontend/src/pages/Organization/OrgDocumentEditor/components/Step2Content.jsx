import React from 'react';
import { DndContext, DragOverlay, pointerWithin } from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import { Document, Page } from 'react-pdf';
import { ChevronDown } from 'lucide-react';
import { DraggableSidebarItem, PDFPageDroppable, DraggableFieldOnPage, getRecipientColor } from './DndComponents';

const Step2Content = ({
    sensors,
    handleDragStart,
    handleDragEnd,
    activeDragItem,
    uploadedFiles,
    currentFileIndex,
    setCurrentFileIndex,
    numPages,
    onDocumentLoadSuccess,
    fields,
    fieldTypes,
    removeField,
    updateFieldSize,
    pdfScrollRef,
    selectedRecipient,
    setSelectedRecipient,
    recipients,
    isStep2Complete,
    goToStep,
    isStepAnimating,
}) => {
    const recipientsWithEmail = recipients.filter(r => r.email);

    return (
        <DndContext sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            collisionDetection={pointerWithin}>
            <div className={`flex gap-6 h-[calc(100vh-4rem)] w-full transition-all duration-300 ease-out ${isStepAnimating ? 'opacity-0 translate-x-2' : 'opacity-100 translate-x-0'}`}>
                {/* Left: PDF Viewer */}
                <div ref={pdfScrollRef} className="flex-1 overflow-y-auto">
                    {uploadedFiles.length > 0 && (
                        <Document
                            file={uploadedFiles[currentFileIndex].file}
                            onLoadSuccess={onDocumentLoadSuccess}
                            className=""
                        >
                            <div className="flex flex-col gap-6 pb-6 items-center">
                                {Array.from(new Array(numPages), (el, index) => (
                                    <PDFPageDroppable key={`page_${currentFileIndex}_${index + 1}`} pageNumber={index + 1} fileIndex={currentFileIndex}>
                                        <div className="w-full flex justify-center">
                                            <div className="inline-block">
                                                <Page
                                                    pageNumber={index + 1}
                                                    className="shadow-lg"
                                                    width={500}
                                                    renderTextLayer={false}
                                                    renderAnnotationLayer={false}
                                                    style={{ pointerEvents: 'none' }}
                                                />
                                                {/* Render fields on this page for this file */}
                                                {fields.filter(f => f.fileId === uploadedFiles[currentFileIndex].id && f.page === index + 1).map(field => (
                                                    <DraggableFieldOnPage
                                                        key={field.id}
                                                        id={field.id}
                                                        field={field}
                                                        fieldTypes={fieldTypes}
                                                        removeField={removeField}
                                                        updateFieldSize={updateFieldSize}
                                                        recipients={recipientsWithEmail}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </PDFPageDroppable>
                                ))}
                            </div>
                        </Document>
                    )}
                </div>

                {/* Right: Sticky Sidebar */}
                <aside className="sticky top-0 h-full w-80 flex-shrink-0 overflow-y-auto border-l border-slate-200 bg-background py-4 p-6">
                    {/* File Selector */}
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-slate-900 mb-3">Chọn tệp</h3>
                        <div className="space-y-2">
                            {uploadedFiles.map((file, idx) => (
                                <button
                                    key={file.id}
                                    onClick={() => setCurrentFileIndex(idx)}
                                    className={`w-full text-left p-3 rounded-lg transition-all ${currentFileIndex === idx
                                        ? 'bg-indigo-100 border-2 border-indigo-400 text-indigo-900'
                                        : 'bg-slate-50 border-2 border-slate-200 text-slate-700 hover:bg-slate-100'
                                        }`}
                                >
                                    <p className="text-xs font-semibold truncate">{file.name}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    <hr className="my-4" />

                    {/* Selected Recipient — dropdown with colored dot */}
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-slate-900 mb-3">Người nhận</h3>
                        {(() => {
                            const selColor = getRecipientColor(selectedRecipient, recipientsWithEmail);
                            return (
                                <div className={`relative flex items-center border-2 rounded-lg transition-colors ${selColor?.border || 'border-slate-200'}`}>
                                    <span className={`absolute left-3 w-3 h-3 rounded-full flex-shrink-0 ${selColor?.dot || 'bg-slate-300'}`}></span>
                                    <select
                                        value={selectedRecipient}
                                        onChange={(e) => setSelectedRecipient(Number(e.target.value))}
                                        className="w-full pl-9 pr-10 py-3 text-sm font-medium text-slate-700 focus:outline-none appearance-none bg-transparent"
                                    >
                                        {recipientsWithEmail.map((r, idx) => (
                                            <option key={r.id} value={r.id}>
                                                {r.name || `Người nhận ${idx + 1}`} ({r.email})
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 w-5 h-5 text-slate-400 pointer-events-none" />
                                </div>
                            );
                        })()}
                    </div>

                    <hr className="my-4" />

                    {/* Field Types */}
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-slate-900 mb-3">Thêm trường (Kéo thả)</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {fieldTypes.map((field, idx) => (
                                <DraggableSidebarItem
                                    key={idx}
                                    type={field.type}
                                    icon={field.icon}
                                    label={field.label}
                                    color={field.color}
                                />
                            ))}
                        </div>
                    </div>

                    <hr className="my-4" />

                    {/* Navigation */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => goToStep(3)}
                            disabled={!isStep2Complete}
                            className={`flex-1 px-4 py-2 text-sm rounded-lg font-medium transition-colors disabled:cursor-not-allowed ${isStep2Complete ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-200 text-slate-400'}`}
                        >
                            Xem trước
                        </button>
                    </div>
                </aside>

                <DragOverlay modifiers={activeDragItem?.isSidebar ? [snapCenterToCursor] : []}>
                    {activeDragItem ? (() => {
                        const fieldTypeInfo = fieldTypes.find(t => t.type === activeDragItem.type) || fieldTypes[0];
                        const Icon = fieldTypeInfo.icon;
                        // Get recipient color for drag overlay
                        const dragColor = activeDragItem.isSidebar
                            ? getRecipientColor(selectedRecipient, recipientsWithEmail)
                            : getRecipientColor(activeDragItem.recipientId, recipientsWithEmail);

                        if (activeDragItem.isSidebar) {
                            return (
                                <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 bg-white shadow-xl scale-105 opacity-90 cursor-grabbing ${dragColor?.border || 'border-slate-300'}`}>
                                    <Icon className={`w-4 h-4 ${dragColor?.text || 'text-slate-400'}`} />
                                    <span className={`text-xs font-medium ${dragColor?.text || 'text-slate-400'}`}>{activeDragItem.label}</span>
                                </div>
                            );
                        } else {
                            return (
                                <div className={`p-2 rounded border-2 shadow-lg cursor-grabbing flex items-center gap-2 bg-white ${dragColor?.border || 'border-slate-300'} opacity-90 scale-105`}>
                                    <Icon className={`w-4 h-4 ${dragColor?.text || 'text-slate-400'}`} />
                                    <span className={`text-xs font-bold whitespace-nowrap ${dragColor?.text || 'text-slate-500'}`}>
                                        {fieldTypeInfo.label}
                                    </span>
                                </div>
                            );
                        }
                    })() : null}
                </DragOverlay>
            </div>
        </DndContext>
    );
};

export default Step2Content;
