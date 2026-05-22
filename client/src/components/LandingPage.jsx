import React, { useState } from 'react';
import { LogIn, Shield, Lock, Zap, Users, MessageSquare, FileText, CheckCircle, Github, Twitter, ChevronRight, Sparkles, Code, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import ThreeBackground from './ThreeBackground';

const LandingPage = ({ onGetStarted }) => {
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      icon: Lock,
      title: 'Mã hóa đầu cuối',
      description: 'Tin nhắn được mã hóa bằng AES-GCM-256. Chỉ bạn và các peer đang kết nối mới đọc được nội dung.',
      detail: 'Dùng Web Crypto API với trao đổi khóa ECDH'
    },
    {
      icon: Zap,
      title: 'Kết nối ngang hàng P2P',
      description: 'Các trình duyệt kết nối trực tiếp bằng WebRTC. Máy chủ chỉ hỗ trợ đăng nhập, tìm peer và signaling.',
      detail: 'Mô hình mesh, phù hợp demo nhiều người trong một phòng'
    },
    {
      icon: Shield,
      title: 'Đăng nhập bằng email và OTP',
      description: 'Tạo tài khoản bằng email, mật khẩu và xác thực OTP trước khi vào phòng chat.',
      detail: 'Danh tính người dùng tách biệt với luồng truyền tin P2P'
    },
    {
      icon: FileText,
      title: 'Chia sẻ tệp an toàn',
      description: 'Chia sẻ tệp trực tiếp giữa các peer, có chia nhỏ dữ liệu và kiểm tra toàn vẹn SHA-256.',
      detail: 'Theo dõi tiến trình gửi và nhận tệp lớn'
    }
  ];

  const stats = [
    { value: '4', label: 'Người mỗi phòng', sublabel: 'Mô hình mesh' },
    { value: '256-bit', label: 'AES-GCM', sublabel: 'Mã hóa' },
    { value: '0', label: 'Lưu tin nhắn', sublabel: 'Máy chủ không giữ nội dung' },
    { value: '100%', label: 'Mã nguồn mở', sublabel: 'Dễ trình bày' }
  ];

  const useCases = [
    {
      emoji: '💼',
      title: 'Làm việc nhóm',
      description: 'Trao đổi nội dung dự án trong một môi trường demo riêng tư'
    },
    {
      emoji: '🎓',
      title: 'Lớp học',
      description: 'Minh họa peer discovery, signaling và DataChannel trong môn Hệ phân tán'
    },
    {
      emoji: '💻',
      title: 'Thực hành mạng',
      description: 'Quan sát kết nối P2P, trạng thái online và xử lý ngắt kết nối'
    },
    {
      emoji: '🔐',
      title: 'Bảo mật',
      description: 'Thử nghiệm mã hóa đầu cuối và trao đổi khóa giữa các peer'
    },
    {
      emoji: '📁',
      title: 'Chia sẻ tệp',
      description: 'Gửi tệp trực tiếp qua kênh dữ liệu giữa hai trình duyệt'
    },
    {
      emoji: '🌐',
      title: 'Demo phân tán',
      description: 'Giải thích rõ vai trò máy chủ và vai trò peer trong hệ thống'
    }
  ];

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <ThreeBackground />
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          background: 'radial-gradient(ellipse at top, rgba(30, 30, 30, 0.6) 0%, rgba(30, 30, 30, 0.9) 100%)',
          pointerEvents: 'none'
        }}
      />

      <div style={{ position: 'relative', zIndex: 10 }}>
        <motion.header
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-between px-8 py-6 backdrop-blur-md bg-vscode-card/30 border-b border-vscode-border/30"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-p2p-orange to-p2p-yellow flex items-center justify-center">
              <MessageSquare size={24} className="text-vscode-dark" />
            </div>
            <div>
              <h1 className="text-white font-bold text-xl">SecureChat</h1>
              <p className="text-vscode-text-muted text-xs">Chat P2P cho Hệ phân tán</p>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <a href="#features" className="text-vscode-text-secondary hover:text-white transition-colors text-sm">Tính năng</a>
            <a href="#how-it-works" className="text-vscode-text-secondary hover:text-white transition-colors text-sm">Cách hoạt động</a>
            <a href="#use-cases" className="text-vscode-text-secondary hover:text-white transition-colors text-sm">Demo</a>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onGetStarted}
              className="bg-gradient-to-r from-p2p-orange to-p2p-yellow text-vscode-dark font-bold px-6 py-2.5 rounded-lg flex items-center space-x-2"
            >
              <LogIn size={18} />
              <span>Bắt đầu</span>
            </motion.button>
          </div>
        </motion.header>

        <section className="px-8 py-20 max-w-7xl mx-auto">
          <div className="grid grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <motion.div
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-vscode-hover/50 backdrop-blur-sm border border-vscode-border/50 mb-6"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Sparkles size={16} className="text-p2p-orange" />
                <span className="text-xs text-vscode-text-secondary font-semibold">Mã nguồn mở • Không lưu nội dung chat</span>
              </motion.div>

              <h1 className="text-6xl font-bold text-white mb-6 leading-tight">
                Trò chuyện riêng tư,<br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-p2p-orange to-p2p-yellow">
                  không thỏa hiệp
                </span>
              </h1>

              <p className="text-xl text-vscode-text-secondary mb-8 leading-relaxed">
                Ứng dụng chat ngang hàng có mã hóa đầu cuối cho demo Hệ phân tán.
                Máy chủ chỉ dùng để đăng nhập, tìm peer, điều phối phòng và signaling.
              </p>

              <div className="flex items-center space-x-4">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0 10px 40px rgba(246, 133, 27, 0.4)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onGetStarted}
                  className="bg-gradient-to-r from-p2p-orange to-p2p-yellow text-vscode-dark font-bold px-8 py-4 rounded-xl flex items-center space-x-3 text-lg shadow-lg"
                >
                  <LogIn size={24} />
                  <span>Đăng nhập</span>
                  <ArrowRight size={20} />
                </motion.button>

                <motion.a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 rounded-xl border-2 border-vscode-border hover:border-p2p-orange text-white font-semibold flex items-center space-x-2 transition-colors"
                >
                  <Github size={20} />
                  <span>Xem mã nguồn</span>
                </motion.a>
              </div>

              <div className="grid grid-cols-4 gap-6 mt-12">
                {stats.map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className="text-center"
                  >
                    <div className="text-3xl font-bold text-p2p-orange mb-1">{stat.value}</div>
                    <div className="text-sm text-white font-semibold">{stat.label}</div>
                    <div className="text-xs text-vscode-text-muted">{stat.sublabel}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="space-y-4"
            >
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.02, x: 10 }}
                  onClick={() => setActiveFeature(index)}
                  className={`p-6 rounded-2xl backdrop-blur-md border cursor-pointer transition-all ${
                    activeFeature === index
                      ? 'bg-vscode-card/80 border-p2p-orange/50 shadow-lg shadow-p2p-orange/20'
                      : 'bg-vscode-card/40 border-vscode-border/30 hover:border-p2p-orange/30'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-xl ${
                      activeFeature === index ? 'bg-p2p-orange/20' : 'bg-vscode-hover/50'
                    }`}>
                      <feature.icon size={24} className={activeFeature === index ? 'text-p2p-orange' : 'text-vscode-accent'} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-bold text-lg mb-2">{feature.title}</h3>
                      <p className="text-vscode-text-secondary text-sm mb-2">{feature.description}</p>
                      {activeFeature === index && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="flex items-center space-x-2 mt-3 pt-3 border-t border-vscode-border/30"
                        >
                          <Code size={14} className="text-p2p-orange" />
                          <span className="text-xs text-vscode-text-muted">{feature.detail}</span>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        <section id="how-it-works" className="px-8 py-20 bg-vscode-darker/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl font-bold text-white mb-4">Cách hoạt động</h2>
              <p className="text-xl text-vscode-text-secondary">Đơn giản, bảo mật và đúng tinh thần phân tán</p>
            </motion.div>

            <div className="grid grid-cols-4 gap-8">
              {[
                {
                  step: '01',
                  icon: LogIn,
                  title: 'Đăng nhập',
                  description: 'Tạo tài khoản bằng email, mật khẩu và xác thực OTP'
                },
                {
                  step: '02',
                  icon: Users,
                  title: 'Vào phòng',
                  description: 'Chọn phòng và nhận danh sách peer đang online'
                },
                {
                  step: '03',
                  icon: Lock,
                  title: 'Trao đổi khóa',
                  description: 'Mỗi cặp peer tạo khóa mã hóa riêng qua ECDH'
                },
                {
                  step: '04',
                  icon: MessageSquare,
                  title: 'Chat trực tiếp',
                  description: 'Tin nhắn và tệp đi qua WebRTC DataChannel giữa các peer'
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -10 }}
                  className="relative"
                >
                  <div className="p-6 rounded-2xl bg-vscode-card/60 backdrop-blur-md border border-vscode-border/30 hover:border-p2p-orange/30 transition-all">
                    <div className="text-6xl font-bold text-vscode-hover mb-4">{item.step}</div>
                    <div className="w-12 h-12 rounded-xl bg-p2p-orange/20 flex items-center justify-center mb-4">
                      <item.icon size={24} className="text-p2p-orange" />
                    </div>
                    <h3 className="text-white font-bold text-lg mb-2">{item.title}</h3>
                    <p className="text-vscode-text-secondary text-sm">{item.description}</p>
                  </div>
                  {index < 3 && (
                    <div className="absolute top-1/2 -right-4 transform -translate-y-1/2">
                      <ChevronRight size={24} className="text-vscode-border" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id="use-cases" className="px-8 py-20">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl font-bold text-white mb-4">Phù hợp để demo gì?</h2>
              <p className="text-xl text-vscode-text-secondary">Các tình huống dễ trình bày trong lớp học</p>
            </motion.div>

            <div className="grid grid-cols-3 gap-6">
              {useCases.map((useCase, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="p-6 rounded-2xl bg-vscode-card/60 backdrop-blur-md border border-vscode-border/30 hover:border-p2p-orange/30 transition-all text-center"
                >
                  <div className="text-5xl mb-4">{useCase.emoji}</div>
                  <h3 className="text-white font-bold text-lg mb-2">{useCase.title}</h3>
                  <p className="text-vscode-text-secondary text-sm">{useCase.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-8 py-20 bg-gradient-to-r from-p2p-orange/10 to-p2p-yellow/10 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-5xl font-bold text-white mb-6">Sẵn sàng chat riêng tư?</h2>
              <p className="text-xl text-vscode-text-secondary mb-10">
                Đăng nhập, vào phòng và gửi tin nhắn trực tiếp đến các peer.
              </p>
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 10px 50px rgba(246, 133, 27, 0.5)' }}
                whileTap={{ scale: 0.95 }}
                onClick={onGetStarted}
                className="bg-gradient-to-r from-p2p-orange to-p2p-yellow text-vscode-dark font-bold px-12 py-5 rounded-xl flex items-center space-x-3 text-xl shadow-2xl mx-auto"
              >
                <LogIn size={28} />
                <span>Bắt đầu</span>
                <Sparkles size={24} />
              </motion.button>
            </motion.div>
          </div>
        </section>

        <footer className="px-8 py-10 backdrop-blur-md bg-vscode-darker/50 border-t border-vscode-border/30">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-p2p-orange to-p2p-yellow flex items-center justify-center">
                <MessageSquare size={18} className="text-vscode-dark" />
              </div>
              <div>
                <p className="text-white font-semibold">SecureChat</p>
                <p className="text-vscode-text-muted text-xs">© 2026 • Mã nguồn mở</p>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <a href="https://github.com" className="text-vscode-text-secondary hover:text-white transition-colors" aria-label="GitHub">
                <Github size={20} />
              </a>
              <a href="https://twitter.com" className="text-vscode-text-secondary hover:text-white transition-colors" aria-label="Twitter">
                <Twitter size={20} />
              </a>
              <a href="https://discord.com" className="text-vscode-text-secondary hover:text-white transition-colors" aria-label="Discord">
                <MessageSquare size={20} />
              </a>
            </div>

            <div className="flex items-center space-x-2 text-xs text-vscode-text-muted">
              <CheckCircle size={14} className="text-green-400" />
              <span>Dữ liệu chat nằm trên thiết bị của bạn</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
