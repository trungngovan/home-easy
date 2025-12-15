"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeftOutlined, BuildOutlined, CheckOutlined, LoadingOutlined, HomeOutlined } from '@ant-design/icons'
import { AlertCircle } from 'lucide-react';
import { apiFetch, endpoints, setAuthToken, setRefreshToken, setUser, LoginResponse } from "@/lib/api";
import { GoogleLogin } from "@react-oauth/google";
import Image from "next/image";
import { Input } from "antd";
const { Password } = Input;

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 24,
    },
  },
};

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<"landlord" | "tenant" | null>(null);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRoleError, setShowRoleError] = useState(false);
  const hasGoogleClient = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
  const [googleNonce] = useState<string>(() => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).slice(2);
  });

  const persistAuth = async (data: LoginResponse) => {
    setAuthToken(data.access);
    setRefreshToken(data.refresh);
    setUser(data.user);
    router.push("/dashboard");
  };

  const handleGoogleSuccess = async (credentialResponse: { credential?: string | null }) => {
    const credential = credentialResponse?.credential;
    if (!credential) {
      setError("Không nhận được token từ Google. Vui lòng thử lại.");
      return;
    }
    
    if (!role) {
      setError("Vui lòng chọn vai trò của bạn trước khi đăng nhập bằng Google");
      setShowRoleError(true);
      return;
    }
    
    setSocialLoading(true);
    setError(null);
    try {
      const data = await apiFetch<LoginResponse>(endpoints.googleWebLogin, {
        method: "POST",
        body: JSON.stringify({ id_token: credential, role: role, nonce: googleNonce }),
      });
      await persistAuth(data);
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : "Đăng ký Google thất bại";
      setError(raw);
    } finally {
      setSocialLoading(false);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!role) {
      setError("Vui lòng chọn vai trò của bạn");
      setShowRoleError(true);
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Mật khẩu không khớp");
      return;
    }
    if (!agreeTerms) {
      setError("Vui lòng đồng ý với điều khoản và chính sách");
      return;
    }
    setLoading(true);
    setError(null);
    setShowRoleError(false);
    try {
      // Use common registration endpoint with role
      await apiFetch(endpoints.register, {
        method: "POST",
        body: JSON.stringify({ email, password, full_name: fullName, role }),
      });
      router.push("/login?registered=true");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Đăng ký thất bại";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(password);
  const strengthColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-primary"];
  const strengthLabels = ["Yếu", "Trung bình", "Khá", "Mạnh"];

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0F9FF]">
      {/* Background gradient effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px]" />
        <div className="absolute top-1/4 left-0 w-[600px] h-[600px] bg-primary/3 rounded-full blur-[120px] hidden lg:block" />
      </div>

      {/* Desktop: Split Screen Layout | Mobile: Single Column */}
      <div className="w-full min-h-screen flex flex-col lg:flex-row">
        {/* Left Side - Branding (Desktop Only) */}
        <motion.div 
          className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center px-12 py-16 relative overflow-hidden"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Modern Gradient Background with Multiple Layers */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
          
          {/* Aurora-style animated gradient overlay */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-tr from-transparent via-primary/8 to-primary/12"
            animate={{
              opacity: [0.4, 0.7, 0.4],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          
          {/* Animated mesh gradient - top left (floating) */}
          <motion.div
            className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(6,182,212,0.15),transparent_50%)]"
            animate={{
              x: [0, 20, 0],
              y: [0, 15, 0],
              opacity: [0.6, 0.9, 0.6],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          
          {/* Animated mesh gradient - bottom right (floating) */}
          <motion.div
            className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(8,145,178,0.12),transparent_50%)]"
            animate={{
              x: [0, -25, 0],
              y: [0, -20, 0],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2,
            }}
          />
          
          {/* Large animated gradient orb - top right (floating) */}
          <motion.div
            className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary/20 blur-3xl"
            animate={{
              scale: [1, 1.3, 1],
              x: [0, 30, 0],
              y: [0, 20, 0],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          
          {/* Medium animated gradient orb - bottom left (floating) */}
          <motion.div
            className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-primary/15 blur-3xl"
            animate={{
              scale: [1, 1.4, 1],
              x: [0, -25, 0],
              y: [0, -15, 0],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.5,
            }}
          />
          
          {/* Small floating orb - center */}
          <motion.div
            className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full bg-primary/10 blur-2xl -translate-x-1/2 -translate-y-1/2"
            animate={{
              scale: [1, 1.2, 1],
              x: ["-50%", "-45%", "-50%"],
              y: ["-50%", "-55%", "-50%"],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 14,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 3,
            }}
          />
          
          {/* Additional mesh gradient - center right (subtle) */}
          <motion.div
            className="absolute inset-0 bg-[radial-gradient(circle_at_85%_50%,rgba(6,182,212,0.08),transparent_40%)]"
            animate={{
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 16,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 4,
            }}
          />
          <div className="relative z-10 max-w-md text-center">
            <motion.div 
              className="w-32 h-32 rounded-3xl glass-card flex items-center justify-center mb-8 animate-glow mx-auto p-0 overflow-hidden"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
            >
              <Image
                src="/logo-homeeasy.svg"
                alt="Home Easy"
                width={144}
                height={144}
                className="w-full h-full object-contain drop-shadow-[0_6px_24px_rgba(88,199,142,0.4)]"
                priority
              />
            </motion.div>
            <motion.h1 
              className="font-[family-name:var(--font-poppins)] text-[#0F172A] tracking-tight text-4xl lg:text-5xl font-bold leading-tight mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Bắt đầu hành trình của bạn
            </motion.h1>
            <motion.p 
              className="text-[#475569] text-lg leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Tạo tài khoản để quản lý tài sản của bạn hiệu quả cùng Home Easy.
            </motion.p>
          </div>
        </motion.div>

        {/* Right Side - Form (Desktop) / Full Screen (Mobile) */}
        <motion.div 
          className="relative flex h-full w-full lg:w-1/2 flex-col overflow-hidden bg-white min-h-screen lg:shadow-2xl"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Top App Bar - Mobile Only */}
          <motion.div 
            className="flex lg:hidden items-center px-4 py-3 pb-2 justify-between z-10 glass"
            variants={itemVariants}
          >
            <Link
              href="/login"
              className="flex size-12 items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-[#0F172A] cursor-pointer"
            >
              <motion.div whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }}>
                <ArrowLeftOutlined className="w-5 h-5" />
              </motion.div>
            </Link>
            <div className="size-12"></div>
          </motion.div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto px-5 lg:px-12 pt-2 pb-8 lg:pb-12 custom-scrollbar lg:flex lg:items-center lg:justify-center">
            <div className="max-w-md w-full mx-auto lg:py-12">
              {/* Headline Section */}
              <motion.div className="mb-8" variants={itemVariants}>
                <h2 className="text-3xl lg:text-2xl font-bold leading-tight tracking-tight text-[#0F172A] mb-3 font-[family-name:var(--font-poppins)]">
                  Tạo tài khoản mới
                </h2>
                <p className="text-[#475569] text-base lg:text-sm font-normal leading-relaxed">
                  Quản lý tài sản của bạn hiệu quả cùng Home Easy.
                </p>
              </motion.div>

          {/* Error Message */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                className="mb-5 p-4 rounded-xl glass-card border-red-500/30 flex items-center gap-3"
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ type: "spring" as const, stiffness: 500, damping: 30 }}
              >
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form Fields */}
          <motion.form 
            className="space-y-5" 
            onSubmit={onSubmit}
            variants={containerVariants}
          >
            {/* Role Selection */}
            <motion.div className="flex flex-col gap-4" variants={itemVariants}>
              <label className="text-base font-semibold text-[#0F172A]">
                Bạn đăng ký với vai trò nào?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <motion.button
                  type="button"
                  onClick={() => {
                    setRole("landlord");
                    setShowRoleError(false);
                    setError(null);
                  }}
                  className={`p-6 rounded-xl border-2 transition-all text-left ${
                    role === "landlord"
                      ? "border-primary bg-primary/5 shadow-lg"
                      : "border-[#E2E8F0] bg-white hover:border-primary/50"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <BuildOutlined className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-semibold text-lg mb-1">Chủ trọ</h3>
                  <p className="text-sm text-[#64748B]">
                    Quản lý tài sản, phòng trọ và người thuê
                  </p>
                </motion.button>
                
                <motion.button
                  type="button"
                  onClick={() => {
                    setRole("tenant");
                    setShowRoleError(false);
                    setError(null);
                  }}
                  className={`p-6 rounded-xl border-2 transition-all text-left ${
                    role === "tenant"
                      ? "border-primary bg-primary/5 shadow-lg"
                      : "border-[#E2E8F0] bg-white hover:border-primary/50"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <HomeOutlined className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-semibold text-lg mb-1">Người thuê</h3>
                  <p className="text-sm text-[#64748B]">
                    Xem hóa đơn, đăng ký bảo trì và hợp đồng
                  </p>
                </motion.button>
              </div>
              {showRoleError && !role && (
                <p className="text-sm text-red-400">Vui lòng chọn vai trò của bạn</p>
              )}
            </motion.div>

            {/* Full Name */}
            <motion.div className="flex flex-col gap-2" variants={itemVariants}>
              <label className="text-sm font-medium text-[#0F172A] ml-1">Họ và tên</label>
              <Input
                className="input-glass w-full h-14 rounded-xl text-[#0F172A] text-base"
                placeholder="Nhập họ và tên của bạn"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </motion.div>

            {/* Email/Phone */}
            <motion.div className="flex flex-col gap-2" variants={itemVariants}>
              <label className="text-sm font-medium text-[#0F172A] ml-1">Email hoặc Số điện thoại</label>
              <Input
                className="input-glass w-full h-14 rounded-xl text-[#0F172A] text-base"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </motion.div>

            {/* Password */}
            <motion.div className="flex flex-col gap-2" variants={itemVariants}>
              <label className="text-sm font-medium text-[#0F172A] ml-1">Mật khẩu</label>
              <Password
                className="input-glass w-full h-14 rounded-xl text-[#0F172A] text-base [&_.ant-input]:bg-transparent [&_.ant-input]:border-none [&_.ant-input]:outline-none [&_.ant-input]:text-[#0F172A] [&_.ant-input]:text-base [&_.ant-input]:h-full [&_.ant-input]:px-4 [&_.ant-input-password-icon]:text-[#64748B] [&_.ant-input-password-icon]:hover:text-[#0F172A]"
                placeholder="Tối thiểu 8 ký tự"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
              {/* Password strength indicator */}
              {password.length > 0 && (
                <motion.div 
                  className="flex items-center gap-2 mt-1"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                >
                  <div className="flex gap-1 flex-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          i < passwordStrength ? strengthColors[passwordStrength - 1] : "bg-[#1E4758]"
                        }`}
                      />
                    ))}
                  </div>
                  <span className={`text-xs font-medium ${
                    passwordStrength > 0 ? strengthColors[passwordStrength - 1].replace("bg-", "text-") : "text-[#64748B]"
                  }`}>
                    {passwordStrength > 0 ? strengthLabels[passwordStrength - 1] : ""}
                  </span>
                </motion.div>
              )}
            </motion.div>

            {/* Confirm Password */}
            <motion.div className="flex flex-col gap-2" variants={itemVariants}>
              <label className="text-sm font-medium text-[#0F172A] ml-1">Xác nhận mật khẩu</label>
              <Password
                className="input-glass w-full h-14 rounded-xl text-[#0F172A] text-base [&_.ant-input]:bg-transparent [&_.ant-input]:border-none [&_.ant-input]:outline-none [&_.ant-input]:text-[#0F172A] [&_.ant-input]:text-base [&_.ant-input]:h-full [&_.ant-input]:px-4 [&_.ant-input-password-icon]:text-[#64748B] [&_.ant-input-password-icon]:hover:text-[#0F172A]"
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              {/* Password match indicator */}
              {confirmPassword.length > 0 && (
                <motion.div 
                  className={`flex items-center gap-2 mt-1 text-xs ${
                    password === confirmPassword ? "text-primary" : "text-red-400"
                  }`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {password === confirmPassword ? (
                    <>
                      <CheckOutlined className="w-4 h-4" />
                      <span>Mật khẩu khớp</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      <span>Mật khẩu không khớp</span>
                    </>
                  )}
                </motion.div>
              )}
            </motion.div>

            {/* Terms Checkbox */}
            <motion.div 
              className="flex items-start gap-3 py-2"
              variants={itemVariants}
            >
              <motion.button
                type="button"
                onClick={() => setAgreeTerms(!agreeTerms)}
                className={`size-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                  agreeTerms 
                    ? "bg-primary border-primary" 
                    : "border-[#1E4758] hover:border-primary/50"
                }`}
                whileTap={{ scale: 0.9 }}
              >
                <AnimatePresence>
                  {agreeTerms && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <CheckOutlined className="w-4 h-4 text-white" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
              <div className="text-sm leading-relaxed">
                <span className="text-[#475569]">
                  Tôi đồng ý với{" "}
                  <Link className="font-semibold text-primary hover:underline underline-offset-2" href="#">
                    Điều khoản &amp; Chính sách
                  </Link>{" "}
                  của Home Easy.
                </span>
              </div>
            </motion.div>

            {/* Submit Button */}
            <motion.button
              className="glass-button w-full h-14 rounded-xl text-white text-base font-bold mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              type="submit"
              disabled={loading || !role}
              variants={itemVariants}
              whileHover={{ scale: loading || !role ? 1 : 1.02 }}
              whileTap={{ scale: loading || !role ? 1 : 0.98 }}
            >
              {loading ? (
                <>
                  <LoadingOutlined className="w-5 h-5 animate-spin" />
                  <span>Đang đăng ký...</span>
                </>
              ) : (
                "Đăng ký"
              )}
            </motion.button>
          </motion.form>

          {/* Divider */}
          <motion.div 
            className="relative py-8"
            variants={itemVariants}
          >
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#1E4758]"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-sm text-[#64748B]">
                Hoặc đăng ký bằng
              </span>
            </div>
          </motion.div>

          {/* Social Logins */}
          {hasGoogleClient ? (
            <motion.div
              variants={itemVariants}
              className={socialLoading ? "opacity-70 pointer-events-none" : ""}
            >
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() =>
                  setError("Đăng ký Google thất bại. Vui lòng thử lại.")
                }
                nonce={googleNonce}
                text="continue_with"
                shape="pill"
                size="large"
                theme="outline"
                useOneTap={false}
              />
            </motion.div>
          ) : (
            <motion.div
              className="glass-card flex items-center justify-center gap-3 rounded-xl h-12 border-dashed border border-[#1E4758]"
              variants={itemVariants}
            >
              <span className="text-[#64748B] text-sm">Thiếu Google Client ID</span>
            </motion.div>
          )}

              {/* Footer Login Link */}
              <motion.div 
                className="mt-10 text-center pb-6"
                variants={itemVariants}
              >
                <p className="text-sm text-[#64748B]">
                  Bạn đã có tài khoản?{" "}
                  <Link 
                    className="font-bold text-primary hover:underline underline-offset-2 ml-1" 
                    href="/login"
                  >
                    Đăng nhập
                  </Link>
                </p>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
