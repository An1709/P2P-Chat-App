import React, { useState } from 'react';
import { AlertCircle, Loader, Lock, Mail, RefreshCcw, ShieldCheck, User, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { loginUser, registerUser, resendOtp, verifyOtp } from '../utils/authApi';

const AuthModal = ({ onAuthenticated, onClose, showClose = true }) => {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [otp, setOtp] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const clearPendingRegistrationStorage = () => {
    localStorage.removeItem('p2pChatLastEmail');
    localStorage.removeItem('p2pChatPendingEmail');
    sessionStorage.removeItem('p2pChatPendingEmail');
    sessionStorage.removeItem('p2pChatPendingRegistration');
  };

  const clearRegistrationForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
  };

  const clearOtpForm = () => {
    setOtp('');
    setPendingEmail('');
    clearPendingRegistrationStorage();
  };

  const showLoginForm = (message = '') => {
    clearRegistrationForm();
    clearOtpForm();
    setMode('login');
    setError('');
    setInfo(message);
  };

  const showRegisterForm = () => {
    clearRegistrationForm();
    clearOtpForm();
    setMode('register');
    setError('');
    setInfo('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (mode === 'otp') {
      await handleVerifyOtp(event);
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedDisplayName = displayName.trim();

    if (!trimmedEmail || !password || (mode === 'register' && !trimmedDisplayName)) {
      setError(mode === 'register' ? 'Vui lòng nhập tên hiển thị, email và mật khẩu.' : 'Vui lòng nhập email và mật khẩu.');
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);

    try {
      const result = mode === 'register'
        ? await registerUser({ email: trimmedEmail, password, displayName: trimmedDisplayName })
        : await loginUser({ email: trimmedEmail, password });

      if (result.otpRequired) {
        setPendingEmail(trimmedEmail);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setDisplayName('');
        setOtp('');
        setMode('otp');
        setInfo(result.message || 'Mã OTP đã được gửi. Vui lòng nhập mã OTP để hoàn tất đăng ký.');
        return;
      }

      clearPendingRegistrationStorage();
      onAuthenticated(result.user, result.token);
    } catch (authError) {
      if (authError.otpRequired) {
        setPendingEmail(trimmedEmail);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setDisplayName('');
        setOtp('');
        setMode('otp');
        setInfo(authError.message || 'Mã OTP đã được gửi. Vui lòng nhập mã OTP để hoàn tất đăng ký.');
        return;
      }
      setError(authError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    setError('');
    setInfo('');

    const targetEmail = pendingEmail;
    if (!targetEmail) {
      setError('Không tìm thấy email đang chờ xác thực. Vui lòng đăng ký lại.');
      return;
    }

    if (!otp.trim()) {
      setError('Vui lòng nhập mã OTP.');
      return;
    }

    setLoading(true);

    try {
      const result = await verifyOtp({ email: targetEmail, otp: otp.trim() });
      showLoginForm(result.message || 'Đăng ký thành công. Bạn có thể đăng nhập.');
    } catch (authError) {
      setError(authError.message || 'Mã OTP không đúng hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    const targetEmail = pendingEmail;
    if (!targetEmail) {
      setError('Không tìm thấy email đang chờ xác thực. Vui lòng đăng ký lại.');
      return;
    }

    setError('');
    setInfo('');
    setLoading(true);

    try {
      const result = await resendOtp({ email: targetEmail });
      setPendingEmail(targetEmail);
      setInfo(result.message || `Mã OTP mới đã được gửi đến email: ${targetEmail}`);
    } catch (authError) {
      setError(authError.message);
    } finally {
      setLoading(false);
    }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.94, y: 24 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.25, ease: 'easeOut' }
    },
    exit: {
      opacity: 0,
      scale: 0.94,
      y: 24,
      transition: { duration: 0.18 }
    }
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.2 } }
  };

  return (
    <AnimatePresence>
      <motion.div
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(12px)'
        }}
        onClick={showClose ? onClose : undefined}
      >
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(event) => event.stopPropagation()}
          className="w-full max-w-lg relative"
        >
          <div className="bg-vscode-card/95 backdrop-blur-xl rounded-2xl border border-vscode-border/50 shadow-2xl overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-p2p-orange via-p2p-yellow to-p2p-orange" />

            {showClose && (
              <button
                onClick={onClose}
                className="absolute top-6 right-6 text-vscode-text-muted hover:text-white transition-colors z-10"
                aria-label="Đóng màn hình đăng nhập"
              >
                <X size={24} />
              </button>
            )}

            <form onSubmit={handleSubmit} className="p-10">
              <div className="text-center mb-8">
                <div className="inline-flex mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-p2p-orange to-p2p-yellow flex items-center justify-center shadow-xl">
                    <Lock size={40} className="text-vscode-dark" />
                  </div>
                </div>

                <h2 className="text-3xl font-bold text-white mb-3">
                  {mode === 'login' ? 'Đăng nhập' : mode === 'register' ? 'Đăng ký tài khoản' : 'Xác thực OTP'}
                </h2>
                <p className="text-vscode-text-secondary">Dùng email, mật khẩu và OTP để vào hệ thống chat P2P</p>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-6 rounded-xl bg-vscode-darker/70 p-1">
                <button
                  type="button"
                  onClick={() => showLoginForm()}
                  className={`py-2 rounded-lg text-sm font-semibold transition-colors ${mode === 'login' ? 'bg-p2p-orange text-vscode-dark' : 'text-vscode-text-secondary hover:text-white'}`}
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  onClick={showRegisterForm}
                  className={`py-2 rounded-lg text-sm font-semibold transition-colors ${mode === 'register' ? 'bg-p2p-orange text-vscode-dark' : 'text-vscode-text-secondary hover:text-white'}`}
                >
                  Đăng ký
                </button>
              </div>

              {mode === 'otp' && (
                <div className="mb-6 p-4 bg-vscode-hover/40 border border-vscode-border/60 rounded-xl flex items-start space-x-3">
                  <ShieldCheck size={20} className="text-p2p-orange flex-shrink-0 mt-0.5" />
                  <p className="text-vscode-text-secondary text-sm">
                    Mã OTP đã được gửi đến email: <span className="text-white font-semibold">{pendingEmail}</span>. Nhập mã OTP gồm 6 chữ số để hoàn tất đăng ký.
                  </p>
                </div>
              )}

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start space-x-3">
                  <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              {info && (
                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-start space-x-3">
                  <ShieldCheck size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-green-300 text-sm">{info}</p>
                </div>
              )}

              <div className="space-y-4">
                {mode !== 'otp' && (
                  <>
                    {mode === 'register' && (
                      <label className="block">
                        <span className="block text-white text-sm font-semibold mb-2">Tên hiển thị</span>
                        <div className="relative">
                          <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-vscode-text-muted" />
                          <input
                            type="text"
                            value={displayName}
                            onChange={(event) => setDisplayName(event.target.value)}
                            placeholder="Tên hiển thị với các peer"
                            maxLength={24}
                            className="w-full bg-vscode-hover text-white placeholder-vscode-text-muted border border-vscode-border rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-p2p-orange"
                            required
                          />
                        </div>
                      </label>
                    )}

                    <label className="block">
                      <span className="block text-white text-sm font-semibold mb-2">Email</span>
                      <div className="relative">
                        <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-vscode-text-muted" />
                        <input
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder="sinhvien@example.com"
                          className="w-full bg-vscode-hover text-white placeholder-vscode-text-muted border border-vscode-border rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-p2p-orange"
                          required
                          autoFocus
                        />
                      </div>
                    </label>

                    <label className="block">
                      <span className="block text-white text-sm font-semibold mb-2">Mật khẩu</span>
                      <div className="relative">
                        <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-vscode-text-muted" />
                        <input
                          type="password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder="Nhập mật khẩu"
                          className="w-full bg-vscode-hover text-white placeholder-vscode-text-muted border border-vscode-border rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-p2p-orange"
                          required
                        />
                      </div>
                    </label>
                  </>
                )}

                {mode === 'register' && (
                  <label className="block">
                    <span className="block text-white text-sm font-semibold mb-2">Xác nhận mật khẩu</span>
                    <div className="relative">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-vscode-text-muted" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="Nhập lại mật khẩu"
                        className="w-full bg-vscode-hover text-white placeholder-vscode-text-muted border border-vscode-border rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-p2p-orange"
                        required
                      />
                    </div>
                  </label>
                )}

                {mode === 'otp' && (
                  <>
                    <div className="block">
                      <span className="block text-white text-sm font-semibold mb-2">Email xác thực</span>
                      <div className="relative">
                        <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-vscode-text-muted" />
                        <div className="w-full bg-vscode-darker text-vscode-text-secondary border border-vscode-border rounded-lg pl-12 pr-4 py-3">
                          {pendingEmail}
                        </div>
                      </div>
                    </div>

                    <label className="block">
                      <span className="block text-white text-sm font-semibold mb-2">Mã OTP</span>
                      <div className="relative">
                        <ShieldCheck size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-vscode-text-muted" />
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]{6}"
                          value={otp}
                          onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="123456"
                          className="w-full bg-vscode-hover text-white placeholder-vscode-text-muted border border-vscode-border rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-p2p-orange tracking-widest"
                          required
                          autoFocus
                        />
                      </div>
                    </label>
                  </>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-8 w-full bg-gradient-to-r from-p2p-orange to-p2p-yellow hover:from-p2p-orange-dark hover:to-p2p-orange disabled:from-vscode-hover disabled:to-vscode-hover disabled:cursor-not-allowed text-vscode-dark font-bold py-4 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center space-x-3"
              >
                {loading ? (
                  <>
                    <Loader size={22} className="animate-spin" />
                    <span>{mode === 'login' ? 'Đang đăng nhập...' : mode === 'register' ? 'Đang đăng ký...' : 'Đang xác thực...'}</span>
                  </>
                ) : (
                  <span>{mode === 'login' ? 'Đăng nhập' : mode === 'register' ? 'Đăng ký' : 'Xác thực OTP'}</span>
                )}
              </button>

              {mode === 'otp' && (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="mt-4 w-full py-3 text-vscode-text-secondary hover:text-white text-sm font-medium transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <RefreshCcw size={16} />
                  <span>Gửi lại mã OTP</span>
                </button>
              )}
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AuthModal;
