import React, { useState } from 'react';
import { Link } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, FileCheck, Shield, Zap, Globe } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { loginUser } from '../../service/userApi';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';

const authVariants = {
  initial: { opacity: 0, scale: 0.9, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 1.1, y: -20 }
};

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname ? location.state.from.pathname + (location.state.from.search || '') : "/dashboard";
  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      toast.warning('Vui lòng nhập đầy đủ Email và Mật khẩu!');
      return;
    }

    setIsLoading(true);
    try {
      const data = await loginUser({ email, password });
      if (data && data.result.token) {
        sessionStorage.setItem("token", data.result.token);
        toast.success("Đăng nhập thành công!");
        navigate(from);
      } else {
        toast.error("Đăng nhập thất bại! Vui lòng kiểm tra lại thông tin.");
      }
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
      const errorCode = error.response?.data?.code;
      const errorMessage = error.response?.data?.message;

      if (errorCode === 1004) {
        toast.error("Email chưa tồn tại. Vui lòng đăng ký tài khoản mới!");
      } else if (errorCode === 1002 || errorMessage?.includes("Bad credentials")) {
        toast.error("Mật khẩu không chính xác. Vui lòng thử lại!");
      } else if (errorCode === 1009) {
        toast.warning("Email chưa được xác minh. Chúng tôi đã gửi lại mã OTP đến email của bạn.");
        navigate('/register', { state: { step: 2, email: email } });
      } else if (errorCode === 1011) {
        toast.error("Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 1 phút.");
      } else {
        toast.error(errorMessage || 'Đăng nhập thất bại, vui lòng kiểm tra lại thông tin!');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Orbs */}
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
        {/* Left Side - Branding */}
        <div className="premium-gradient p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          
          <div className="relative z-10">
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-3 mb-12"
            >
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                <FileCheck className="w-10 h-10" />
              </div>
              <span className="text-2xl font-bold font-display tracking-tight">E-Sign</span>
            </motion.div>

            <motion.h2 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-4xl font-bold font-display mb-4 leading-tight"
            >
              Nâng tầm trải nghiệm <br />ký số hiện đại
            </motion.h2>
            <motion.p 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-lg text-primary-100 mb-12"
            >
              Giải pháp chữ ký điện tử an toàn, pháp lý và chuyên nghiệp nhất cho doanh nghiệp.
            </motion.p>

            <div className="space-y-6">
              {[
                { icon: Shield, text: "Bảo mật chuẩn quốc tế AES-256" },
                { icon: Zap, text: "Ký kết tức thì, không độ trễ" },
                { icon: Globe, text: "Tuân thủ pháp luật Việt Nam" }
              ].map((item, index) => (
                <motion.div 
                  key={index}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6 + (index * 0.1) }}
                  className="flex items-center gap-4 group"
                >
                  <div className="p-2 bg-white/10 rounded-lg group-hover:bg-white/20 transition-colors">
                    <item.icon className="w-5 h-5 text-primary-200" />
                  </div>
                  <span className="text-sm font-medium text-primary-50">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-xs text-primary-200 font-medium pt-8"
          >
            © 2024 E-Sign Platform. All rights reserved.
          </motion.div>
        </div>

        {/* Right Side - Login Form */}
        <div className="bg-white/95 backdrop-blur-xl p-8 md:p-12 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto">
            <div className="mb-10">
              <h3 className="text-3xl font-bold text-secondary-900 font-display mb-2">Đăng nhập</h3>
              <p className="text-secondary-500 font-medium">Tiếp tục hành trình số của bạn</p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-secondary-700 mb-2 px-1">Email</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-primary-600">
                    <Mail className="w-5 h-5 text-secondary-400" />
                  </div>
                  <input
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-secondary-50 border border-secondary-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all duration-300 font-medium"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <label className="text-sm font-bold text-secondary-700">Mật khẩu</label>
                  <Link to="/forgot-password" weight="bold" className="text-xs font-bold text-primary-600 hover:text-primary-700 transition-colors">
                    Quên mật khẩu?
                  </Link>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-primary-600">
                    <Lock className="w-5 h-5 text-secondary-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3.5 bg-secondary-50 border border-secondary-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all duration-300 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-secondary-400 hover:text-secondary-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center py-2">
                <label className="flex items-center cursor-pointer group">
                  <div className="relative">
                    <input type="checkbox" className="sr-only" />
                    <div className="w-5 h-5 border-2 border-secondary-300 rounded-md group-hover:border-primary-500 transition-colors"></div>
                  </div>
                  <span className="ml-3 text-sm font-semibold text-secondary-600">Ghi nhớ đăng nhập</span>
                </label>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full premium-gradient text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary-500/30 hover:shadow-primary-500/40 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Đang xử lý...</span>
                  </>
                ) : 'Đăng nhập'}
              </motion.button>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-secondary-100"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-4 bg-white text-secondary-400 font-bold uppercase tracking-widest">Hoặc tiếp tục với</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button className="flex items-center justify-center gap-3 py-3 border border-secondary-200 rounded-2xl hover:bg-secondary-50 transition-all duration-300 font-bold text-secondary-700 text-sm">
                  <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                  Google
                </button>
                <button className="flex items-center justify-center gap-3 py-3 border border-secondary-200 rounded-2xl hover:bg-secondary-50 transition-all duration-300 font-bold text-secondary-700 text-sm">
                  <img src="https://www.svgrepo.com/show/475647/facebook-color.svg" className="w-5 h-5" alt="Facebook" />
                  Facebook
                </button>
              </div>

              <p className="text-center text-sm font-medium text-secondary-500 pt-8">
                Chưa có tài khoản?
                <Link to="/register" className="font-bold text-primary-600 hover:text-primary-700 ml-2 transition-colors underline decoration-primary-600/30 underline-offset-4">Đăng ký ngay</Link>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
