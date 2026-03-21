import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, FileCheck, Phone, User, ShieldCheck, RefreshCw } from 'lucide-react';
import { validateField } from '../../validators/validator';
import { registerUser, verifyEmail, resendOtp } from '../../service/userApi';
import { toast } from 'react-toastify';

function Register() {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [errors, setErrors] = useState({});
    const [confirmPassword, setConfirmPassword] = useState('');

    // OTP verification state
    const [step, setStep] = useState(1); // 1 = form đăng ký, 2 = nhập OTP
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

    useEffect
        (() => {
            if (!confirmPassword) return;
            const errors = validateField(confirmPassword, "confirmPassword", filedError);
            setErrors(prev => ({ ...prev, confirmPassword: errors }));
        }, [password, confirmPassword]);

    // Countdown timer cho nút gửi lại OTP
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

    // ===== BƯỚC 1: Đăng ký =====
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
            setStep(2); // Chuyển sang bước nhập OTP
            setCountdown(60); // Bắt đầu countdown 60 giây
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

    // ===== BƯỚC 2: Xác minh OTP =====
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

    // ===== Gửi lại OTP =====
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

    // ===== RENDER BƯỚC 2: Form nhập OTP =====
    const renderOtpStep = () => (
        <div className="p-12 flex flex-col justify-center">
            <div className="max-w-md w-full mx-auto">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                        <ShieldCheck className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-3xl font-bold text-gray-800 mb-2">Xác minh Email</h3>
                    <p className="text-gray-600">
                        Chúng tôi đã gửi mã OTP 6 số đến
                    </p>
                    <p className="font-semibold text-blue-600 mt-1">{email}</p>
                </div>

                <div className="space-y-6">
                    {/* OTP Input */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Mã OTP</label>
                        <input
                            type="text"
                            maxLength={6}
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="Nhập mã 6 số"
                            className="w-full text-center text-2xl tracking-[0.5em] px-4 py-4 border-2 border-gray-300 rounded-xl focus:border-blue-600 focus:outline-none transition font-mono"
                            autoFocus
                        />
                        <p className="text-sm text-gray-500 mt-2">
                            Mã OTP có hiệu lực trong 5 phút
                        </p>
                    </div>

                    {/* Verify Button */}
                    <button
                        onClick={handleVerifyOtp}
                        disabled={isVerifying || otp.length !== 6}
                        className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-3 rounded-xl hover:from-green-600 hover:to-green-700 transform hover:scale-105 transition duration-200 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isVerifying ? 'Đang xác minh...' : 'Xác minh Email'}
                    </button>

                    {/* Resend OTP */}
                    <div className="text-center">
                        <p className="text-sm text-gray-600 mb-2">Chưa nhận được mã?</p>
                        <button
                            onClick={handleResendOtp}
                            disabled={countdown > 0}
                            className={`inline-flex items-center gap-2 text-sm font-semibold ${countdown > 0
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-blue-600 hover:text-blue-800 cursor-pointer'
                                }`}
                        >
                            <RefreshCw className="w-4 h-4" />
                            {countdown > 0
                                ? `Gửi lại sau ${countdown}s`
                                : 'Gửi lại mã OTP'
                            }
                        </button>
                    </div>

                    {/* Back to register */}
                    <p className="text-center text-sm text-gray-600 mt-4">
                        <button
                            onClick={() => { setStep(1); setOtp(''); }}
                            className="font-semibold text-blue-600 hover:text-blue-800"
                        >
                            ← Quay lại đăng ký
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );

    // ===== RENDER BƯỚC 1: Form đăng ký =====
    const renderRegisterForm = () => (
        <div className="p-12 flex flex-col justify-center">
            <div className="max-w-md w-full mx-auto">
                <h3 className="text-3xl font-bold text-gray-800 mb-2">Đăng kí</h3>
                <p className="text-gray-600 mb-8">Nhập thông tin tài khoản của bạn</p>

                <div className="space-y-6">
                    {/* Full Name Input */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Họ và tên</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <User className="w-5 h-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                name="fullName"
                                value={fullName}
                                onChange={(e) => { setFullName(e.target.value) }}
                                onBlur={handleBlur}
                                onFocus={handleFcus}
                                placeholder="EX: Nguyễn Văn A"
                                className={`w-full pl-12 pr-4 py-3 border-2 ${errors.fullName ? "border-red-500" : "border-gray-300"} rounded-xl focus:border-blue-600 focus:outline-none transition`}
                            />
                        </div>
                        {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
                    </div>
                    {/* Phone Number Input */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Số điện thoại</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Phone className="w-5 h-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                name="phone"
                                value={phone}
                                onChange={(e) => { setPhone(e.target.value) }}
                                onBlur={handleBlur}
                                onFocus={handleFcus}
                                placeholder="EX: 0123456789"
                                className={`w-full pl-12 pr-4 py-3 border-2 ${errors.phone ? "border-red-500" : " border-gray-300"} rounded-xl focus:border-blue-600 focus:outline-none transition`}
                            />
                        </div>
                        {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                    </div>
                    {/* Email Input */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Mail className="w-5 h-5 text-gray-400" />
                            </div>
                            <input
                                type="email"
                                name="email"
                                placeholder="email@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onBlur={handleBlur}
                                onFocus={handleFcus}
                                className={`w-full pl-12 pr-4 py-3 border-2 ${errors.email ? "border-red-500" : " border-gray-300"} rounded-xl focus:border-blue-600 focus:outline-none transition`}
                            />
                        </div>
                        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                    </div>
                    {/* Password Input */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Mật khẩu</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="w-5 h-5 text-gray-400" />
                            </div>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onBlur={handleBlur}
                                onFocus={handleFcus}
                                className={`w-full pl-12 pr-4 py-3 border-2 ${errors.password ? "border-red-500" : " border-gray-300"} rounded-xl focus:border-blue-600 focus:outline-none transition`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center"
                            >
                                {showPassword ? (
                                    <EyeOff className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                                ) : (
                                    <Eye className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                                )}
                            </button>
                        </div>
                        {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                        {!errors.password && password && (
                            <p className="text-xs text-gray-400 mt-1">Yêu cầu: 8+ ký tự, chữ hoa, chữ thường, chữ số</p>
                        )}
                    </div>

                    {/* Confirm Password Input */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Xác nhận mật khẩu</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="w-5 h-5 text-gray-400" />
                            </div>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                name='confirmPassword'
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                onBlur={handleBlur}
                                onFocus={handleFcus}
                                className={`w-full pl-12 pr-4 py-3 border-2 ${errors.confirmPassword ? "border-red-500" : " border-gray-300"} rounded-xl focus:border-blue-600 focus:outline-none transition`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center"
                            >
                                {showPassword ? (
                                    <EyeOff className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                                ) : (
                                    <Eye className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                                )}
                            </button>
                        </div>
                        {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
                    </div>

                    {/* Register Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-600 text-white font-bold py-3 rounded-xl hover:from-blue-700 hover:to-blue-700 transform hover:scale-105 transition duration-200 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                    >
                        {isLoading ? 'Đang xử lý...' : 'Đăng kí'}
                    </button>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-white text-gray-500">Hoặc đăng nhập với</span>
                        </div>
                    </div>

                    {/* Social Login */}
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            type="button"
                            className="flex items-center justify-center gap-2 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            <span className="text-sm font-semibold text-gray-700">Google</span>
                        </button>

                        <button
                            type="button"
                            className="flex items-center justify-center gap-2 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                            <span className="text-sm font-semibold text-gray-700">Facebook</span>
                        </button>
                    </div>
                    {/* Login Link */}
                    <p className="text-center text-sm text-gray-600 mt-6">
                        Bạn đã có tài khoản?
                        <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-800 ml-1">Đăng nhập ngay</Link>
                    </p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 flex items-center justify-center p-4" id='form1'>
            <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden">
                <div className="grid md:grid-cols-2">

                    {/* Left Side - Branding */}
                    <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-12 text-white flex flex-col justify-center items-center text-center relative overflow-hidden">
                        {/* Decorative circles */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full -ml-24 -mb-24"></div>

                        <div className="relative z-10">
                            {/* Logo */}
                            <div className="flex items-center justify-center gap-3 mb-6">
                                <FileCheck className="w-12 h-12" />
                                <span className="text-3xl font-bold">E-SIGNATURE</span>
                            </div>

                            <h2 className="text-4xl font-bold mb-4">
                                {step === 1 ? 'Chào mừng trở lại!' : 'Xác minh danh tính'}
                            </h2>
                            <p className="text-lg opacity-90 mb-8">
                                {step === 1
                                    ? 'Đăng ký để quản lý chữ ký điện tử của bạn'
                                    : 'Chỉ còn 1 bước nữa để hoàn tất đăng ký'
                                }
                            </p>

                            {/* Features */}
                            <div className="space-y-4 text-left">
                                <div className="flex items-center gap-3">
                                    <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                                    </svg>
                                    <span>Bảo mật tuyệt đối với mã hóa 256-bit</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                                    </svg>
                                    <span>Ký tài liệu mọi lúc, mọi nơi</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                                    </svg>
                                    <span>Xác minh email đảm bảo danh tính</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side - Form (Step 1 hoặc Step 2) */}
                    {step === 1 ? renderRegisterForm() : renderOtpStep()}

                </div>
            </div>
        </div>
    );
}

export default Register;