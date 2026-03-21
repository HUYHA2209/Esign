import React from 'react';
import { FileCheck, Shield, Clock, Settings, Database, FileText, MapPin, Phone, Mail, Facebook, Linkedin, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
export default function Home() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 w-full bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 shadow-lg z-50">
        <nav className="max-w-7xl mx-auto px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <FileCheck className="w-9 h-9" />
              <span className="text-2xl font-bold">E-SIGNATURE</span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-white hover:opacity-80 font-medium transition-opacity">Tính năng</a>
              <a href="#plans" className="text-white hover:opacity-80 font-medium transition-opacity">Bảng giá</a>
              <a href="#testimonials" className="text-white hover:opacity-80 font-medium transition-opacity">Đánh giá</a>
              <a href="#contact" className="text-white hover:opacity-80 font-medium transition-opacity">Liên hệ</a>
            </div>

            <div className="flex items-center gap-4">
              <button onClick={() => navigate("/login")} className="px-6 py-2 rounded-full border-2 border-white text-white font-semibold hover:bg-white hover:text-blue-600 transition-all">
                Đăng nhập
              </button>
              <button onClick={() => navigate("/register")} className="px-6 py-2 rounded-full bg-yellow-400 text-gray-800 font-semibold hover:bg-yellow-300 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                Đăng ký
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="pt-36 pb-24 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <svg className="w-full h-full" viewBox="0 0 1200 600" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,300 Q300,100 600,300 T1200,300 L1200,600 L0,600 Z" fill="white" />
          </svg>
        </div>
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold mb-5">
            Ký số dễ dàng, bảo mật tuyệt đối
          </h1>
          <p className="text-xl mb-10 opacity-95">
            Giải pháp chữ ký điện tử hàng đầu cho doanh nghiệp. Tiết kiệm thời gian, chi phí và bảo vệ môi trường.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-5">
            <button className="px-10 py-4 rounded-full bg-yellow-400 text-gray-800 text-lg font-semibold hover:bg-yellow-300 hover:shadow-xl hover:-translate-y-1 transition-all">
              Bắt đầu miễn phí
            </button>
            <button className="px-10 py-4 rounded-full bg-white text-blue-600 text-lg font-semibold hover:bg-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all">
              Xem demo
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-5">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">Tính năng nổi bật</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
            <FeatureCard
              icon={<FileText className="w-10 h-10" />}
              title="Ký đa tài liệu"
              description="Ký nhiều tài liệu cùng lúc, quản lý quy trình ký theo thứ tự linh hoạt."
            />
            <FeatureCard
              icon={<Shield className="w-10 h-10" />}
              title="Bảo mật tối đa"
              description="Mã hóa dữ liệu, xác thực 2 lớp, tuân thủ các tiêu chuẩn bảo mật quốc tế."
            />
            <FeatureCard
              icon={<Clock className="w-10 h-10" />}
              title="Tiết kiệm thời gian"
              description="Ký tài liệu mọi lúc mọi nơi, giảm thời gian xử lý từ ngày xuống phút."
            />
            <FeatureCard
              icon={<Settings className="w-10 h-10" />}
              title="Tùy chỉnh linh hoạt"
              description="Tạo mẫu tài liệu, tùy chỉnh vị trí ký, thiết lập quy trình phê duyệt."
            />
            <FeatureCard
              icon={<FileCheck className="w-10 h-10" />}
              title="Theo dõi chi tiết"
              description="Nhật ký hoạt động đầy đủ, thông báo real-time về trạng thái tài liệu."
            />
            <FeatureCard
              icon={<Database className="w-10 h-10" />}
              title="Lưu trữ an toàn"
              description="Cloud storage bảo mật, sao lưu tự động, truy cập mọi lúc mọi nơi."
            />
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section id="plans" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-5">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">Chọn gói phù hợp với bạn</h2>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <PlanCard
              name="CƠ BẢN"
              price="Miễn phí"
              period="Dùng thử"
              features={[
                '5 tài liệu/tháng',
                '2 người ký',
                'Lưu trữ 1GB',
                'Email hỗ trợ'
              ]}
            />
            <PlanCard
              name="CHUYÊN NGHIỆP"
              price="299K"
              period="/tháng"
              featured
              features={[
                '50 tài liệu/tháng',
                'Không giới hạn người ký',
                'Lưu trữ 50GB',
                'Mẫu tài liệu tùy chỉnh',
                'API tích hợp',
                'Hỗ trợ 24/7'
              ]}
            />
            <PlanCard
              name="DOANH NGHIỆP"
              price="999K"
              period="/tháng"
              features={[
                'Không giới hạn tài liệu',
                'Không giới hạn người ký',
                'Lưu trữ không giới hạn',
                'Tùy chỉnh hoàn toàn',
                'API đầy đủ',
                'Quản lý đa công ty',
                'Account manager riêng'
              ]}
            />
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-5">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">Khách hàng nói gì về chúng tôi</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <TestimonialCard
              initial="N"
              name="Nguyễn Văn A"
              role="Giám đốc - ABC Corp"
              text="Giải pháp tuyệt vời! Chúng tôi đã tiết kiệm được 70% thời gian xử lý hợp đồng và giảm chi phí in ấn đáng kể."
            />
            <TestimonialCard
              initial="T"
              name="Trần Thị B"
              role="Trưởng phòng Nhân sự - XYZ Ltd"
              text="Giao diện thân thiện, dễ sử dụng. Nhân viên chúng tôi làm quen rất nhanh. Hỗ trợ khách hàng nhiệt tình!"
            />
            <TestimonialCard
              initial="L"
              name="Lê Văn C"
              role="CEO - Tech Startup"
              text="Tính năng API tích hợp rất mạnh mẽ. Chúng tôi đã tích hợp thành công vào hệ thống quản lý nội bộ chỉ trong 2 ngày."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 text-white text-center">
        <div className="max-w-4xl mx-auto px-5">
          <h2 className="text-4xl font-bold mb-5">Sẵn sàng chuyển đổi số?</h2>
          <p className="text-xl mb-10 opacity-95">
            Tham gia cùng hàng nghìn doanh nghiệp đã tin dùng giải pháp chữ ký điện tử của chúng tôi
          </p>
          <button className="px-12 py-4 rounded-full bg-yellow-400 text-gray-800 text-lg font-semibold hover:bg-yellow-300 hover:shadow-xl hover:-translate-y-1 transition-all">
            Dùng thử miễn phí 30 ngày
          </button>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-5">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-800">Liên hệ với chúng tôi</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <ContactCard
              icon={<MapPin className="w-8 h-8" />}
              title="Địa chỉ"
              content={<>123 Đường ABC, Quận 1<br />TP. Hồ Chí Minh, Việt Nam</>}
            />
            <ContactCard
              icon={<Phone className="w-8 h-8" />}
              title="Điện thoại"
              content={<>Hotline: 1900 xxxx<br />Tel: (028) xxxx xxxx</>}
            />
            <ContactCard
              icon={<Mail className="w-8 h-8" />}
              title="Email"
              content={<>support@esignature.vn<br />sales@esignature.vn</>}
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-5">
          <div className="grid md:grid-cols-4 gap-10 mb-8">
            <div>
              <h3 className="text-yellow-400 font-bold mb-5">VỀ CHÚNG TÔI</h3>
              <p className="text-gray-400 leading-relaxed mb-5">
                E-Signature là giải pháp chữ ký điện tử hàng đầu tại Việt Nam, giúp doanh nghiệp chuyển đổi số nhanh chóng và hiệu quả.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center hover:bg-blue-800 transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition-colors">
                  <MessageCircle className="w-5 h-5" />
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-yellow-400 font-bold mb-5">SẢN PHẨM</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Chữ ký điện tử</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Quản lý hợp đồng</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">API tích hợp</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Ứng dụng mobile</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Bảng giá</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-yellow-400 font-bold mb-5">HỖ TRỢ</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Trung tâm trợ giúp</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Hướng dẫn sử dụng</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Video tutorial</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Câu hỏi thường gặp</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Liên hệ hỗ trợ</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-yellow-400 font-bold mb-5">CÔNG TY</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Về chúng tôi</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Tin tức</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Tuyển dụng</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Đối tác</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Điều khoản dịch vụ</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Chính sách bảo mật</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-8 text-center text-gray-400">
            <p>&copy; 2024 E-Signature. All rights reserved. | Design with ❤️ in Vietnam</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-white p-10 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
      <div className="w-20 h-20 bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 rounded-full flex items-center justify-center mx-auto mb-6 text-white">
        {icon}
      </div>
      <h3 className="text-2xl font-bold mb-4 text-gray-800">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

function PlanCard({ name, price, period, features, featured }) {
  return (
    <div className={`p-10 rounded-2xl transition-all duration-300 ${featured
        ? 'bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 text-white scale-105 shadow-2xl'
        : 'bg-white border-2 border-gray-200 hover:border-blue-600 hover:scale-105 hover:shadow-xl'
      }`}>
      <h3 className="text-2xl font-bold mb-4">{name}</h3>
      <div className="text-5xl font-bold mb-2">{price}</div>
      <p className={`mb-6 ${featured ? 'text-blue-200' : 'text-gray-500'}`}>{period}</p>

      <ul className="space-y-3 mb-8 text-left">
        {features.map((feature, idx) => (
          <li key={idx} className={`pb-3 border-b ${featured ? 'border-blue-400 border-opacity-20' : 'border-gray-200'}`}>
            <span className={`font-bold mr-2 ${featured ? 'text-yellow-400' : 'text-blue-600'}`}>✓</span>
            {feature}
          </li>
        ))}
      </ul>

      <button className={`w-full py-4 rounded-full font-semibold transition-all ${featured
          ? 'bg-yellow-400 text-gray-800 hover:bg-yellow-300 hover:shadow-lg'
          : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg'
        }`}>
        {featured ? 'Mua ngay' : name === 'CƠ BẢN' ? 'Bắt đầu ngay' : 'Liên hệ'}
      </button>
    </div>
  );
}

function TestimonialCard({ initial, name, role, text }) {
  return (
    <div className="bg-white p-8 rounded-2xl shadow-lg">
      <div className="flex items-center gap-4 mb-5">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
          {initial}
        </div>
        <div>
          <h4 className="font-bold text-gray-800">{name}</h4>
          <p className="text-gray-500 text-sm">{role}</p>
        </div>
      </div>
      <p className="text-gray-600 italic leading-relaxed">{text}</p>
    </div>
  );
}

function ContactCard({ icon, title, content }) {
  return (
    <div className="text-center p-8 bg-gray-50 rounded-2xl">
      <div className="w-16 h-16 bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 rounded-full flex items-center justify-center mx-auto mb-4 text-white">
        {icon}
      </div>
      <h4 className="font-bold text-gray-800 mb-3">{title}</h4>
      <p className="text-gray-600">{content}</p>
    </div>
  );
}