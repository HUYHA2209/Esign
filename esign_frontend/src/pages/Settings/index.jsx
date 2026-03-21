import React, { useState } from 'react';
import {
    Globe,
    Lock,
    CreditCard,
    Trash2,
    AlertTriangle
} from 'lucide-react';
import { changePass } from '../../service/userApi';
import { toast } from 'react-toastify';
import { validateField } from '../../validators/validator';

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
        <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Cài đặt</h1>
            <p className="text-slate-500 mb-8">Quản lý tùy chọn tài khoản và bảo mật của bạn</p>

            <div className="space-y-6 max-w-4xl">
                {/* Language Settings */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                            <Globe className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Ngôn ngữ & Vùng</h2>
                            <p className="text-sm text-slate-500">Chọn ngôn ngữ hiển thị của ứng dụng</p>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="max-w-md">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Ngôn ngữ</label>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5"
                            >
                                <option value="vi">Tiếng Việt (Vietnamese)</option>
                                <option value="en">English (US)</option>
                                <option value="jp">日本語 (Japanese)</option>
                            </select>
                        </div>
                    </div>
                </section>

                {/* Service Plan */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                        <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                            <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Gói dịch vụ</h2>
                            <p className="text-sm text-slate-500">Thông tin gói hiện tại và nâng cấp</p>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-lg p-6 text-white shadow-lg flex justify-between items-center">
                            <div>
                                <div className="text-white/80 text-sm font-medium mb-1">Gói hiện tại</div>
                                <div className="text-2xl font-bold mb-2">{currentPlan.name}</div>
                                <div className="flex flex-wrap gap-2">
                                    {currentPlan.features.map((feature, idx) => (
                                        <span key={idx} className="bg-white/20 px-2 py-0.5 rounded text-xs backdrop-blur-sm">
                                            {feature}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <button className="bg-white text-indigo-600 hover:bg-slate-100 px-4 py-2 rounded-lg font-semibold text-sm transition-colors shadow-md">
                                Nâng cấp PRO
                            </button>
                        </div>
                    </div>
                </section>

                {/* Security (Change Password) */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                        <div className="p-2 bg-green-50 rounded-lg text-green-600">
                            <Lock className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Bảo mật</h2>
                            <p className="text-sm text-slate-500">Đổi mật khẩu và bảo vệ tài khoản</p>
                        </div>
                    </div>
                    <div className="p-6">
                        <form className="max-w-md space-y-4" onSubmit={handleChangePassword}>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu hiện tại</label>
                                <input
                                    type="password"
                                    value={oldPass}
                                    onChange={(e) => {
                                        setOldPass(e.target.value);
                                        if (errors.oldPass) setErrors({ ...errors, oldPass: '' });
                                    }}
                                    className={`w-full bg-slate-50 border text-slate-900 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 p-2.5 ${errors.oldPass ? 'border-red-500' : 'border-slate-300'}`}
                                    placeholder="••••••••"
                                />
                                {errors.oldPass && <p className="mt-1 text-sm text-red-500">{errors.oldPass}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu mới</label>
                                <input
                                    type="password"
                                    value={newPass}
                                    onChange={(e) => {
                                        setNewPass(e.target.value);
                                        if (errors.newPass) setErrors({ ...errors, newPass: '' });
                                    }}
                                    className={`w-full bg-slate-50 border text-slate-900 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 p-2.5 ${errors.newPass ? 'border-red-500' : 'border-slate-300'}`}
                                    placeholder="••••••••"
                                />
                                {errors.newPass && <p className="mt-1 text-sm text-red-500">{errors.newPass}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Xác nhận mật khẩu mới</label>
                                <input
                                    type="password"
                                    value={confirmPass}
                                    onChange={(e) => {
                                        setConfirmPass(e.target.value);
                                        if (errors.confirmPass) setErrors({ ...errors, confirmPass: '' });
                                    }}
                                    className={`w-full bg-slate-50 border text-slate-900 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 p-2.5 ${errors.confirmPass ? 'border-red-500' : 'border-slate-300'}`}
                                    placeholder="••••••••"
                                />
                                {errors.confirmPass && <p className="mt-1 text-sm text-red-500">{errors.confirmPass}</p>}
                            </div>
                            <button
                                type="submit"
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                            >
                                Cập nhật mật khẩu
                            </button>
                        </form>
                    </div>
                </section>

                {/* Danger Zone */}
                <section className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
                    <div className="p-6 border-b border-red-100 flex items-center gap-3 bg-red-50/50">
                        <div className="p-2 bg-red-100 rounded-lg text-red-600">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-red-700">Vùng nguy hiểm</h2>
                            <p className="text-sm text-red-500">Các hành động không thể hoàn tác</p>
                        </div>
                    </div>
                    <div className="p-6 flex items-center justify-between">
                        <div>
                            <h3 className="font-medium text-slate-900">Xóa tài khoản vĩnh viễn</h3>
                            <p className="text-sm text-slate-500 mt-1">
                                Mọi dữ liệu, tài liệu và chữ ký của bạn sẽ bị xóa hoàn toàn.
                            </p>
                        </div>
                        <button className="flex items-center gap-2 bg-white border border-red-300 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg font-medium text-sm transition-colors">
                            <Trash2 className="w-4 h-4" />
                            Xóa tài khoản
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Settings;
