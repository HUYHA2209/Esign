import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCog, X, ShieldCheck, FileText, UserPlus } from 'lucide-react';
import { toast } from 'react-toastify';
import { updateMember } from '../../service/organizationApi';

const EditMemberModal = ({ isOpen, onClose, member, orgId, onSuccess, readOnly = false }) => {
    const [editRole, setEditRole] = useState('MEMBER');
    const [permissions, setPermissions] = useState({
        canViewDocs: false,
        canUpload: false,
        canSign: false,
        canInvite: false
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (member) {
            setEditRole(member.role);
            setPermissions({
                canViewDocs: member.canViewDocs || false,
                canUpload: member.canUpload || false,
                canSign: member.canSign || false,
                canInvite: member.canInvite || false
            });
        }
    }, [member]);

    if (!isOpen || !member) return null;

    const handleSave = async (e) => {
        e.preventDefault();
        if (!orgId || !member.id) return;

        setIsSaving(true);
        try {
            const data = {
                role: editRole,
                ...permissions
            };
            if (editRole === 'ADMIN') {
                data.canViewDocs = true;
                data.canUpload = true;
                data.canSign = true;
                data.canInvite = true;
            }

            await updateMember(orgId, member.id, data);
            toast.success(`Đã cập nhật quyền cho ${member.name}`);
            onSuccess();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật quyền.');
        } finally {
            setIsSaving(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="absolute inset-0 bg-secondary-950/40 backdrop-blur-sm" 
                onClick={() => !isSaving && onClose()} 
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: "spring", duration: 0.4 }}
                className="relative bg-white rounded-[32px] shadow-premium border border-secondary-100 w-full max-w-lg overflow-hidden z-10"
            >
                <div className="flex items-center justify-between px-8 py-6 border-b border-secondary-50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600">
                            <UserCog className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-secondary-900 font-display">Phân quyền thành viên</h3>
                            <p className="text-xs font-medium text-secondary-500">Chỉnh sửa quyền của {member.name}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        disabled={isSaving}
                        className="p-2 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-50 rounded-xl transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSave} className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest px-1">Vai trò</label>
                        <select 
                            value={editRole} 
                            disabled={readOnly}
                            onChange={e => {
                                setEditRole(e.target.value);
                                if(e.target.value === 'ADMIN') {
                                    setPermissions({ canViewDocs: true, canUpload: true, canSign: true, canInvite: true });
                                }
                            }}
                            className="w-full bg-secondary-50 border border-secondary-100 text-secondary-900 font-bold text-sm rounded-2xl px-5 py-4 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none appearance-none cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            <option value="MEMBER">Thành viên</option>
                            <option value="ADMIN">Quản trị viên</option>
                        </select>
                    </div>

                    <AnimatePresence>
                        {editRole === 'MEMBER' && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="space-y-3 pt-2">
                                    <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest px-1">Quyền hạn (Tùy chỉnh)</label>
                                    <div className="grid grid-cols-2 gap-3 bg-secondary-50/50 p-4 rounded-2xl border border-secondary-100">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <input type="checkbox" disabled={readOnly} checked={permissions.canViewDocs} onChange={e => setPermissions({...permissions, canViewDocs: e.target.checked})} className="w-4 h-4 text-primary-600 rounded border-secondary-300 focus:ring-primary-500 disabled:opacity-50" />
                                            <span className="text-xs font-bold text-secondary-700 group-hover:text-primary-600">Xem tài liệu</span>
                                        </label>
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <input type="checkbox" disabled={readOnly} checked={permissions.canUpload} onChange={e => setPermissions({...permissions, canUpload: e.target.checked})} className="w-4 h-4 text-primary-600 rounded border-secondary-300 focus:ring-primary-500 disabled:opacity-50" />
                                            <span className="text-xs font-bold text-secondary-700 group-hover:text-primary-600">Upload tài liệu</span>
                                        </label>
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <input type="checkbox" disabled={readOnly} checked={permissions.canSign} onChange={e => setPermissions({...permissions, canSign: e.target.checked})} className="w-4 h-4 text-primary-600 rounded border-secondary-300 focus:ring-primary-500 disabled:opacity-50" />
                                            <span className="text-xs font-bold text-secondary-700 group-hover:text-primary-600">Ký tài liệu</span>
                                        </label>
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <input type="checkbox" disabled={readOnly} checked={permissions.canInvite} onChange={e => setPermissions({...permissions, canInvite: e.target.checked})} className="w-4 h-4 text-primary-600 rounded border-secondary-300 focus:ring-primary-500 disabled:opacity-50" />
                                            <span className="text-xs font-bold text-secondary-700 group-hover:text-primary-600">Mời thành viên</span>
                                        </label>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex justify-end gap-3 pt-6 border-t border-secondary-50 mt-8">
                        <button 
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="px-6 py-3.5 text-sm font-bold text-secondary-500 hover:text-secondary-800 hover:bg-secondary-50 rounded-2xl transition-colors disabled:opacity-50"
                        >
                            {readOnly ? 'Đóng' : 'Hủy'}
                        </button>
                        {!readOnly && (
                            <button 
                                type="submit"
                                disabled={isSaving} 
                                className="px-8 py-3.5 text-sm font-bold premium-gradient text-white rounded-2xl shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                            >
                                {isSaving ? (
                                    <>
                                        <span className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full"></span>
                                        Đang lưu...
                                    </>
                                ) : (
                                    <>
                                        <UserCog className="w-4 h-4" />
                                        Lưu thay đổi
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </form>
            </motion.div>
        </div>,
        document.body
    );
};

export default EditMemberModal;
