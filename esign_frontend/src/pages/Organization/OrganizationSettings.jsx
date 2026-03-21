import React, { useState, useRef } from 'react';
import {
    Building2, Users, Globe, CreditCard, AlertTriangle, Trash2,
    Upload, Mail, UserPlus, MoreVertical, Crown, Shield, UserMinus, X
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

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
    const [members, setMembers] = useState([
        { id: 1, name: 'Nguyễn Văn A', email: 'nguyenvana@example.com', role: 'owner', avatar: 'NV', color: 'from-indigo-400 to-purple-500' },
        { id: 2, name: 'Trần Thị B', email: 'tranthib@example.com', role: 'admin', avatar: 'TB', color: 'from-emerald-400 to-teal-500' },
        { id: 3, name: 'Lê Văn C', email: 'levanc@example.com', role: 'member', avatar: 'LC', color: 'from-amber-400 to-orange-500' },
    ]);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('member');
    const [openMenu, setOpenMenu] = useState(null);

    // Delete
    const [deleteInput, setDeleteInput] = useState('');
    const [showDelete, setShowDelete] = useState(false);

    const currentPlan = { name: 'Basic Plan', features: ['3 tài liệu/tháng', 'Chữ ký cơ bản', 'Lưu trữ 1GB'] };

    const roleInfo = {
        owner:  { label: 'Chủ sở hữu', cls: 'bg-amber-50 text-amber-600' },
        admin:  { label: 'Quản trị viên', cls: 'bg-indigo-50 text-indigo-600' },
        member: { label: 'Thành viên', cls: 'bg-slate-100 text-slate-500' },
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

    const handleInvite = (e) => {
        e.preventDefault();
        if (!inviteEmail.trim()) { toast.error('Nhập email thành viên!'); return; }
        toast.success(`Đã gửi lời mời đến ${inviteEmail}`);
        setInviteEmail('');
    };

    const handleRemove = (id) => { setMembers(p => p.filter(m => m.id !== id)); setOpenMenu(null); toast.success('Đã xóa thành viên!'); };
    const handleRole = (id, role) => { setMembers(p => p.map(m => m.id === id ? { ...m, role } : m)); setOpenMenu(null); };
    const handleDeleteOrg = () => {
        if (deleteInput !== orgName) { toast.error('Tên tổ chức không khớp!'); return; }
        toast.success('Đã xóa tổ chức!');
        navigate('/dashboard');
    };

    return (
        <div className="space-y-6 max-w-3xl">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Cài đặt tổ chức</h1>
                <p className="text-sm text-slate-400 mt-1">Quản lý thông tin và thành viên</p>
            </div>

            {/* 1 - Profile */}
            <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
                    <div className="p-2 bg-orange-50 rounded-lg"><Building2 className="w-4 h-4 text-orange-500" /></div>
                    <div>
                        <h2 className="text-sm font-semibold text-slate-800">Hồ sơ tổ chức</h2>
                        <p className="text-xs text-slate-400">Ảnh đại diện, tên và URL</p>
                    </div>
                </div>
                <form onSubmit={handleSaveProfile} className="p-6 space-y-5">
                    {/* Avatar */}
                    <div className="flex items-center gap-5">
                        <div className="relative">
                            {avatarPreview
                                ? <img src={avatarPreview} alt="org" className="w-16 h-16 rounded-2xl object-cover ring-4 ring-orange-100" />
                                : <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold text-2xl ring-4 ring-orange-100">{orgName.charAt(0)}</div>
                            }
                            <button type="button" onClick={() => fileRef.current?.click()}
                                className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center hover:bg-slate-50 shadow-sm">
                                <Upload className="w-3 h-3 text-slate-500" />
                            </button>
                            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-700">Ảnh đại diện</p>
                            <p className="text-xs text-slate-400 mt-0.5">PNG, JPG tối đa 2MB</p>
                            <button type="button" onClick={() => fileRef.current?.click()} className="text-xs text-indigo-600 mt-1 hover:underline">Thay đổi</button>
                        </div>
                    </div>

                    {/* Name & URL */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1.5">Tên tổ chức *</label>
                            <input value={orgName} onChange={e => setOrgName(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 focus:outline-none"
                                placeholder="Tên công ty..." />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1.5">URL tổ chức *</label>
                            <div className="flex rounded-xl overflow-hidden border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-300 focus-within:border-indigo-400">
                                <span className="bg-slate-100 px-3 flex items-center text-slate-400 text-xs border-r border-slate-200">/o/</span>
                                <input value={orgSlug}
                                    onChange={e => setOrgSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
                                    className="flex-1 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:outline-none"
                                    placeholder="ten-to-chuc" />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">digisign.app/o/{orgSlug}</p>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button type="submit"
                            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200">
                            Lưu thay đổi
                        </button>
                    </div>
                </form>
            </section>

            {/* 2 - Members */}
            <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
                    <div className="p-2 bg-indigo-50 rounded-lg"><Users className="w-4 h-4 text-indigo-500" /></div>
                    <div>
                        <h2 className="text-sm font-semibold text-slate-800">Quản lý thành viên</h2>
                        <p className="text-xs text-slate-400">Mời và phân quyền thành viên</p>
                    </div>
                </div>
                <div className="p-6 space-y-5">
                    {/* Invite */}
                    <form onSubmit={handleInvite} className="flex gap-2">
                        <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 focus-within:ring-2 focus-within:ring-indigo-300 focus-within:border-indigo-400">
                            <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                                placeholder="email@example.com"
                                className="flex-1 bg-transparent px-2.5 py-2.5 text-sm text-slate-800 focus:outline-none placeholder-slate-400" />
                        </div>
                        <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-300 focus:outline-none">
                            <option value="member">Thành viên</option>
                            <option value="admin">Quản trị viên</option>
                        </select>
                        <button type="submit"
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors">
                            <UserPlus className="w-4 h-4" /> Mời
                        </button>
                    </form>

                    {/* List */}
                    <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-50">
                        {members.map(m => (
                            <div key={m.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${m.color} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>{m.avatar}</div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800 truncate">{m.name}</p>
                                    <p className="text-xs text-slate-400 truncate">{m.email}</p>
                                </div>
                                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${roleInfo[m.role].cls}`}>{roleInfo[m.role].label}</span>
                                {m.role !== 'owner' && (
                                    <div className="relative">
                                        <button onClick={() => setOpenMenu(openMenu === m.id ? null : m.id)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 transition-colors">
                                            <MoreVertical className="w-4 h-4" />
                                        </button>
                                        {openMenu === m.id && (
                                            <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-100 z-10 py-1 overflow-hidden">
                                                {m.role !== 'admin' && (
                                                    <button onClick={() => handleRole(m.id, 'admin')}
                                                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
                                                        <Shield className="w-4 h-4 text-indigo-400" /> Đặt làm Admin
                                                    </button>
                                                )}
                                                {m.role !== 'member' && (
                                                    <button onClick={() => handleRole(m.id, 'member')}
                                                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
                                                        <Users className="w-4 h-4 text-slate-400" /> Đặt làm Thành viên
                                                    </button>
                                                )}
                                                <div className="border-t border-slate-100 my-1" />
                                                <button onClick={() => handleRemove(m.id)}
                                                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-500 hover:bg-red-50">
                                                    <UserMinus className="w-4 h-4" /> Xóa khỏi tổ chức
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 3 - Language */}
            <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
                    <div className="p-2 bg-sky-50 rounded-lg"><Globe className="w-4 h-4 text-sky-500" /></div>
                    <div>
                        <h2 className="text-sm font-semibold text-slate-800">Ngôn ngữ &amp; Vùng</h2>
                        <p className="text-xs text-slate-400">Ngôn ngữ hiển thị</p>
                    </div>
                </div>
                <div className="p-6">
                    <div className="max-w-xs">
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Ngôn ngữ</label>
                        <select value={language} onChange={e => setLanguage(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-300 focus:outline-none">
                            <option value="vi">Tiếng Việt</option>
                            <option value="en">English (US)</option>
                            <option value="jp">日本語</option>
                        </select>
                    </div>
                </div>
            </section>

            {/* 4 - Plan */}
            <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
                    <div className="p-2 bg-purple-50 rounded-lg"><CreditCard className="w-4 h-4 text-purple-500" /></div>
                    <div>
                        <h2 className="text-sm font-semibold text-slate-800">Gói dịch vụ</h2>
                        <p className="text-xs text-slate-400">Gói hiện tại của tổ chức</p>
                    </div>
                </div>
                <div className="p-6">
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-5 text-white flex justify-between items-center gap-4">
                        <div>
                            <p className="text-white/70 text-xs mb-1">Gói hiện tại</p>
                            <p className="text-xl font-bold mb-2">{currentPlan.name}</p>
                            <div className="flex flex-wrap gap-2">
                                {currentPlan.features.map((f, i) => (
                                    <span key={i} className="bg-white/20 text-xs px-2 py-0.5 rounded-full">{f}</span>
                                ))}
                            </div>
                        </div>
                        <button className="flex-shrink-0 bg-white text-indigo-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-100 transition-colors shadow">
                            Nâng cấp PRO
                        </button>
                    </div>
                </div>
            </section>

            {/* 5 - Danger */}
            <section className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-red-100 bg-red-50/60">
                    <div className="p-2 bg-red-100 rounded-lg"><AlertTriangle className="w-4 h-4 text-red-500" /></div>
                    <div>
                        <h2 className="text-sm font-semibold text-red-700">Vùng nguy hiểm</h2>
                        <p className="text-xs text-red-400">Hành động không thể hoàn tác</p>
                    </div>
                </div>
                <div className="p-6">
                    {!showDelete ? (
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-medium text-slate-800">Xóa tổ chức vĩnh viễn</p>
                                <p className="text-xs text-slate-400 mt-0.5">Toàn bộ dữ liệu, tài liệu và thành viên bị xóa hoàn toàn.</p>
                            </div>
                            <button onClick={() => setShowDelete(true)}
                                className="flex items-center gap-2 border border-red-300 text-red-600 bg-white hover:bg-red-50 px-4 py-2 rounded-xl text-sm font-medium transition-colors flex-shrink-0">
                                <Trash2 className="w-4 h-4" /> Xóa tổ chức
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                                <p className="text-sm text-red-600">⚠️ Nhập tên tổ chức <strong>"{orgName}"</strong> để xác nhận xóa:</p>
                            </div>
                            <input value={deleteInput} onChange={e => setDeleteInput(e.target.value)}
                                className="w-full max-w-sm bg-white border border-red-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-red-300 focus:outline-none"
                                placeholder={orgName} />
                            <div className="flex gap-3">
                                <button onClick={handleDeleteOrg} disabled={deleteInput !== orgName}
                                    className="flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                    <Trash2 className="w-4 h-4" /> Xóa vĩnh viễn
                                </button>
                                <button onClick={() => { setShowDelete(false); setDeleteInput(''); }}
                                    className="flex items-center gap-2 border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
                                    <X className="w-4 h-4" /> Hủy
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default OrganizationSettings;
