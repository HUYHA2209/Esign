import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { getUserProfile, updateUserProfile } from '../../service/userApi';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Camera, Shield, Zap, Lock, FileSignature } from 'lucide-react';
import { getSignature } from '../../service/signatureApi';


const Profile = () => {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        avatar: '',
        signature: ""
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [profileRes, sigRes] = await Promise.allSettled([
                    getUserProfile(),
                    getSignature()
                ]);

                const newData = { fullName: '', email: '', phone: '', avatar: '', signature: '' };

                if (profileRes.status === 'fulfilled' && profileRes.value) {
                    const profile = profileRes.value;
                    newData.fullName = profile.name || '';
                    newData.email = profile.email || '';
                    newData.phone = profile.phone || '';
                    newData.avatar = profile.avatar || '';
                }

                if (sigRes.status === 'fulfilled' && sigRes.value?.result?.imageUrl) {
                    newData.signature = sigRes.value.result.imageUrl;
                }

                setFormData(newData);
            } catch (error) {
                console.error("Failed to fetch profile data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        if (saving) return;
        setSaving(true);
        try {
            const updated = await updateUserProfile({
                name: formData.fullName,
                phone: formData.phone
            });
            setFormData(prev => ({
                ...prev,
                fullName: updated.name || prev.fullName,
                phone: updated.phone || prev.phone
            }));
            toast.success("Cập nhật hồ sơ thành công!");
        } catch (error) {
            console.error("Failed to update profile:", error);
            toast.error("Cập nhật thất bại, vui lòng thử lại.");
        } finally {
            setSaving(false);
        }
    };

    const getInitials = (name) => {
        if (!name) return '??';
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    if (loading) return (
        <div className="flex items-center justify-center h-96">
            <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-secondary-900 font-display mb-2">Hồ sơ cá nhân</h1>
                <p className="text-secondary-500 font-medium text-base">Quản lý thông tin cá nhân và cài đặt bảo mật của bạn</p>
            </header>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Left Column - Card */}
                <div className="lg:col-span-1 space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-[32px] p-8 shadow-premium border border-secondary-100 text-center"
                    >
                        <div className="relative inline-block mb-6">
                            <div className="w-32 h-32 rounded-full premium-gradient p-1 shadow-2xl">
                                <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                                    {formData.avatar ? (
                                        <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-3xl font-bold text-primary-600 font-display">{getInitials(formData.fullName)}</span>
                                    )}
                                </div>
                            </div>
                            <button className="absolute bottom-1 right-1 w-10 h-10 bg-secondary-900 text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-primary-600 transition-colors border-2 border-white">
                                <Camera className="w-5 h-5" />
                            </button>
                        </div>

                        <h2 className="text-2xl font-bold text-secondary-900 font-display mb-1">{formData.fullName}</h2>
                        <p className="text-sm font-bold text-secondary-400 uppercase tracking-widest mb-6">{formData.email}</p>

                        <div className="flex bg-secondary-50 p-1.5 rounded-2xl mb-8">
                            <div className="flex-1 text-center py-3">
                                <div className="text-lg font-bold text-secondary-900 font-display">12</div>
                                <div className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">Đã ký</div>
                            </div>
                            <div className="w-px h-8 bg-secondary-200 self-center"></div>
                            <div className="flex-1 text-center py-3">
                                <div className="text-lg font-bold text-secondary-900 font-display">05</div>
                                <div className="text-[10px] font-bold text-secondary-400 uppercase tracking-widest">Đang chờ</div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-left">
                                <Shield className="w-5 h-5 text-emerald-600" />
                                <div>
                                    <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Tài khoản</p>
                                    <p className="text-[10px] font-bold text-emerald-600">Đã xác minh danh tính</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <div className="bg-secondary-900 rounded-[32px] p-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
                        <h3 className="text-xl font-bold font-display mb-4 relative z-10">Bảo mật nâng cao</h3>
                        <p className="text-secondary-400 text-sm mb-6 relative z-10 leading-relaxed">Nâng cấp tài khoản để sử dụng các tính năng bảo mật chuẩn quốc tế và API tích hợp.</p>
                        <button className="w-full py-3 bg-primary-600 rounded-xl font-bold text-sm shadow-lg shadow-primary-500/20 hover:bg-primary-700 transition-all relative z-10">Nâng cấp ngay</button>
                    </div>
                </div>

                {/* Right Column - Form */}
                <div className="lg:col-span-2 space-y-8">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white rounded-[32px] p-10 shadow-premium border border-secondary-100"
                    >
                        <form onSubmit={handleSave} className="space-y-8">
                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-secondary-500 uppercase tracking-widest px-1">Họ và tên</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-secondary-400 group-focus-within:text-primary-600 transition-colors">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="text"
                                            value={formData.fullName}
                                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3.5 bg-secondary-50 border border-secondary-100 rounded-2xl text-secondary-900 font-medium focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-secondary-500 uppercase tracking-widest px-1">Số điện thoại</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-secondary-400 group-focus-within:text-primary-600 transition-colors">
                                            <Phone className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3.5 bg-secondary-50 border border-secondary-100 rounded-2xl text-secondary-900 font-medium focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-secondary-500 uppercase tracking-widest px-1">Email công việc</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-secondary-400">
                                        <Mail className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        disabled
                                        className="w-full pl-12 pr-4 py-3.5 bg-secondary-50 border border-secondary-100 rounded-2xl text-secondary-400 font-medium cursor-not-allowed opacity-70"
                                    />
                                </div>
                                <p className="text-[10px] text-secondary-400 font-bold italic mt-1 px-1 flex items-center gap-1">
                                    <Lock className="w-3 h-3" /> Email không thể thay đổi sau khi xác minh
                                </p>
                            </div>

                            <div className="space-y-4 pt-4">
                                <label className="text-xs font-bold text-secondary-500 uppercase tracking-widest px-1">Chữ ký số của bạn</label>
                                <div className="w-full h-56 bg-secondary-50 rounded-[24px] border-2 border-dashed border-secondary-200 flex flex-col items-center justify-center overflow-hidden group hover:border-primary-300 transition-colors">
                                    {formData.signature ? (
                                        <img src={formData.signature} alt="Signature" className="max-h-full max-w-full object-contain p-8" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-secondary-300">
                                                <FileSignature className="w-6 h-6" />
                                            </div>
                                            <p className="text-sm font-bold text-secondary-400 uppercase tracking-wider">Chưa có chữ ký</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-8 border-t border-secondary-50 flex justify-end">
                                <motion.button
                                    whileHover={{ scale: saving ? 1 : 1.02 }}
                                    whileTap={{ scale: saving ? 1 : 0.98 }}
                                    type="submit"
                                    disabled={saving}
                                    className={`px-10 py-4 premium-gradient text-white rounded-2xl font-bold shadow-xl shadow-primary-500/30 hover:shadow-primary-500/40 transition-all flex items-center gap-2 ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {saving && (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    )}
                                    {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                                </motion.button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
