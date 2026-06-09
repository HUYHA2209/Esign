import React, { useState } from 'react';
import {
    Globe,
    Lock,
    CreditCard,
    Trash2,
    AlertTriangle,
    CheckCircle2,
    ArrowRight,
    ShieldCheck
} from 'lucide-react';
import { changePass } from '../../service/userApi';
import { toast } from 'react-toastify';
import { validateField } from '../../validators/validator';
import { motion } from 'framer-motion';

const Settings = () => {
    const [oldPass, setOldPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [errors, setErrors] = useState({});
    const [language, setLanguage] = useState('vi');

    const currentPlan = {
        name: 'Basic Plan',
        price: '0 VNĐ',
        features: ['3 tài liệu/tháng', 'Chữ ký cơ bản', 'Lưu trữ 1GB']
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();

        const rules = {
            oldPass: ['required'],
            newPass: ['required', { min: 6 }],
            confirmPass: ['required', { confirmPassword: newPass }]
        };

        const newErrors = {};
        newErrors.oldPass = validateField(oldPass, 'oldPass', rules);
        newErrors.newPass = validateField(newPass, 'newPass', rules);
        newErrors.confirmPass = validateField(confirmPass, 'confirmPass', rules);

        const activeErrors = {};
        if (newErrors.oldPass) activeErrors.oldPass = newErrors.oldPass;
        if (newErrors.newPass) activeErrors.newPass = newErrors.newPass;
        if (newErrors.confirmPass) activeErrors.confirmPass = newErrors.confirmPass;

        if (Object.keys(activeErrors).length > 0) {
            setErrors(activeErrors);
            return;
        }

        setErrors({});

        try {
            await changePass({ oldPass, newPass });
            toast.success("Đổi mật khẩu thành công!");
            setOldPass('');
            setNewPass('');
            setConfirmPass('');
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Đổi mật khẩu thất bại!");
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-10 pb-20">
            <header>
                <h1 className="text-3xl font-bold text-secondary-900 font-display mb-2">Cài đặt hệ thống</h1>
                <p className="text-secondary-500 font-medium">Tùy chỉnh trải nghiệm và quản lý bảo mật tài khoản</p>
            </header>

            <div className="grid lg:grid-cols-1 gap-8">
                {/* Language Settings */}
                <motion.section 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-[32px] shadow-premium border border-secondary-100 overflow-hidden"
                >
                    <div className="p-8 border-b border-secondary-50 flex items-center gap-5">
                        <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600">
                            <Globe className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-secondary-900 font-display">Ngôn ngữ & Vùng</h2>
                            <p className="text-sm font-medium text-secondary-400">Chọn ngôn ngữ hiển thị và định dạng vùng</p>
                        </div>
                    </div>
                    <div className="p-8">
                        <div className="max-w-md space-y-4">
                            <label className="text-xs font-bold text-secondary-500 uppercase tracking-widest px-1">Ngôn ngữ hiển thị</label>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="w-full bg-secondary-50 border border-secondary-100 text-secondary-900 font-medium text-sm rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 block p-4 appearance-none transition-all outline-none"
                            >
                                <option value="vi">Tiếng Việt (Vietnamese)</option>
                                <option value="en">English (US)</option>
                                <option value="jp">日本語 (Japanese)</option>
                            </select>
                        </div>
                    </div>
                </motion.section>

                {/* Service Plan */}
                <motion.section 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-[32px] shadow-premium border border-secondary-100 overflow-hidden"
                >
                    <div className="p-8 border-b border-secondary-50 flex items-center gap-5">
                        <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-secondary-900 font-display">Gói dịch vụ</h2>
                            <p className="text-sm font-medium text-secondary-400">Quản lý đăng ký và hạn mức sử dụng</p>
                        </div>
                    </div>
                    <div className="p-8">
                        <div className="bg-secondary-900 rounded-[32px] p-8 text-white relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-8 shadow-2xl">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/20 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                            
                            <div className="relative z-10 space-y-6">
                                <div>
                                    <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-secondary-300 border border-white/10">Gói hiện tại</span>
                                    <h3 className="text-3xl font-bold font-display mt-3">{currentPlan.name}</h3>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    {currentPlan.features.map((feature, idx) => (
                                        <div key={idx} className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/5 backdrop-blur-sm">
                                            <CheckCircle2 className="w-4 h-4 text-primary-400" />
                                            <span className="text-sm font-medium text-secondary-200">{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="relative z-10 px-8 py-4 bg-white text-secondary-900 rounded-2xl font-bold shadow-xl hover:bg-secondary-50 transition-all flex items-center gap-3 group"
                            >
                                Nâng cấp lên Pro
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </motion.button>
                        </div>
                    </div>
                </motion.section>

                {/* Security (Change Password) */}
                <motion.section 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-[32px] shadow-premium border border-secondary-100 overflow-hidden"
                >
                    <div className="p-8 border-b border-secondary-50 flex items-center gap-5">
                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                            <Lock className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-secondary-900 font-display">Bảo mật & Mật khẩu</h2>
                            <p className="text-sm font-medium text-secondary-400">Cập nhật thông tin đăng nhập định kỳ</p>
                        </div>
                    </div>
                    <div className="p-8">
                        <form className="max-w-2xl space-y-6" onSubmit={handleChangePassword}>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-secondary-500 uppercase tracking-widest px-1">Mật khẩu hiện tại</label>
                                    <input
                                        type="password"
                                        value={oldPass}
                                        onChange={(e) => {
                                            setOldPass(e.target.value);
                                            if (errors.oldPass) setErrors({ ...errors, oldPass: '' });
                                        }}
                                        className={`w-full bg-secondary-50 border rounded-2xl p-4 font-medium outline-none transition-all ${errors.oldPass ? 'border-red-500 focus:ring-4 focus:ring-red-500/10' : 'border-secondary-100 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500'}`}
                                        placeholder="••••••••"
                                    />
                                    {errors.oldPass && <p className="text-[10px] font-bold text-red-500 px-1 uppercase tracking-wider">{errors.oldPass}</p>}
                                </div>
                                <div className="hidden md:block"></div>
                                
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-secondary-500 uppercase tracking-widest px-1">Mật khẩu mới</label>
                                    <input
                                        type="password"
                                        value={newPass}
                                        onChange={(e) => {
                                            setNewPass(e.target.value);
                                            if (errors.newPass) setErrors({ ...errors, newPass: '' });
                                        }}
                                        className={`w-full bg-secondary-50 border rounded-2xl p-4 font-medium outline-none transition-all ${errors.newPass ? 'border-red-500 focus:ring-4 focus:ring-red-500/10' : 'border-secondary-100 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500'}`}
                                        placeholder="••••••••"
                                    />
                                    {errors.newPass && <p className="text-[10px] font-bold text-red-500 px-1 uppercase tracking-wider">{errors.newPass}</p>}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-secondary-500 uppercase tracking-widest px-1">Xác nhận mật khẩu mới</label>
                                    <input
                                        type="password"
                                        value={confirmPass}
                                        onChange={(e) => {
                                            setConfirmPass(e.target.value);
                                            if (errors.confirmPass) setErrors({ ...errors, confirmPass: '' });
                                        }}
                                        className={`w-full bg-secondary-50 border rounded-2xl p-4 font-medium outline-none transition-all ${errors.confirmPass ? 'border-red-500 focus:ring-4 focus:ring-red-500/10' : 'border-secondary-100 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500'}`}
                                        placeholder="••••••••"
                                    />
                                    {errors.confirmPass && <p className="text-[10px] font-bold text-red-500 px-1 uppercase tracking-wider">{errors.confirmPass}</p>}
                                </div>
                            </div>
                            
                            <div className="pt-4 flex justify-end">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    className="px-8 py-4 premium-gradient text-white rounded-2xl font-bold shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 transition-all flex items-center gap-2"
                                >
                                    Cập nhật mật khẩu
                                </motion.button>
                            </div>
                        </form>
                    </div>
                </motion.section>

                {/* Danger Zone */}
                <motion.section 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-red-50/30 rounded-[32px] border border-red-100 overflow-hidden"
                >
                    <div className="p-8 border-b border-red-100 flex items-center gap-5 bg-red-50/50">
                        <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-red-700 font-display">Vùng nguy hiểm</h2>
                            <p className="text-sm font-medium text-red-500">Các hành động không thể hoàn tác</p>
                        </div>
                    </div>
                    <div className="p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div>
                            <h3 className="font-bold text-secondary-900 mb-1">Xóa tài khoản vĩnh viễn</h3>
                            <p className="text-sm font-medium text-secondary-500 max-w-lg leading-relaxed">
                                Mọi dữ liệu, tài liệu đã ký và thông tin hồ sơ của bạn sẽ bị xóa hoàn toàn khỏi hệ thống. Hành động này không thể phục hồi.
                            </p>
                        </div>
                        <button className="px-6 py-3 bg-white border border-red-200 text-red-600 hover:bg-red-600 hover:text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm">
                            Xóa tài khoản
                        </button>
                    </div>
                </motion.section>
            </div>
        </div>
    );
};

export default Settings;
