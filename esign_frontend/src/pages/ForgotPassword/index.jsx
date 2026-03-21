import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, KeyRound, ChevronLeft, CheckCircle, ArrowRight } from 'lucide-react';
import { verifyMail, verifyOtp, resetPassword } from '../../service/forgotPassword'; // UNCOMMENT này khi đã có API

import { toast } from 'react-toastify';

/**
 * GHI CHÚ KẾT NỐI BACKEND (INTEGRATION NOTES):
 * 
 * 1. API Gửi OTP (Step 1):
 *    - Gọi: await verifyMail(email);
 *    - Payload: { email: "user@example.com" }
 *    - Response mong đợi: 200 OK
 * 
 * 2. API Xác thực OTP (Step 2):
 *    - Gọi: await verifyOtp({ email, otp });
 *    - Payload: { email: "user@example.com", otp: 123456 }
 *    - Backend nên nhận OTP dạng Number hoặc String tùy thiết kế.
 * 
 * 3. API Đổi mật khẩu (Step 3):
 *    - Gọi: await resetPassword({ email, otp, resetPassword: password });
 *    - Payload: { email: "...", otp: ..., resetPassword: "newPass" }
 */

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Form Data
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Step 1: Send OTP
    const handleSendOtp = async (e) => {
        e.preventDefault();
        if (!email) return toast.warning("Vui lòng nhập email!");

        setIsLoading(true);
        try {
            await verifyMail(email);
            setStep(2);
            toast.success("Mã OTP đã được gửi đến email của bạn!");
        } catch (error) {
            console.error(error);
            // Check for specific error code if backend sends one for "User not found"
            // Assuming 1004 is USER_NOT_EXISTED based on your ErrorCode enum
            if (error.response?.data?.code === 1004) {
                toast.error("Email chưa tồn tại, vui lòng đăng ký tài khoản mới!");
            } else {
                toast.error("Lỗi: " + (error.response?.data?.message || "Không tìm thấy email!"));
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Step 2: Verify OTP
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (!otp) return toast.warning("Vui lòng nhập OTP!");

        setIsLoading(true);
        try {
            await verifyOtp(email, otp);
            setStep(3);
            toast.success("Xác thực OTP thành công!");
        } catch (error) {
            console.error(error);
            toast.error("Mã OTP không chính xác hoặc đã hết hạn!");
        } finally {
            setIsLoading(false);
        }
    };

    // Step 3: Reset Password
    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!password || !confirmPassword) return toast.warning("Vui lòng nhập mật khẩu!");
        if (password !== confirmPassword) return toast.error("Mật khẩu xác nhận không khớp!");

        setIsLoading(true);
        try {
            await resetPassword(email, password, otp);
            toast.success("Đổi mật khẩu thành công! Vui lòng đăng nhập lại.");
            navigate('/login');
        } catch (error) {
            console.error(error);
            toast.error("Lỗi đổi mật khẩu: " + (error.response?.data?.message || "Có lỗi xảy ra!"));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-8">

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <KeyRound className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">Quên mật khẩu?</h2>
                    <p className="text-gray-500 mt-2">
                        {step === 1 && "Nhập email để nhận mã xác thực"}
                        {step === 2 && "Nhập mã OTP gồm 6 chữ số đã gửi tới email"}
                        {step === 3 && "Thiết lập mật khẩu mới cho tài khoản của bạn"}
                    </p>
                </div>

                {/* Form Steps */}
                <form onSubmit={
                    step === 1 ? handleSendOtp :
                        step === 2 ? handleVerifyOtp :
                            handleResetPassword
                }>

                    {/* STEP 1: EMAIL */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                        placeholder="email@example.com"
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: OTP */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Mã OTP</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-3.5 w-5 h-5 text-gray-400 font-bold tracking-widest">#</div>
                                    <input
                                        type="number"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition tracking-widest text-lg"
                                        placeholder="123456"
                                        required
                                    />
                                </div>
                                <div className="flex justify-between items-center mt-2 text-sm">
                                    <span className="text-gray-500">Không nhận được mã?</span>
                                    <button
                                        type="button"
                                        onClick={handleSendOtp}
                                        className="text-blue-600 font-semibold hover:underline"
                                    >
                                        Gửi lại
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: NEW PASSWORD */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Mật khẩu mới</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Xác nhận mật khẩu</label>
                                <div className="relative">
                                    <CheckCircle className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                            <>
                                {step === 1 && "Gửi mã xác thực"}
                                {step === 2 && "Xác thực OTP"}
                                {step === 3 && "Đổi mật khẩu"}
                                {step < 3 && <ArrowRight className="w-5 h-5" />}
                            </>
                        )}
                    </button>
                </form>

                {/* Back to Login */}
                <div className="mt-6 text-center">
                    <Link
                        to="/login"
                        className="inline-flex items-center text-sm font-semibold text-gray-500 hover:text-blue-600 transition"
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Quay lại đăng nhập
                    </Link>
                </div>

            </div>
        </div>
    );
};

export default ForgotPassword;
