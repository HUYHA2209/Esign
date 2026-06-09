import React from 'react';
import { useDraggable, useDroppable, PointerSensor } from '@dnd-kit/core';
import { X } from 'lucide-react';

// ─── Recipient Color Palette ───
const RECIPIENT_COLORS = [
    { border: 'border-blue-500',   text: 'text-blue-600',   bg: 'bg-blue-50',   ring: 'ring-blue-300',   dot: 'bg-blue-500' },
    { border: 'border-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-300', dot: 'bg-emerald-500' },
    { border: 'border-amber-500',  text: 'text-amber-600',  bg: 'bg-amber-50',  ring: 'ring-amber-300',  dot: 'bg-amber-500' },
    { border: 'border-purple-500', text: 'text-purple-600', bg: 'bg-purple-50', ring: 'ring-purple-300', dot: 'bg-purple-500' },
    { border: 'border-rose-500',   text: 'text-rose-600',   bg: 'bg-rose-50',   ring: 'ring-rose-300',   dot: 'bg-rose-500' },
    { border: 'border-cyan-500',   text: 'text-cyan-600',   bg: 'bg-cyan-50',   ring: 'ring-cyan-300',   dot: 'bg-cyan-500' },
    { border: 'border-orange-500', text: 'text-orange-600', bg: 'bg-orange-50', ring: 'ring-orange-300', dot: 'bg-orange-500' },
    { border: 'border-indigo-500', text: 'text-indigo-600', bg: 'bg-indigo-50', ring: 'ring-indigo-300', dot: 'bg-indigo-500' },
];

export function getRecipientColor(recipientId, recipients) {
    if (!recipientId || !recipients) return null;
    const idx = recipients.findIndex(r => r.id === recipientId);
    if (idx === -1) return null;
    return RECIPIENT_COLORS[idx % RECIPIENT_COLORS.length];
}

// Default (unassigned) color
const UNASSIGNED_COLOR = {
    border: 'border-slate-300',
    text: 'text-slate-400',
    bg: 'bg-white',
    ring: 'ring-slate-200',
    dot: 'bg-slate-300',
};

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
export const DraggableFieldOnPage = ({ id, field, updateFieldSize, removeField, fieldTypes, recipients }) => {
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

    // Determine color based on assigned recipient
    const recipientColor = getRecipientColor(field.recipientId, recipients) || UNASSIGNED_COLOR;

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
            className={`absolute z-10 p-2 rounded border-2 shadow-sm cursor-move flex items-center gap-2 bg-white ${recipientColor.border} overflow-hidden transition-colors duration-200`}
        >
            <Icon className={`w-4 h-4 flex-shrink-0 ${recipientColor.text}`} />
            <span className={`text-xs font-bold truncate flex-1 ${recipientColor.text}`}>
                {fieldTypeInfo.label}
            </span>
            <button
                onPointerDown={(e) => { e.stopPropagation(); removeField(id); }}
                className="ml-1 p-0.5 hover:bg-red-100 rounded text-red-500 flex-shrink-0"
            >
                <X className="w-3 h-3" />
            </button>
            {/* Resize handle */}
            <div
                data-no-dnd="true"
                onPointerDown={handleResizePointerDown}
                className={`absolute bottom-0 right-0 w-3 h-3 cursor-se-resize z-20 flex items-center justify-center ${recipientColor.text}`}
                title="Kéo để thay đổi kích thước"
            >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" className="opacity-50">
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
