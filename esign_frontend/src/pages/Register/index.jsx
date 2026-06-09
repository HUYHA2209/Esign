import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, FileCheck, Phone, User, ShieldCheck, RefreshCw, Shield, Zap, Globe } from 'lucide-react';
import { validateField } from '../../validators/validator';
import { registerUser, verifyEmail, resendOtp } from '../../service/userApi';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';

const authVariants = {
    initial: { opacity: 0, scale: 0.9, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 1.1, y: -20 }
};

function Register() {
    const navigate = useNavigate();
    const location = useLocation();
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [errors, setErrors] = useState({});
    const [confirmPassword, setConfirmPassword] = useState('');

    const [step, setStep] = useState(1); 
    const [otp, setOtp] = useState('');
    const [countdown, setCountdown] = useState(0);
    const [isVerifying, setIsVerifying] = useState(false);

    const filedError = {
        email: ["required", "email", "emailDomain"],
        password: ["required", "strongPassword"],
        confirmPassword: ["required", { confirmPassword: password }],
        phone: ["required", "phone"],
        fullName: ["required"]
    };

    useEffect(() => {
        if (!confirmPassword) return;
        const errors = validateField(confirmPassword, "confirmPassword", filedError);
        setErrors(prev => ({ ...prev, confirmPassword: errors }));
    }, [password, confirmPassword]);

    useEffect(() => {
        if (location.state && location.state.step === 2 && location.state.email) {
            setStep(2);
            setEmail(location.state.email);
            setCountdown(60);
        }
    }, [location.state]);

    useEffect(() => {
        if (countdown <= 0) return;
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown]);

    const handleBlur = (e) => {
        const { name, value } = e.target;
        const errors = validateField(value, name, filedError);
        setErrors(prev => ({ ...prev, [name]: errors }));
    }

    const handleFcus = (e) => {
        const { name } = e.target;
        setErrors(prev => ({ ...prev, [name]: "" }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const fullNameError = validateField(fullName, 'fullName', filedError);
        const phoneError = validateField(phone, 'phone', filedError);
        const emailError = validateField(email, 'email', filedError);
        const passwordError = validateField(password, 'password', filedError);
        const confirmPasswordError = validateField(confirmPassword, 'confirmPassword', filedError);

        if (fullNameError || phoneError || emailError || passwordError || confirmPasswordError) {
            setErrors({
                fullName: fullNameError,
                phone: phoneError,
                email: emailError,
                password: passwordError,
                confirmPassword: confirmPasswordError
            });
            return;
        }

        setIsLoading(true);
        const userData = { email, password, fullName, phone };

        try {
            await registerUser(userData);
            toast.success("Đăng ký thành công! Vui lòng kiểm tra email để lấy mã OTP.");
            setStep(2);
            setCountdown(60);
        } catch (error) {
            console.error("Lỗi đăng ký:", error);
            const code = error.response?.data?.code;
            const message = error.response?.data?.message || error.message || "Vui lòng thử lại.";

            if (code === 1001) {
                toast.error("Email đã tồn tại. Vui lòng dùng email khác.");
            } else if (code === 1010) {
                toast.error("Email domain không hợp lệ hoặc là email tạm thời.");
            } else if (code === 1011) {
                toast.error("Bạn đã thử quá nhiều lần. Vui lòng đợi và thử lại sau.");
            } else {
                toast.error("Đăng ký thất bại: " + message);
            }
        } finally {
            setIsLoading(false);
        }
    }

    const handleVerifyOtp = async () => {
        if (!otp.trim() || otp.length !== 6) {
            toast.warning("Vui lòng nhập mã OTP 6 số!");
            return;
        }

        setIsVerifying(true);
        try {
            const data = await verifyEmail(email, parseInt(otp));
            if (data && data.result?.token) {
                sessionStorage.setItem("token", data.result.token);
                toast.success("Xác minh email thành công!");
                navigate("/dashboard");
            }
        } catch (error) {
            const code = error.response?.data?.code;
            if (code === 1013) {
                toast.error("Mã OTP không chính xác. Vui lòng thử lại.");
            } else if (code === 1011) {
                toast.error("Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau.");
            } else {
                toast.error("Xác minh thất bại. Vui lòng thử lại.");
            }
        } finally {
            setIsVerifying(false);
        }
    }

    const handleResendOtp = async () => {
        if (countdown > 0) return;

        try {
            await resendOtp(email);
            toast.success("Đã gửi lại mã OTP đến email của bạn!");
            setCountdown(60);
            setOtp('');
        } catch (error) {
            const code = error.response?.data?.code;
            if (code === 1011) {
                toast.error("Bạn đã gửi lại OTP quá nhiều lần. Vui lòng đợi 5 phút.");
            } else {
                toast.error("Không thể gửi lại OTP. Vui lòng thử lại.");
            }
        }
    }

    const renderOtpStep = () => (
        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-8 md:p-12 flex flex-col justify-center"
        >
            <div className="max-w-md w-full mx-auto text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-50 rounded-2xl mb-6 shadow-sm">
                    <ShieldCheck className="w-10 h-10 text-primary-600" />
                </div>
                <h3 className="text-3xl font-bold text-secondary-900 font-display mb-2">Xác minh Email</h3>
                <p className="text-secondary-500 font-medium mb-1">Chúng tôi đã gửi mã OTP 6 số đến</p>
                <p className="font-bold text-primary-600 mb-8">{email}</p>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-secondary-700 mb-4 text-left px-1">Mã OTP</label>
                        <div className="flex justify-center gap-2">
                            <input
                                type="text"
                                maxLength={6}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                                placeholder="000000"
                                className="w-full text-center text-3xl tracking-[0.5em] py-5 bg-secondary-50 border-2 border-secondary-200 rounded-2xl focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all duration-300 font-mono font-bold"
                                autoFocus
                            />
                        </div>
                        <p className="text-xs text-secondary-400 mt-4 font-medium italic">
                            Mã OTP có hiệu lực trong 5 phút
                        </p>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleVerifyOtp}
                        disabled={isVerifying || otp.length !== 6}
                        className="w-full premium-gradient text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary-500/30 hover:shadow-primary-500/40 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isVerifying ? 'Đang xác minh...' : 'Xác minh tài khoản'}
                    </motion.button>

                    <div className="pt-4">
                        <p className="text-sm font-medium text-secondary-500 mb-2">Chưa nhận được mã?</p>
                        <button
                            onClick={handleResendOtp}
                            disabled={countdown > 0}
                            className={`inline-flex items-center gap-2 text-sm font-bold transition-colors ${countdown > 0
                                ? 'text-secondary-300 cursor-not-allowed'
                                : 'text-primary-600 hover:text-primary-700'
                                }`}
                        >
                            <RefreshCw className={`w-4 h-4 ${countdown > 0 ? '' : 'animate-spin-slow'}`} />
                            {countdown > 0
                                ? `Gửi lại sau ${countdown}s`
                                : 'Gửi lại mã OTP ngay'
                            }
                        </button>
                    </div>

                    <button
                        onClick={() => { setStep(1); setOtp(''); }}
                        className="text-sm font-bold text-secondary-500 hover:text-secondary-900 transition-colors flex items-center justify-center gap-2 mx-auto pt-4"
                    >
                        <span>← Quay lại chỉnh sửa thông tin</span>
                    </button>
                </div>
            </div>
        </motion.div>
    );

    const renderRegisterForm = () => (
        <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="p-8 md:p-12 flex flex-col justify-center"
        >
            <div className="max-w-md w-full mx-auto">
                <div className="mb-8">
                    <h3 className="text-3xl font-bold text-secondary-900 font-display mb-2">Đăng ký</h3>
                    <p className="text-secondary-500 font-medium">Bắt đầu trải nghiệm ký số chuyên nghiệp</p>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-secondary-700 mb-1.5 px-1 uppercase tracking-wider">Họ và tên</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none group-focus-within:text-primary-600 transition-colors">
                                    <User className="w-4 h-4 text-secondary-400" />
                                </div>
                                <input
                                    type="text"
                                    name="fullName"
                                    value={fullName}
                                    onChange={(e) => { setFullName(e.target.value) }}
                                    onBlur={handleBlur}
                                    onFocus={handleFcus}
                                    placeholder="Nguyễn Văn A"
                                    className={`w-full pl-10 pr-4 py-3 bg-secondary-50 border ${errors.fullName ? "border-red-500" : "border-secondary-200"} rounded-xl focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all font-medium text-sm`}
                                />
                            </div>
                            {errors.fullName && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">{errors.fullName}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-secondary-700 mb-1.5 px-1 uppercase tracking-wider">Số điện thoại</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none group-focus-within:text-primary-600 transition-colors">
                                    <Phone className="w-4 h-4 text-secondary-400" />
                                </div>
                                <input
                                    type="text"
                                    name="phone"
                                    value={phone}
                                    onChange={(e) => { setPhone(e.target.value) }}
                                    onBlur={handleBlur}
                                    onFocus={handleFcus}
                                    placeholder="0912xxx"
                                    className={`w-full pl-10 pr-4 py-3 bg-secondary-50 border ${errors.phone ? "border-red-500" : "border-secondary-200"} rounded-xl focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all font-medium text-sm`}
                                />
                            </div>
                            {errors.phone && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">{errors.phone}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-secondary-700 mb-1.5 px-1 uppercase tracking-wider">Email công việc</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none group-focus-within:text-primary-600 transition-colors">
                                <Mail className="w-4 h-4 text-secondary-400" />
                            </div>
                            <input
                                type="email"
                                name="email"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onBlur={handleBlur}
                                onFocus={handleFcus}
                                className={`w-full pl-10 pr-4 py-3 bg-secondary-50 border ${errors.email ? "border-red-500" : "border-secondary-200"} rounded-xl focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all font-medium text-sm`}
                            />
                        </div>
                        {errors.email && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">{errors.email}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-secondary-700 mb-1.5 px-1 uppercase tracking-wider">Mật khẩu</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none group-focus-within:text-primary-600 transition-colors">
                                    <Lock className="w-4 h-4 text-secondary-400" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onBlur={handleBlur}
                                    onFocus={handleFcus}
                                    className={`w-full pl-10 pr-10 py-3 bg-secondary-50 border ${errors.password ? "border-red-500" : "border-secondary-200"} rounded-xl focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all font-medium text-sm`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary-400 hover:text-secondary-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-secondary-700 mb-1.5 px-1 uppercase tracking-wider">Xác nhận</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none group-focus-within:text-primary-600 transition-colors">
                                    <Lock className="w-4 h-4 text-secondary-400" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    name='confirmPassword'
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    onBlur={handleBlur}
                                    onFocus={handleFcus}
                                    className={`w-full pl-10 pr-10 py-3 bg-secondary-50 border ${errors.confirmPassword ? "border-red-500" : "border-secondary-200"} rounded-xl focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all font-medium text-sm`}
                                />
                            </div>
                        </div>
                    </div>
                    {(errors.password || errors.confirmPassword) && (
                        <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">{errors.password || errors.confirmPassword}</p>
                    )}

                    <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="w-full premium-gradient text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary-500/30 hover:shadow-primary-500/40 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                    >
                        {isLoading ? (
                            <div className="flex items-center justify-center gap-2">
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Đang tạo tài khoản...</span>
                            </div>
                        ) : 'Tạo tài khoản miễn phí'}
                    </motion.button>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-secondary-100"></div>
                        </div>
                        <div className="relative flex justify-center text-[10px]">
                            <span className="px-4 bg-white text-secondary-400 font-bold uppercase tracking-[0.2em]">Hoặc với</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button className="flex items-center justify-center gap-2 py-2.5 border border-secondary-200 rounded-xl hover:bg-secondary-50 transition-all font-bold text-secondary-700 text-xs">
                            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-4 h-4" alt="Google" />
                            Google
                        </button>
                        <button className="flex items-center justify-center gap-2 py-2.5 border border-secondary-200 rounded-xl hover:bg-secondary-50 transition-all font-bold text-secondary-700 text-xs">
                            <img src="https://www.svgrepo.com/show/475647/facebook-color.svg" className="w-4 h-4" alt="Facebook" />
                            Facebook
                        </button>
                    </div>

                    <p className="text-center text-xs font-medium text-secondary-500 pt-6">
                        Đã có tài khoản?
                        <Link to="/login" className="font-bold text-primary-600 hover:text-primary-700 ml-1 transition-colors underline decoration-primary-600/30 underline-offset-4">Đăng nhập ngay</Link>
                    </p>
                </div>
            </div>
        </motion.div>
    );

    return (
        <div className="min-h-screen bg-secondary-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
            <div className="absolute top-0 -left-20 w-96 h-96 bg-primary-600/20 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-0 -right-20 w-96 h-96 bg-primary-900/30 rounded-full blur-[120px] pointer-events-none"></div>
            
            <motion.div 
                variants={authVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-5xl glass-card overflow-hidden grid md:grid-cols-2 relative z-10"
            >
                <div className="premium-gradient p-12 text-white flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-12">
                            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                                <FileCheck className="w-10 h-10" />
                            </div>
                            <span className="text-2xl font-bold font-display tracking-tight">DigiSign</span>
                        </div>

                        <h2 className="text-4xl font-bold font-display mb-4 leading-tight">
                            {step === 1 ? 'Bắt đầu chuyển đổi số' : 'Bảo vệ tài khoản'}
                        </h2>
                        <p className="text-lg text-primary-100 mb-12">
                            {step === 1 
                                ? 'Tham gia cùng hàng nghìn doanh nghiệp đang tối ưu quy trình ký kết mỗi ngày.'
                                : 'Xác minh email để đảm bảo an toàn tuyệt đối cho chữ ký số của bạn.'
                            }
                        </p>

                        <div className="space-y-6">
                            {[
                                { icon: Shield, text: "Bảo mật chuẩn quốc tế AES-256" },
                                { icon: Zap, text: "Ký kết tức thì, không độ trễ" },
                                { icon: Globe, text: "Tuân thủ pháp luật Việt Nam" }
                            ].map((item, index) => (
                                <div key={index} className="flex items-center gap-4 group">
                                    <div className="p-2 bg-white/10 rounded-lg group-hover:bg-white/20 transition-colors">
                                        <item.icon className="w-5 h-5 text-primary-200" />
                                    </div>
                                    <span className="text-sm font-medium text-primary-50">{item.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="text-xs text-primary-200 font-medium pt-8">
                        © 2024 DigiSign Platform. All rights reserved.
                    </div>
                </div>

                <div className="bg-white/95 backdrop-blur-xl relative">
                    <AnimatePresence mode="wait">
                        {step === 1 ? renderRegisterForm() : renderOtpStep()}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}

export default Register;
