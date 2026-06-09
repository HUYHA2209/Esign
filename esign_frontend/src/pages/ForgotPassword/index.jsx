import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, KeyRound, ChevronLeft, CheckCircle, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { verifyMail, verifyOtp, resetPassword } from '../../service/forgotPassword'; 
import { motion, AnimatePresence } from 'framer-motion';
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
        if (e) e.preventDefault();
        if (!email) return toast.warning("Vui lòng nhập email!");

        setIsLoading(true);
        try {
            await verifyMail(email);
            setStep(2);
            toast.success("Mã OTP đã được gửi đến email của bạn!");
        } catch (error) {
            console.error(error);
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
        <div className="min-h-screen bg-secondary-900 relative flex items-center justify-center p-6 overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-600/20 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary-900/30 rounded-full blur-[120px]"></div>
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="glass-card rounded-[40px] p-10 border border-white/10 shadow-2xl relative overflow-hidden">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <motion.div 
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-20 h-20 premium-gradient rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary-500/20"
                        >
                            <KeyRound className="w-10 h-10 text-white" />
                        </motion.div>
                        <h2 className="text-3xl font-bold text-white font-display mb-3">Quên mật khẩu?</h2>
                        <p className="text-secondary-400 font-medium text-sm leading-relaxed">
                            {step === 1 && "Nhập email của bạn để nhận mã xác thực OTP khôi phục tài khoản"}
                            {step === 2 && "Vui lòng nhập mã OTP 6 chữ số đã được gửi tới email của bạn"}
                            {step === 3 && "Thiết lập mật khẩu mới và an toàn cho tài khoản của bạn"}
                        </p>
                    </div>

                    <form onSubmit={
                        step === 1 ? handleSendOtp :
                            step === 2 ? handleVerifyOtp :
                                handleResetPassword
                    }>
                        <AnimatePresence mode="wait">
                            {/* STEP 1: EMAIL */}
                            {step === 1 && (
                                <motion.div 
                                    key="step1"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-secondary-400 uppercase tracking-[0.2em] px-1">Email tài khoản</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-secondary-500 group-focus-within:text-primary-400 transition-colors">
                                                <Mail className="w-5 h-5" />
                                            </div>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-secondary-600 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all"
                                                placeholder="example@email.com"
                                                required
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* STEP 2: OTP */}
                            {step === 2 && (
                                <motion.div 
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-bold text-secondary-400 uppercase tracking-[0.2em] px-1 block text-center">Mã xác thực OTP</label>
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                maxLength="6"
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                                className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl text-white text-center text-3xl font-bold tracking-[0.5em] focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all"
                                                placeholder="••••••"
                                                required
                                            />
                                        </div>
                                        <div className="flex justify-center items-center gap-2 text-sm">
                                            <span className="text-secondary-500">Không nhận được mã?</span>
                                            <button
                                                type="button"
                                                disabled={isLoading}
                                                onClick={handleSendOtp}
                                                className="text-primary-400 font-bold hover:text-primary-300 transition-colors flex items-center gap-1"
                                            >
                                                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                                                Gửi lại
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* STEP 3: NEW PASSWORD */}
                            {step === 3 && (
                                <motion.div 
                                    key="step3"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-secondary-400 uppercase tracking-[0.2em] px-1">Mật khẩu mới</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-secondary-500 group-focus-within:text-primary-400 transition-colors">
                                                    <Lock className="w-5 h-5" />
                                                </div>
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-secondary-600 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all"
                                                    placeholder="••••••••"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary-500 hover:text-white transition-colors"
                                                >
                                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-secondary-400 uppercase tracking-[0.2em] px-1">Xác nhận mật khẩu</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-secondary-500 group-focus-within:text-primary-400 transition-colors">
                                                    <ShieldCheck className="w-5 h-5" />
                                                </div>
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-secondary-600 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all"
                                                    placeholder="••••••••"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Submit Button */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={isLoading}
                            className="w-full mt-10 premium-gradient text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary-600/20 hover:shadow-primary-600/30 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <span className="uppercase tracking-widest text-xs">
                                        {step === 1 && "Gửi mã xác thực"}
                                        {step === 2 && "Xác thực OTP"}
                                        {step === 3 && "Đổi mật khẩu"}
                                    </span>
                                    {step < 3 && <ArrowRight className="w-5 h-5" />}
                                </>
                            )}
                        </motion.button>
                    </form>

                    {/* Footer Actions */}
                    <div className="mt-10 flex flex-col items-center gap-4">
                        <Link
                            to="/login"
                            className="inline-flex items-center text-sm font-bold text-secondary-400 hover:text-primary-400 transition-colors group"
                        >
                            <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                            Quay lại đăng nhập
                        </Link>
                    </div>
                </div>

                {/* Bottom Decorative Label */}
                <p className="text-center mt-8 text-secondary-600 text-[10px] font-bold uppercase tracking-[0.3em]">
                    E-Sign Secure Recovery System
                </p>
            </motion.div>
        </div>
    );
};

export default ForgotPassword;
