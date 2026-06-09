import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, Search, Filter, Shield, MoreVertical, 
    UserPlus, Mail, ShieldCheck, UserX, UserCheck, Crown, FileText
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getWorkSpaces } from '../../service/userApi';
import { getMembers, updateMember, removeMember } from '../../service/organizationApi';
import InviteMemberModal from '../../components/Modal/InviteMemberModal';
import EditMemberModal from '../../components/Modal/EditMemberModal';

const OrganizationMembers = () => {
    const { orgUrl } = useParams();
    const navigate = useNavigate();

    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [openMenuId, setOpenMenuId] = useState(null);

    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState(null);
    const [currentOrgId, setCurrentOrgId] = useState(null);
    const [currentRole, setCurrentRole] = useState(null);
    const [canInvite, setCanInvite] = useState(false);

    const [members, setMembers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchMembers = async (orgId) => {
        setIsLoading(true);
        try {
            const res = await getMembers(orgId);
            if (res && res.result) {
                const fetchedMembers = res.result.map((m, index) => {
                    const colors = [
                        'from-indigo-400 to-purple-500',
                        'from-emerald-400 to-teal-500',
                        'from-amber-400 to-orange-500',
                        'from-pink-400 to-rose-500',
                        'from-blue-400 to-cyan-500'
                    ];
                    return {
                        ...m,
                        id: m.memberId,
                        name: m.fullName || 'Người dùng',
                        status: 'ACTIVE',
                        avatar: (m.fullName || m.email || 'U').charAt(0).toUpperCase(),
                        color: colors[index % colors.length],
                        joinedAt: 'Thành viên'
                    };
                });
                setMembers(fetchedMembers);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi tải danh sách thành viên');
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        const init = async () => {
            try {
                const res = await getWorkSpaces();
                if (res && res.result) {
                    const ws = res.result.find(w => w.accountUrl === orgUrl);
                    if (ws) {
                        setCurrentOrgId(ws.accountId);
                        setCurrentRole(ws.role);
                        setCanInvite(ws.canInvite);
                        fetchMembers(ws.accountId);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch workspaces', err);
            }
        };
        init();
    }, [orgUrl]);

    const handleUpdateRole = async (memberId, newRole) => {
        try {
            await updateMember(currentOrgId, memberId, { role: newRole });
            toast.success(`Đã cập nhật thành công vai trò thành ${newRole}`);
            fetchMembers(currentOrgId);
            setOpenMenuId(null);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi cập nhật vai trò');
        }
    };

    const handleRemoveMember = async (memberId) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa thành viên này khỏi tổ chức?')) return;
        try {
            await removeMember(currentOrgId, memberId);
            toast.success('Đã xóa thành viên khỏi tổ chức');
            fetchMembers(currentOrgId);
            setOpenMenuId(null);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi xóa thành viên');
        }
    };

    const roleStyles = {
        ADMIN: { label: 'Quản trị viên', cls: 'bg-primary-50 text-primary-600 border-primary-100', icon: Crown },
        MEMBER: { label: 'Thành viên', cls: 'bg-secondary-50 text-secondary-600 border-secondary-200', icon: Users }
    };

    const statusStyles = {
        ACTIVE: { label: 'Hoạt động', cls: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: UserCheck },
        PENDING: { label: 'Chờ xác nhận', cls: 'bg-amber-50 text-amber-600 border-amber-100', icon: Mail }
    };

    const filteredMembers = members.filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              m.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'all' || m.role.toLowerCase() === roleFilter;
        return matchesSearch && matchesRole;
    });

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { 
            opacity: 1, 
            y: 0,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8 pb-20 max-w-7xl mx-auto"
        >
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-secondary-900 font-display">Thành viên tổ chức</h1>
                    <p className="text-secondary-500 font-medium mt-1">Quản lý tài khoản, phân quyền và lời mời tham gia</p>
                </div>
                {(currentRole === 'ADMIN' || canInvite) && (
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsInviteModalOpen(true)}
                        className="flex items-center justify-center gap-3 px-8 py-4 premium-gradient text-white font-bold rounded-2xl shadow-xl shadow-primary-500/30 hover:shadow-primary-500/40 transition-all"
                    >
                        <UserPlus className="w-5 h-5" />
                        Mời thành viên mới
                    </motion.button>
                )}
            </div>

            {/* Toolbar: Search & Filters */}
            <motion.div variants={itemVariants} className="bg-white p-4 rounded-[24px] shadow-sm border border-secondary-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 w-full max-w-md group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-secondary-400 group-focus-within:text-primary-600 transition-colors">
                        <Search className="w-5 h-5" />
                    </div>
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm kiếm theo tên hoặc email..."
                        className="w-full pl-12 pr-4 py-3 bg-secondary-50 border border-secondary-100 rounded-xl text-secondary-900 font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                    />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex items-center bg-secondary-50 border border-secondary-100 rounded-xl px-4 py-3 min-w-[160px]">
                        <Filter className="w-4 h-4 text-secondary-400 mr-2" />
                        <select 
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="bg-transparent text-sm font-bold text-secondary-700 w-full outline-none appearance-none cursor-pointer"
                        >
                            <option value="all">Tất cả vai trò</option>
                            <option value="admin">Quản trị viên</option>
                            <option value="member">Thành viên</option>
                        </select>
                    </div>
                </div>
            </motion.div>

            {/* Members Grid/List */}
            <motion.div variants={itemVariants} className="bg-white rounded-[32px] shadow-premium border border-secondary-100 overflow-hidden">
                <div className="overflow-x-auto pb-28">
                    <table className="w-full min-w-[800px]">
                        <thead className="bg-secondary-50/50 border-b border-secondary-100">
                            <tr>
                                <th className="px-8 py-5 text-left text-[11px] font-bold text-secondary-500 uppercase tracking-widest">Thành viên</th>
                                <th className="px-6 py-5 text-left text-[11px] font-bold text-secondary-500 uppercase tracking-widest">Trạng thái</th>
                                <th className="px-6 py-5 text-left text-[11px] font-bold text-secondary-500 uppercase tracking-widest">Vai trò</th>
                                <th className="px-6 py-5 text-left text-[11px] font-bold text-secondary-500 uppercase tracking-widest">Quyền hạn</th>
                                <th className="px-6 py-5 text-right text-[11px] font-bold text-secondary-500 uppercase tracking-widest">Tham gia</th>
                                <th className="px-8 py-5"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-50">
                            {filteredMembers.map((m) => {
                                const RoleIcon = roleStyles[m.role].icon;
                                const StatusIcon = statusStyles[m.status].icon;
                                
                                return (
                                    <tr key={m.id} className="hover:bg-primary-50/30 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-[16px] bg-gradient-to-br ${m.color} flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:scale-105 transition-transform`}>
                                                    {m.avatar}
                                                </div>
                                                <div>
                                                    <p className="text-base font-bold text-secondary-900 font-display group-hover:text-primary-600 transition-colors">{m.name}</p>
                                                    <p className="text-sm font-medium text-secondary-500 mt-0.5">{m.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${statusStyles[m.status].cls}`}>
                                                <StatusIcon className="w-3.5 h-3.5" />
                                                <span className="text-[11px] font-bold uppercase tracking-wider">{statusStyles[m.status].label}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${roleStyles[m.role].cls}`}>
                                                <RoleIcon className="w-3.5 h-3.5" />
                                                <span className="text-[11px] font-bold uppercase tracking-wider">{roleStyles[m.role].label}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                {m.canViewDocs && <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 tooltip-trigger" title="Xem tài liệu"><ShieldCheck className="w-4 h-4" /></div>}
                                                {m.canSign && <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 tooltip-trigger" title="Ký tài liệu"><FileText className="w-4 h-4" /></div>}
                                                {m.canUpload && <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 tooltip-trigger" title="Upload tài liệu"><FileText className="w-4 h-4" /></div>}
                                                {m.canInvite && <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 tooltip-trigger" title="Mời thành viên"><UserPlus className="w-4 h-4" /></div>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <span className="text-sm font-medium text-secondary-600">{m.joinedAt}</span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            {m.role !== 'ADMIN' && (
                                                <div className="relative inline-block text-left">
                                                    {currentRole === 'ADMIN' ? (
                                                        <>
                                                            <button 
                                                                onClick={() => setOpenMenuId(openMenuId === m.id ? null : m.id)}
                                                                className="w-10 h-10 bg-white border border-secondary-200 rounded-xl flex items-center justify-center text-secondary-400 hover:text-primary-600 hover:border-primary-200 hover:shadow-md transition-all"
                                                            >
                                                                <MoreVertical className="w-5 h-5" />
                                                            </button>
                                                            
                                                            <AnimatePresence>
                                                                {openMenuId === m.id && (
                                                                    <motion.div 
                                                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                                                        className="absolute right-0 top-full mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-secondary-100 z-50 py-2 overflow-hidden"
                                                                    >
                                                                        <button 
                                                                            onClick={() => {
                                                                                setEditingMember(m);
                                                                                setIsEditModalOpen(true);
                                                                                setOpenMenuId(null);
                                                                            }} 
                                                                            className="w-full flex items-center gap-3 px-5 py-3 text-sm font-bold text-secondary-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                                                                        >
                                                                            <Shield className="w-4 h-4" /> Xem và sửa quyền
                                                                        </button>
                                                                        <div className="border-t border-secondary-100 my-2" />
                                                                        <button onClick={() => handleRemoveMember(m.id)} className="w-full flex items-center gap-3 px-5 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors">
                                                                            <UserX className="w-4 h-4" /> Xóa khỏi tổ chức
                                                                        </button>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </>
                                                    ) : (
                                                        <button 
                                                            onClick={() => {
                                                                setEditingMember(m);
                                                                setIsEditModalOpen(true);
                                                            }}
                                                            title="Xem quyền"
                                                            className="w-10 h-10 bg-white border border-secondary-200 rounded-xl flex items-center justify-center text-secondary-400 hover:text-primary-600 hover:border-primary-200 hover:bg-primary-50 transition-all tooltip-trigger"
                                                        >
                                                            <Shield className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    
                    {isLoading ? (
                        <div className="p-12 text-center flex flex-col items-center">
                            <div className="w-10 h-10 border-4 border-secondary-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
                            <h3 className="text-sm font-bold text-secondary-500 font-display">Đang tải danh sách thành viên...</h3>
                        </div>
                    ) : filteredMembers.length === 0 && (
                        <div className="p-12 text-center flex flex-col items-center">
                            <div className="w-20 h-20 bg-secondary-50 rounded-full flex items-center justify-center mb-4">
                                <Search className="w-8 h-8 text-secondary-300" />
                            </div>
                            <h3 className="text-lg font-bold text-secondary-900 font-display">Không tìm thấy thành viên</h3>
                            <p className="text-secondary-500 mt-1 max-w-sm">Không có thành viên nào khớp với điều kiện tìm kiếm của bạn. Hãy thử tìm với từ khóa khác.</p>
                        </div>
                    )}
                </div>
            </motion.div>

            <InviteMemberModal 
                isOpen={isInviteModalOpen} 
                onClose={() => {
                    setIsInviteModalOpen(false);
                    if (currentOrgId) fetchMembers(currentOrgId);
                }} 
                orgId={currentOrgId} 
            />

            <EditMemberModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setEditingMember(null);
                }}
                member={editingMember}
                orgId={currentOrgId}
                readOnly={currentRole !== 'ADMIN'}
                onSuccess={() => {
                    if (currentOrgId) fetchMembers(currentOrgId);
                }}
            />

        </motion.div>
    );
};

export default OrganizationMembers;
