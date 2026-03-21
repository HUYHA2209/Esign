import {
    FileText, Users, PenTool, Eye, Send, Settings,
    Copy, Download, Trash2, Mail, User,
    FileSignature, Type, Hash, Calendar, CheckSquare
} from 'lucide-react';

export const fieldTypes = [
    { type: 'signature', icon: FileSignature, label: 'Chữ ký', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { type: 'email', icon: Mail, label: 'Email', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { type: 'name', icon: User, label: 'Tên', color: 'bg-green-100 text-green-700 border-green-200' },
    { type: 'initial', icon: Type, label: 'Chữ cái đầu', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    { type: 'date', icon: Calendar, label: 'Ngày', color: 'bg-pink-100 text-pink-700 border-pink-200' },
    { type: 'text', icon: FileText, label: 'Văn bản', color: 'bg-slate-100 text-slate-700 border-slate-200' },
    { type: 'number', icon: Hash, label: 'Số', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
    { type: 'checkbox', icon: CheckSquare, label: 'Checkbox', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
];

export const steps = [
    { id: 1, title: 'Tài liệu & Người nhận', description: 'Tải tài liệu và thêm người ký', icon: Users },
    { id: 2, title: 'Thêm trường ký', description: 'Đặt các trường vào tài liệu', icon: PenTool },
    { id: 3, title: 'Xem trước', description: 'Xem trước trước khi gửi', icon: Eye }
];

export const quickActions = [
    { icon: Settings, label: 'Cài đặt tài liệu', onClick: () => { } },
    { icon: Send, label: 'Gửi tài liệu', onClick: () => { }, primary: true },
    { icon: Copy, label: 'Nhân bản tài liệu', onClick: () => { } },
    { icon: Download, label: 'Tải PDF', onClick: () => { } },
    { icon: Trash2, label: 'Xóa tài liệu', onClick: () => { }, danger: true },
];

export const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};
