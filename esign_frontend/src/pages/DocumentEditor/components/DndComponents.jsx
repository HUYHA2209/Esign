import React from 'react';
import { useDraggable, useDroppable, PointerSensor } from '@dnd-kit/core';
import { X } from 'lucide-react';

// ─── Draggable Sidebar Item ───
export const DraggableSidebarItem = ({ type, icon: Icon, label, color }) => {
    const { attributes, listeners, setNodeRef } = useDraggable({
        id: `sidebar-${type}`,
        data: { type, label, isSidebar: true }
    });

    return (
        <div ref={setNodeRef} {...listeners} {...attributes} className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:scale-105 cursor-grab ${color}`}>
            <Icon className="w-5 h-5" />
            <span className="text-xs font-medium">{label}</span>
        </div>
    );
};

// ─── Droppable PDF Page ───
export const PDFPageDroppable = ({ pageNumber, fileIndex, children }) => {
    const { setNodeRef } = useDroppable({
        id: `page-${fileIndex}-${pageNumber}`,
        data: { pageNumber, fileIndex }
    });

    return (
        <div id={`page-${fileIndex}-${pageNumber}`} ref={setNodeRef} data-page-container="true" className="relative mb-4 bg-white shadow-md">
            {children}
        </div>
    );
};

// ─── Draggable Field on Page ───
export const DraggableFieldOnPage = ({ id, field, updateFieldSize, removeField, fieldTypes }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: id,
        data: { id, ...field }
    });

    const w = field.width ?? 14;
    const h = field.height ?? 5;

    const style = {
        left: `${field.x}%`,
        top: `${field.y}%`,
        width: `${w}%`,
        height: `${h}%`,
        position: 'absolute',
        opacity: isDragging ? 0.3 : 1,
        touchAction: 'none',
        minWidth: '80px',
        minHeight: '28px',
    };

    const fieldTypeInfo = fieldTypes.find(t => t.type === field.type) || fieldTypes[0];
    const Icon = fieldTypeInfo.icon;

    const handleResizePointerDown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const startW = w;
        const startH = h;

        const pageEl = e.currentTarget.closest('[data-page-container]');
        const pageRect = pageEl ? pageEl.getBoundingClientRect() : null;

        const onMove = (moveEvent) => {
            if (!pageRect) return;
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;
            const newW = Math.max(5, startW + (dx / pageRect.width) * 100);
            const newH = Math.max(2, startH + (dy / pageRect.height) * 100);
            updateFieldSize(id, newW, newH);
        };
        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`absolute z-10 p-2 rounded border shadow-sm cursor-move flex items-center gap-2 ${fieldTypeInfo.color} bg-opacity-90 overflow-hidden`}
        >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="text-xs font-bold truncate flex-1">{fieldTypeInfo.label} {field.recipientIndex ? `#${field.recipientIndex}` : ''}</span>
            <button
                onPointerDown={(e) => { e.stopPropagation(); removeField(id); }}
                className="ml-1 p-0.5 hover:bg-red-200 rounded text-red-600 flex-shrink-0"
            >
                <X className="w-3 h-3" />
            </button>
            {/* Resize handle */}
            <div
                data-no-dnd="true"
                onPointerDown={handleResizePointerDown}
                className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize z-20 flex items-center justify-center"
                title="Kéo để thay đổi kích thước"
            >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" className="text-current opacity-50">
                    <path d="M0 8 L8 0 L8 8 Z" />
                </svg>
            </div>
        </div>
    );
};

// ─── Smart Pointer Sensor (avoid conflict with resize handle) ───
function shouldHandleEvent(element) {
    let cur = element;
    while (cur) {
        if (cur.dataset && cur.dataset.noDnd) return false;
        cur = cur.parentElement;
    }
    return true;
}

export class SmartPointerSensor extends PointerSensor {
    static activators = [{
        eventName: 'onPointerDown',
        handler: ({ nativeEvent: event }) => shouldHandleEvent(event.target)
    }];
}
