import React, { useState, useRef } from 'react';
import {
    Building2, Users, Globe, CreditCard, AlertTriangle, Trash2,
    Upload, Mail, UserPlus, MoreVertical, Crown, Shield, UserMinus, X,
    CheckCircle2, ArrowRight, Camera, ShieldCheck, Lock
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { getWorkSpaces } from '../../service/userApi';
import { getMembers, deleteOrganization } from '../../service/organizationApi';

const OrganizationSettings = () => {
    const { orgUrl } = useParams();
    const navigate = useNavigate();

    const defaultName = orgUrl
        ? orgUrl.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        : 'Tổ chức';

    // Org profile
    const [orgName, setOrgName] = useState(defaultName);
    const [orgSlug, setOrgSlug] = useState(orgUrl || '');
    const [avatarPreview, setAvatarPreview] = useState(null);
    const fileRef = useRef();

    // Language
    const [language, setLanguage] = useState('vi');

    // Members
    const [members, setMembers] = useState([]);
    const [isLoadingMembers, setIsLoadingMembers] = useState(true);

    // Current Org
    const [currentOrgId, setCurrentOrgId] = useState(null);
    const [currentRole, setCurrentRole] = useState(null);

    const fetchMembers = async (orgId) => {
        setIsLoadingMembers(true);
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
                        avatar: (m.fullName || m.email || 'U').charAt(0).toUpperCase(),
                        color: colors[index % colors.length],
                        role: m.role.toLowerCase()
                    };
                });
                setMembers(fetchedMembers);
            }
        } catch (error) {
            console.error('Failed to load members', error);
        } finally {
            setIsLoadingMembers(false);
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
                        fetchMembers(ws.accountId);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch workspaces', err);
            }
        };
        init();
    }, [orgUrl]);

    // Delete
    const [deleteInput, setDeleteInput] = useState('');
    const [showDelete, setShowDelete] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const currentPlan = { name: 'Basic Plan', features: ['3 tài liệu/tháng', 'Chữ ký cơ bản', 'Lưu trữ 1GB'] };

    const roleInfo = {
        owner:  { label: 'Chủ sở hữu', cls: 'bg-amber-50 text-amber-600 border-amber-100' },
        admin:  { label: 'Quản trị viên', cls: 'bg-primary-50 text-primary-600 border-primary-100' },
        member: { label: 'Thành viên', cls: 'bg-secondary-50 text-secondary-500 border-secondary-100' },
    };

    const handleAvatarChange = (e) => {
        const f = e.target.files[0];
        if (f && f.type.startsWith('image/')) setAvatarPreview(URL.createObjectURL(f));
    };

    const handleSaveProfile = (e) => {
        e.preventDefault();
        if (!orgName.trim() || !orgSlug.trim()) { toast.error('Vui lòng điền đầy đủ thông tin!'); return; }
        toast.success('Đã lưu thông tin tổ chức!');
        if (orgSlug !== orgUrl) navigate(`/o/${orgSlug}/settings`, { replace: true });
    };

    const handleDeleteOrg = async () => {
        if (deleteInput !== orgName) { toast.error('Tên tổ chức không khớp!'); return; }
        if (!currentOrgId) { toast.error('Không tìm thấy thông tin tổ chức!'); return; }

        setIsDeleting(true);
        try {
            await deleteOrganization(currentOrgId);
            toast.success('Đã xóa tổ chức thành công!');
            navigate('/dashboard');
        } catch (error) {
            const msg = error?.response?.data?.message || 'Không thể xóa tổ chức. Vui lòng thử lại.';
            toast.error(msg);
        } finally {
            setIsDeleting(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { 
            opacity: 1, 
            y: 0,
            transition: { staggerChildren: 0.1 }
        }
    };

    const sectionVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-10 max-w-5xl mx-auto pb-20"
        >
            <header>
                <h1 className="text-3xl font-bold text-secondary-900 font-display mb-2">Cài đặt tổ chức</h1>
                <p className="text-secondary-500 font-medium">Quản lý định danh, thành viên và bảo mật hệ thống</p>
            </header>

            {/* 1 - Profile */}
            <motion.section variants={sectionVariants} className="bg-white rounded-[32px] shadow-premium border border-secondary-100 overflow-hidden">
                <div className="flex items-center gap-5 px-8 py-6 border-b border-secondary-50">
                    <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600">
                        <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-secondary-900 font-display">Hồ sơ tổ chức</h2>
                        <p className="text-sm font-medium text-secondary-400">Thông tin cơ bản và URL định danh</p>
                    </div>
                </div>
                <form onSubmit={handleSaveProfile} className="p-8 space-y-8">
                    {/* Avatar */}
                    <div className="flex items-center gap-8">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-[32px] premium-gradient p-1 shadow-xl">
                                <div className="w-full h-full rounded-[28px] bg-white flex items-center justify-center overflow-hidden">
                                    {avatarPreview ? (
                                        <img src={avatarPreview} alt="org" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-3xl font-bold text-primary-600 font-display uppercase">{orgName.charAt(0)}</span>
                                    )}
                                </div>
                            </div>
                            <button 
                                type="button" 
                                disabled={currentRole !== 'ADMIN'}
                                onClick={() => fileRef.current?.click()}
                                className="absolute bottom-1 right-1 w-8 h-8 bg-secondary-900 text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-primary-600 transition-colors border-2 border-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Camera className="w-4 h-4" />
                            </button>
                            <input ref={fileRef} disabled={currentRole !== 'ADMIN'} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-secondary-900">Logo tổ chức</p>
                            <p className="text-xs font-medium text-secondary-400 leading-relaxed max-w-[200px]">Định dạng PNG, JPG. Dung lượng tối đa 2MB.</p>
                            {currentRole === 'ADMIN' && (
                                <button type="button" onClick={() => fileRef.current?.click()} className="text-xs font-bold text-primary-600 hover:text-primary-700 uppercase tracking-widest pt-2 block">Tải ảnh lên</button>
                            )}
                        </div>
                    </div>

                    {/* Name & URL */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-[0.2em] px-1">Tên tổ chức *</label>
                            <input 
                                value={orgName} 
                                disabled={currentRole !== 'ADMIN'}
                                onChange={e => setOrgName(e.target.value)}
                                className="w-full bg-secondary-50 border border-secondary-100 rounded-2xl px-5 py-4 text-secondary-900 font-medium focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                placeholder="Tên công ty..." 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-[0.2em] px-1">URL định danh *</label>
                            <div className="flex bg-secondary-50 border border-secondary-100 rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-primary-500/10 focus-within:border-primary-500 transition-all">
                                <span className="px-5 py-4 bg-secondary-100/50 flex items-center text-secondary-500 font-bold text-xs border-r border-secondary-100">digisign.app/o/</span>
                                <input 
                                    value={orgSlug}
                                    disabled={currentRole !== 'ADMIN'}
                                    onChange={e => setOrgSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
                                    className="flex-1 bg-transparent px-5 py-4 text-secondary-900 font-medium outline-none disabled:opacity-70 disabled:cursor-not-allowed"
                                    placeholder="ten-to-chuc" 
                                />
                            </div>
                        </div>
                    </div>

                    {currentRole === 'ADMIN' && (
                        <div className="flex justify-end pt-4 border-t border-secondary-50">
                            <motion.button 
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                className="px-10 py-4 premium-gradient text-white font-bold rounded-2xl shadow-xl shadow-primary-500/30 hover:shadow-primary-500/40 transition-all"
                            >
                                Lưu hồ sơ
                            </motion.button>
                        </div>
                    )}
                </form>
            </motion.section>

            {/* 2 - Members */}
            <motion.section variants={sectionVariants} className="bg-white rounded-[32px] shadow-premium border border-secondary-100 overflow-hidden">
                <div className="flex items-center gap-5 px-8 py-6 border-b border-secondary-50">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-secondary-900 font-display">Quản lý thành viên</h2>
                        <p className="text-sm font-medium text-secondary-400">Các thành viên hiện đang thuộc tổ chức này.</p>
                    </div>
                </div>
                <div className="p-8">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-bold text-secondary-900">Danh sách thành viên ({members.length})</h3>
                            <p className="text-xs text-secondary-500 mt-1">Các thành viên hiện đang thuộc tổ chức này.</p>
                        </div>
                        <button
                            onClick={() => navigate(`/o/${orgUrl}/members`)}
                            className="text-sm font-bold text-primary-600 hover:text-primary-700 hover:underline flex items-center gap-1"
                        >
                            Quản lý chi tiết <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* List */}
                    <div className="border border-secondary-100 rounded-[24px] overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-secondary-50 border-b border-secondary-100">
                                <tr>
                                    <th className="px-6 py-4 text-left text-[10px] font-bold text-secondary-500 uppercase tracking-widest">Thành viên</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-bold text-secondary-500 uppercase tracking-widest">Vai trò</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-secondary-50">
                                {members.map(m => (
                                    <tr key={m.id} className="hover:bg-secondary-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${m.color} flex items-center justify-center text-white font-bold text-xs shadow-lg`}>{m.avatar}</div>
                                                <div>
                                                    <p className="text-sm font-bold text-secondary-900 font-display">{m.name}</p>
                                                    <p className="text-xs font-medium text-secondary-400">{m.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`text-[10px] font-bold px-3 py-1.5 rounded-xl border uppercase tracking-wider ${roleInfo[m.role]?.cls || roleInfo['member'].cls}`}>
                                                {roleInfo[m.role]?.label || roleInfo['member'].label}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {isLoadingMembers && (
                                    <tr>
                                        <td colSpan="2" className="px-6 py-8 text-center text-secondary-500 text-sm font-medium">
                                            <div className="w-6 h-6 border-2 border-secondary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-2"></div>
                                            Đang tải...
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </motion.section>

            {/* 3 - Language & Plan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Language */}
                <motion.section variants={sectionVariants} className="bg-white rounded-[32px] shadow-premium border border-secondary-100 overflow-hidden">
                    <div className="flex items-center gap-5 px-8 py-6 border-b border-secondary-50">
                        <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600">
                            <Globe className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-secondary-900 font-display">Ngôn ngữ & Vùng</h2>
                        </div>
                    </div>
                    <div className="p-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-secondary-500 uppercase tracking-[0.2em] px-1">Ngôn ngữ mặc định</label>
                            <select 
                                value={language} 
                                disabled={currentRole !== 'ADMIN'}
                                onChange={e => setLanguage(e.target.value)}
                                className="w-full bg-secondary-50 border border-secondary-100 text-secondary-900 font-bold text-sm rounded-2xl px-5 py-4 focus:ring-4 focus:ring-primary-500/10 focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                <option value="vi">Tiếng Việt (Vietnamese)</option>
                                <option value="en">English (US)</option>
                                <option value="jp">日本語 (Japanese)</option>
                            </select>
                        </div>
                    </div>
                </motion.section>

                {/* Plan */}
                <motion.section variants={sectionVariants} className="bg-white rounded-[32px] shadow-premium border border-secondary-100 overflow-hidden flex flex-col">
                    <div className="flex items-center gap-5 px-8 py-6 border-b border-secondary-50">
                        <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-secondary-900 font-display">Gói dịch vụ</h2>
                        </div>
                    </div>
                    <div className="p-8 flex-1 flex flex-col justify-between">
                        <div className="bg-secondary-900 rounded-[24px] p-6 text-white relative overflow-hidden shadow-xl">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-600/20 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                            <div className="relative z-10">
                                <span className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">Hiện tại:</span>
                                <p className="text-2xl font-bold font-display mt-1">{currentPlan.name}</p>
                                <div className="flex flex-wrap gap-2 mt-4">
                                    {currentPlan.features.map((f, i) => (
                                        <span key={i} className="bg-white/10 text-[10px] font-bold px-3 py-1 rounded-lg border border-white/5">{f}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full mt-6 py-4 border-2 border-secondary-100 text-secondary-900 font-bold text-sm rounded-2xl hover:bg-secondary-50 transition-all flex items-center justify-center gap-2 group"
                        >
                            Nâng cấp lên Pro
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </motion.button>
                    </div>
                </motion.section>
            </div>

            {/* 4 - Danger Zone */}
            {currentRole === 'ADMIN' && (
                <motion.section variants={sectionVariants} className="bg-red-50/30 rounded-[32px] border border-red-100 overflow-hidden shadow-premium">
                    <div className="flex items-center gap-5 px-8 py-6 border-b border-red-100 bg-red-50/50">
                        <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-red-700 font-display">Vùng nguy hiểm</h2>
                            <p className="text-sm font-medium text-red-500">Các hành động không thể hoàn tác</p>
                        </div>
                    </div>
                    <div className="p-8">
                        {!showDelete ? (
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div>
                                    <h3 className="text-lg font-bold text-secondary-900 font-display mb-1">Xóa tổ chức vĩnh viễn</h3>
                                    <p className="text-sm font-medium text-secondary-500 max-w-lg leading-relaxed">
                                        Mọi dữ liệu, tài liệu, và toàn bộ hồ sơ thành viên sẽ bị xóa hoàn toàn khỏi hệ thống.
                                    </p>
                                </div>
                                <motion.button 
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setShowDelete(true)}
                                    className="flex items-center justify-center gap-3 px-8 py-4 bg-white border border-red-200 text-red-600 font-bold rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                >
                                    <Trash2 className="w-5 h-5" /> Xóa tổ chức
                                </motion.button>
                            </div>
                        ) : (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                <div className="p-6 bg-red-600 rounded-2xl text-white shadow-xl shadow-red-500/20">
                                    <p className="text-sm font-bold flex items-center gap-2 mb-2">
                                        <AlertTriangle className="w-5 h-5" /> Hành động này không thể hoàn tác!
                                    </p>
                                    <p className="text-sm opacity-90 leading-relaxed">Vui lòng nhập tên tổ chức <span className="font-black underline">"{orgName}"</span> để xác nhận việc xóa vĩnh viễn.</p>
                                </div>
                                <div className="flex flex-col md:flex-row gap-4 items-end">
                                    <div className="flex-1 space-y-2">
                                        <label className="text-[10px] font-bold text-red-600 uppercase tracking-widest px-1">Nhập tên tổ chức để xác nhận</label>
                                        <input 
                                            value={deleteInput} 
                                            onChange={e => setDeleteInput(e.target.value)}
                                            className="w-full bg-white border border-red-200 rounded-2xl px-5 py-4 text-secondary-900 font-bold focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all"
                                            placeholder={orgName} 
                                        />
                                    </div>
                                    <div className="flex gap-4">
                                        <motion.button 
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={handleDeleteOrg} 
                                            disabled={deleteInput !== orgName || isDeleting}
                                            className="px-8 py-4 bg-red-600 text-white font-bold rounded-2xl shadow-xl shadow-red-500/20 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                                        >
                                            {isDeleting ? (
                                                <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Đang xóa...</>
                                            ) : (
                                                <><Trash2 className="w-5 h-5" /> Xóa vĩnh viễn</>
                                            )}
                                        </motion.button>
                                        <motion.button 
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => { setShowDelete(false); setDeleteInput(''); }}
                                            className="px-8 py-4 bg-white border border-secondary-200 text-secondary-600 font-bold rounded-2xl hover:bg-secondary-50 transition-all shadow-sm flex items-center gap-2"
                                        >
                                            <X className="w-5 h-5" /> Hủy bỏ
                                        </motion.button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </motion.section>
            )}
        </motion.div>
    );
};

export default OrganizationSettings;
