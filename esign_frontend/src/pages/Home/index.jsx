import React from 'react';
import { FileCheck, Shield, Clock, Settings, Database, FileText, MapPin, Phone, Mail, Facebook, Linkedin, MessageCircle, ChevronRight, CheckCircle2, Play, Users, Globe, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-secondary-50 font-sans selection:bg-primary-100 selection:text-primary-900">
      {/* Header */}
      <header className="fixed top-0 w-full glass-nav z-50">
        <nav className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-secondary-900"
            >
              <div className="p-1.5 premium-gradient rounded-lg shadow-lg shadow-primary-500/20">
                <FileCheck className="w-7 h-7 text-white" />
              </div>
              <span className="text-xl font-bold font-display tracking-tight">E-Sign</span>
            </motion.div>

            <div className="hidden lg:flex items-center gap-10">
              {['Tính năng', 'Bảng giá', 'Giải pháp', 'Liên hệ'].map((item, idx) => (
                <a 
                  key={idx} 
                  href={`#${item.toLowerCase()}`} 
                  className="text-secondary-600 hover:text-primary-600 font-semibold text-sm transition-colors duration-300"
                >
                  {item}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate("/login")} 
                className="hidden sm:block px-6 py-2.5 text-secondary-700 font-bold text-sm hover:text-primary-600 transition-colors"
              >
                Đăng nhập
              </button>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate("/register")} 
                className="px-7 py-2.5 premium-gradient text-white font-bold text-sm rounded-xl shadow-lg shadow-primary-500/25 hover:shadow-primary-500/35 transition-all"
              >
                Bắt đầu ngay
              </motion.button>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative pt-44 pb-32 overflow-hidden bg-white">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary-50/50 rounded-full blur-[120px] -mr-96 -mt-96 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-secondary-100/50 rounded-full blur-[100px] -ml-64 -mb-64 pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 text-primary-700 text-xs font-bold uppercase tracking-wider mb-8">
                <span className="flex h-2 w-2 rounded-full bg-primary-600 animate-pulse"></span>
                Nền tảng ký kết số 1 Việt Nam
              </div>
              <h1 className="text-5xl md:text-7xl font-bold text-secondary-900 font-display leading-[1.1] mb-8">
                Ký số hiện đại <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-primary-800">Bảo mật tuyệt đối</span>
              </h1>
              <p className="text-lg text-secondary-600 leading-relaxed mb-10 max-w-xl">
                Tối ưu hóa quy trình làm việc của bạn với nền tảng ký điện tử thông minh. Ký kết mọi lúc, mọi nơi, trên mọi thiết bị với đầy đủ giá trị pháp lý.
              </p>
              
              <div className="flex flex-wrap items-center gap-5">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-10 py-4.5 rounded-2xl premium-gradient text-white text-lg font-bold shadow-xl shadow-primary-500/30 hover:shadow-primary-500/40 transition-all flex items-center gap-3"
                >
                  Dùng thử miễn phí
                  <ChevronRight className="w-5 h-5" />
                </motion.button>
                <button className="px-8 py-4.5 rounded-2xl bg-white border-2 border-secondary-100 text-secondary-900 text-lg font-bold hover:bg-secondary-50 hover:border-secondary-200 transition-all flex items-center gap-3">
                  <Play className="w-5 h-5 text-primary-600 fill-primary-600" />
                  Xem Video
                </button>
              </div>

              <div className="mt-12 flex items-center gap-8 grayscale opacity-50">
                <div className="flex items-center gap-2 font-bold text-secondary-400">
                  <Users className="w-5 h-5" />
                  <span>50k+ User</span>
                </div>
                <div className="flex items-center gap-2 font-bold text-secondary-400">
                  <Globe className="w-5 h-5" />
                  <span>ISO 27001</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="relative"
            >
              <div className="relative z-10 glass-card p-4 md:p-8 bg-white/40 backdrop-blur-md">
                <img 
                  src="https://images.unsplash.com/photo-1554224155-1696413575b9?auto=format&fit=crop&q=80&w=1000" 
                  alt="Dashboard Preview" 
                  className="rounded-xl shadow-2xl"
                />
                <div className="absolute -bottom-6 -left-6 glass-card p-6 bg-white/90 shadow-xl animate-bounce-slow">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-secondary-400 uppercase tracking-wider">Trạng thái</p>
                      <p className="text-sm font-bold text-secondary-900">Đã ký thành công</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary-600/10 rounded-full blur-2xl"></div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="tính năng" className="py-32 bg-secondary-50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-base font-bold text-primary-600 uppercase tracking-[0.3em] mb-4">Giá trị cốt lõi</h2>
            <h3 className="text-4xl md:text-5xl font-bold text-secondary-900 font-display mb-6">Giải pháp toàn diện cho mọi doanh nghiệp</h3>
            <p className="text-secondary-600 font-medium leading-relaxed">Được xây dựng trên nền tảng công nghệ tiên tiến nhất, E-Sign mang lại trải nghiệm ký số an toàn và mượt mà.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Zap className="w-6 h-6" />}
              title="Ký kết tức thì"
              description="Rút ngắn thời gian xử lý hồ sơ từ vài ngày xuống chỉ còn vài phút. Ký và gửi ngay lập tức."
              color="bg-amber-500"
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6" />}
              title="Bảo mật cấp độ ngân hàng"
              description="Mã hóa AES-256 bit đảm bảo mọi tài liệu của bạn được bảo vệ an toàn tuyệt đối."
              color="bg-primary-600"
            />
            <FeatureCard
              icon={<Globe className="w-6 h-6" />}
              title="Hợp pháp & Tuân thủ"
              description="Hoàn toàn tuân thủ Luật Giao dịch điện tử Việt Nam và các tiêu chuẩn quốc tế."
              color="bg-emerald-600"
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-white border-y border-secondary-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            {[
              { label: 'Doanh nghiệp', value: '10,000+' },
              { label: 'Tài liệu đã ký', value: '5,000,000+' },
              { label: 'Tiết kiệm chi phí', value: '75%' },
              { label: 'Độ hài lòng', value: '99.9%' }
            ].map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-4xl font-bold text-secondary-900 font-display mb-2">{stat.value}</div>
                <div className="text-sm font-bold text-secondary-400 uppercase tracking-widest">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section id="bảng giá" className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-base font-bold text-primary-600 uppercase tracking-[0.3em] mb-4">Bảng giá</h2>
            <h3 className="text-4xl md:text-5xl font-bold text-secondary-900 font-display mb-6">Lựa chọn gói dịch vụ phù hợp</h3>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-center max-w-6xl mx-auto">
            <PlanCard
              name="Cá nhân"
              price="0"
              period="/tháng"
              features={['5 tài liệu/tháng', '1 người ký', 'Lưu trữ 1GB', 'Xác thực cơ bản']}
            />
            <PlanCard
              name="Chuyên nghiệp"
              price="299"
              period="/tháng"
              featured
              features={['50 tài liệu/tháng', 'Không giới hạn người ký', 'Lưu trữ 50GB', 'Mẫu tài liệu tùy chỉnh', 'Hỗ trợ ưu tiên']}
            />
            <PlanCard
              name="Doanh nghiệp"
              price="999"
              period="/tháng"
              features={['Tài liệu không giới hạn', 'Phân quyền nâng cao', 'API tích hợp', 'Account Manager riêng', 'Hỗ trợ 24/7']}
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary-950 text-white pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-2 mb-8">
                <FileCheck className="w-8 h-8 text-primary-500" />
                <span className="text-2xl font-bold font-display tracking-tight">E-Sign</span>
              </div>
              <p className="text-secondary-400 leading-relaxed mb-8">
                Nền tảng quản lý và ký kết tài liệu số hàng đầu, giúp doanh nghiệp bứt phá trong kỷ nguyên chuyển đổi số.
              </p>
              <div className="flex gap-4">
                {[Facebook, Linkedin, MessageCircle].map((Icon, idx) => (
                  <a key={idx} href="#" className="w-10 h-10 bg-secondary-900 rounded-xl flex items-center justify-center hover:bg-primary-600 transition-all duration-300">
                    <Icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>

            {[
              { title: 'Sản phẩm', links: ['Chữ ký số', 'Quản lý tài liệu', 'Quy trình phê duyệt', 'Bảng giá'] },
              { title: 'Công ty', links: ['Về chúng tôi', 'Blog', 'Tuyển dụng', 'Liên hệ'] },
              { title: 'Pháp lý', links: ['Điều khoản', 'Bảo mật', 'Quy định ký số', 'Chứng chỉ'] }
            ].map((col, idx) => (
              <div key={idx}>
                <h4 className="text-white font-bold mb-8 uppercase tracking-widest text-sm">{col.title}</h4>
                <ul className="space-y-4">
                  {col.links.map((link, lIdx) => (
                    <li key={lIdx}>
                      <a href="#" className="text-secondary-400 hover:text-white transition-colors duration-300 font-medium">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="pt-8 border-t border-secondary-900 flex flex-col md:flex-row justify-between items-center gap-4 text-secondary-500 text-sm font-medium">
            <p>© 2024 E-Sign Platform. All rights reserved.</p>
            <div className="flex gap-8">
              <a href="#" className="hover:text-white transition-colors">Sitemap</a>
              <a href="#" className="hover:text-white transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description, color }) {
  return (
    <motion.div 
      whileHover={{ y: -10 }}
      className="bg-white p-10 rounded-3xl shadow-premium border border-secondary-100 hover:border-primary-100 transition-all duration-300"
    >
      <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center mb-8 text-white shadow-lg`}>
        {icon}
      </div>
      <h3 className="text-2xl font-bold mb-4 text-secondary-900 font-display">{title}</h3>
      <p className="text-secondary-600 leading-relaxed font-medium">{description}</p>
    </motion.div>
  );
}

function PlanCard({ name, price, period, features, featured }) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className={`relative p-10 rounded-[32px] transition-all duration-500 ${featured
        ? 'bg-secondary-950 text-white shadow-2xl scale-105 border-primary-500'
        : 'bg-white border border-secondary-200 hover:border-primary-300 shadow-lg'
      }`}
    >
      {featured && (
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-5 py-1.5 premium-gradient rounded-full text-[10px] font-bold uppercase tracking-[0.2em] shadow-lg">
          Khuyên dùng
        </div>
      )}
      <h3 className="text-xl font-bold mb-2 uppercase tracking-widest">{name}</h3>
      <div className="flex items-baseline gap-1 mb-8">
        <span className="text-4xl font-bold font-display">{price}k</span>
        <span className={featured ? 'text-secondary-400' : 'text-secondary-500'}>{period}</span>
      </div>

      <ul className="space-y-4 mb-10">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-center gap-3 font-medium text-sm">
            <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${featured ? 'text-primary-500' : 'text-primary-600'}`} />
            <span className={featured ? 'text-secondary-200' : 'text-secondary-600'}>{feature}</span>
          </li>
        ))}
      </ul>

      <button className={`w-full py-4 rounded-2xl font-bold transition-all duration-300 ${featured
        ? 'premium-gradient text-white shadow-xl shadow-primary-500/20'
        : 'bg-secondary-100 text-secondary-900 hover:bg-secondary-200'
      }`}>
        {name === 'Cá nhân' ? 'Bắt đầu miễn phí' : 'Đăng ký ngay'}
      </button>
    </motion.div>
  );
}

function ContactCard({ icon, title, content }) {
  return (
    <div className="text-center p-10 bg-white rounded-3xl border border-secondary-100 shadow-premium">
      <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-primary-600 shadow-sm">
        {icon}
      </div>
      <h4 className="font-bold text-secondary-900 mb-3 font-display">{title}</h4>
      <div className="text-secondary-600 font-medium leading-relaxed">{content}</div>
    </div>
  );
}
