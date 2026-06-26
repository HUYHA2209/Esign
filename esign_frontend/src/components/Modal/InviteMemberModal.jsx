import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, UserPlus, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { inviteMember } from '../../service/organizationApi';

const InviteMemberModal = ({ isOpen, onClose, orgId, inviterRole = 'MEMBER', inviterPermissions = {} }) => {
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('member');
    const [permissions, setPermissions] = useState({
        canViewDocs: true,
        canUpload: true,
        canSign: true,
        canInvite: false
    });
    const [isInviting, setIsInviting] = useState(false);

    if (!isOpen) return null;

    const handleInvite = async (e) => {
        e.preventDefault();
        if (!inviteEmail.trim()) { toast.error('Nhập email thành viên!'); return; }
        if (!orgId) { toast.error('Không tìm thấy thông tin tổ chức!'); return; }

        setIsInviting(true);
        try {
            const data = {
                email: inviteEmail,
                ...permissions
            };
            if (inviteRole === 'admin') {
                data.canViewDocs = true;
                data.canUpload = true;
                data.canSign = true;
                data.canInvite = true;
            }

            await inviteMember(orgId, data);
            toast.success(`Đã gửi lời mời đến ${inviteEmail}`);
            setInviteEmail('');
            setInviteRole('member');
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi gửi lời mời.');
        } finally {
            setIsInviting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="absolute inset-0 bg-secondary-950/40 backdrop-blur-sm" 
                onClick={() => !isInviting && onClose()} 
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
                            <UserPlus className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-secondary-900 font-display">Mời thành viên</h3>
                            <p className="text-xs font-medium text-secondary-500">Gửi lời mời tham gia vào tổ chức</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        disabled={isInviting}
                        className="p-2 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-50 rounded-xl transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleInvite} className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest px-1">Email người nhận *</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-secondary-400 group-focus-within:text-primary-600 transition-colors">
                                <Mail className="w-5 h-5" />
                            </div>
                            <input 
                                type="email" 
                                value={inviteEmail} 
                                onChange={e => setInviteEmail(e.target.value)}
                                placeholder="email@example.com"
                                className="w-full pl-12 pr-4 py-4 bg-secondary-50 border border-secondary-100 rounded-2xl text-secondary-900 font-medium focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all" 
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest px-1">Vai trò</label>
                        <select 
                            value={inviteRole} 
                            onChange={e => {
                                setInviteRole(e.target.value);
                                if(e.target.value === 'admin') {
                                    setPermissions({ canViewDocs: true, canUpload: true, canSign: true, canInvite: true });
                                }
                            }}
                            className="w-full bg-secondary-50 border border-secondary-100 text-secondary-900 font-bold text-sm rounded-2xl px-5 py-4 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none appearance-none cursor-pointer"
                        >
                            <option value="member">Thành viên</option>
                            <option value="admin" disabled={inviterRole !== 'ADMIN'}>Quản trị viên</option>
                        </select>
                    </div>

                    <AnimatePresence>
                        {inviteRole === 'member' && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="space-y-3 pt-2">
                                    <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest px-1">Quyền hạn (Tùy chỉnh)</label>
                                    <div className="grid grid-cols-2 gap-3 bg-secondary-50/50 p-4 rounded-2xl border border-secondary-100">
                                        <label className={`flex items-center gap-3 cursor-pointer group ${inviterRole !== 'ADMIN' && !inviterPermissions.canViewDocs ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                            <input type="checkbox" disabled={inviterRole !== 'ADMIN' && !inviterPermissions.canViewDocs} checked={permissions.canViewDocs} onChange={e => setPermissions({...permissions, canViewDocs: e.target.checked})} className="w-4 h-4 text-primary-600 rounded border-secondary-300 focus:ring-primary-500 disabled:opacity-50" />
                                            <span className="text-xs font-bold text-secondary-700 group-hover:text-primary-600">Xem tài liệu</span>
                                        </label>
                                        <label className={`flex items-center gap-3 cursor-pointer group ${inviterRole !== 'ADMIN' && !inviterPermissions.canUpload ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                            <input type="checkbox" disabled={inviterRole !== 'ADMIN' && !inviterPermissions.canUpload} checked={permissions.canUpload} onChange={e => setPermissions({...permissions, canUpload: e.target.checked})} className="w-4 h-4 text-primary-600 rounded border-secondary-300 focus:ring-primary-500 disabled:opacity-50" />
                                            <span className="text-xs font-bold text-secondary-700 group-hover:text-primary-600">Upload tài liệu</span>
                                        </label>
                                        <label className={`flex items-center gap-3 cursor-pointer group ${inviterRole !== 'ADMIN' && !inviterPermissions.canSign ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                            <input type="checkbox" disabled={inviterRole !== 'ADMIN' && !inviterPermissions.canSign} checked={permissions.canSign} onChange={e => setPermissions({...permissions, canSign: e.target.checked})} className="w-4 h-4 text-primary-600 rounded border-secondary-300 focus:ring-primary-500 disabled:opacity-50" />
                                            <span className="text-xs font-bold text-secondary-700 group-hover:text-primary-600">Ký tài liệu</span>
                                        </label>
                                        <label className={`flex items-center gap-3 cursor-pointer group ${inviterRole !== 'ADMIN' && !inviterPermissions.canInvite ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                            <input type="checkbox" disabled={inviterRole !== 'ADMIN' && !inviterPermissions.canInvite} checked={permissions.canInvite} onChange={e => setPermissions({...permissions, canInvite: e.target.checked})} className="w-4 h-4 text-primary-600 rounded border-secondary-300 focus:ring-primary-500 disabled:opacity-50" />
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
                            disabled={isInviting}
                            className="px-6 py-3.5 text-sm font-bold text-secondary-500 hover:text-secondary-800 hover:bg-secondary-50 rounded-2xl transition-colors disabled:opacity-50"
                        >
                            Hủy
                        </button>
                        <button 
                            type="submit"
                            disabled={isInviting} 
                            className="px-8 py-3.5 text-sm font-bold premium-gradient text-white rounded-2xl shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                        >
                            {isInviting ? (
                                <>
                                    <span className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full"></span>
                                    Đang gửi...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-4 h-4" />
                                    Gửi lời mời
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>,
        document.body
    );
};

export default InviteMemberModal;
