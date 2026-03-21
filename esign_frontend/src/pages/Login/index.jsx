import React, { useState } from 'react';
import { data, Link } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, FileCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../../service/userApi';
import { toast } from 'react-toastify';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const navigate = useNavigate();

  const handleSubmit = async () => {
    // 1. Validator: Check if fields are empty
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
        // Navigate to dashboard
        navigate("/dashboard");
      } else {
        toast.error("Đăng nhập thất bại! Vui lòng kiểm tra lại thông tin.");
      }
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);

      const errorCode = error.response?.data?.code;
      const errorMessage = error.response?.data?.message;

      // Handle specific error codes
      if (errorCode === 1004) { // USER_NOT_EXISTED
        toast.error("Email chưa tồn tại. Vui lòng đăng ký tài khoản mới!");
      } else if (errorCode === 1002 || errorMessage?.includes("Bad credentials")) { // UNAUTHENTICATED
        toast.error("Mật khẩu không chính xác. Vui lòng thử lại!");
      } else if (errorCode === 1009) { // EMAIL_NOT_VERIFIED
        toast.warning("Email chưa được xác minh. Chúng tôi đã gửi lại mã OTP đến email của bạn. Vui lòng kiểm tra email và xác minh.");
        navigate('/register'); // Chuyển sang trang đăng ký để nhập OTP
      } else if (errorCode === 1011) { // RATE_LIMIT_EXCEEDED
        toast.error("Bạn đã đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 1 phút.");
      } else {
        toast.error(errorMessage || 'Đăng nhập thất bại, vui lòng kiểm tra lại thông tin!');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 flex items-center justify-center p-4">
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

              <h2 className="text-4xl font-bold mb-4">Chào mừng trở lại!</h2>
              <p className="text-lg opacity-90 mb-8">Đăng nhập để tiếp tục quản lý chữ ký điện tử của bạn</p>

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
                  <span>Tuân thủ pháp luật Việt Nam</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="p-12 flex flex-col justify-center">
            <div className="max-w-md w-full mx-auto">
              <h3 className="text-3xl font-bold text-gray-800 mb-2">Đăng nhập</h3>
              <p className="text-gray-600 mb-8">Nhập thông tin tài khoản của bạn</p>

              <div className="space-y-6">
                {/* Email Input */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-600 focus:outline-none transition"
                    />
                  </div>
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
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-600 focus:outline-none transition"
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
                </div>

                {/* Remember & Forgot Password */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Ghi nhớ đăng nhập</span>
                  </label>
                  <Link to="/forgot-password" className="text-sm font-semibold text-blue-600 hover:text-blue-800">Quên mật khẩu?</Link>
                </div>

                {/* Login Button */}
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-600 text-white font-bold py-3 rounded-xl hover:from-blue-700 hover:to-blue-700 transform hover:scale-105 transition duration-200 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
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

                {/* Sign Up Link */}
                <p className="text-center text-sm text-gray-600 mt-6">
                  Chưa có tài khoản?
                  <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-800 ml-1">Đăng ký ngay</Link>
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}