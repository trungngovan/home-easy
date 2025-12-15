"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeftOutlined, BuildOutlined, LoadingOutlined } from '@ant-design/icons'
import { AlertCircle } from 'lucide-react';
import Image from "next/image";
import { apiFetch, endpoints, setAuthToken, setRefreshToken, setUser, LoginResponse, getAuthToken, getUser } from "@/lib/api";
import { GoogleLogin } from "@react-oauth/google";
import { Input } from "antd";
import RoleSelectionModal from "@/components/RoleSelectionModal";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
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

const logoVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 200,
      damping: 15,
    },
  },
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [oauthUserInfo, setOAuthUserInfo] = useState<{
    email: string;
    full_name: string;
    avatar: string;
  } | null>(null);
  const [googleCredential, setGoogleCredential] = useState<string | null>(null);
  const hasGoogleClient = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
  const [googleNonce] = useState<string>(() => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).slice(2);
  });

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const token = getAuthToken();
    const user = getUser();
    
    if (token && user) {
      router.replace("/dashboard");
    } else {
      setCheckingAuth(false);
    }
  }, [router]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Use webLogin endpoint - both landlords and tenants can access web
      const data = await apiFetch<LoginResponse>(endpoints.webLogin, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      await persistAuth(data);
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : "Đăng nhập thất bại";
      const parsed = parseApiError(raw);
      setError(parsed);
    } finally {
      setLoading(false);
    }
  };

  const persistAuth = async (data: LoginResponse) => {
    // Save auth data
    setAuthToken(data.access);
    setRefreshToken(data.refresh);
    setUser(data.user);

    // Verify data was saved correctly
    const savedToken = localStorage.getItem("access_token");
    const savedUser = localStorage.getItem("user");
    if (!savedToken || !savedUser) {
      throw new Error("Không thể lưu thông tin đăng nhập. Vui lòng thử lại.");
    }

    router.push("/dashboard");
  };

  const handleGoogleSuccess = async (credentialResponse: { credential?: string | null }) => {
    const credential = credentialResponse?.credential;
    if (!credential) {
      setError("Không nhận được token từ Google. Vui lòng thử lại.");
      return;
    }
    
    setSocialLoading(true);
    setError(null);
    
    try {
      // First attempt: try without role to check if user exists
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api"}${endpoints.googleWebLogin}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id_token: credential, nonce: googleNonce }),
      });
      
      if (response.ok) {
        // User exists - login directly
        const data = await response.json();
        await persistAuth(data as LoginResponse);
        return;
      }
      
      // Check if response indicates role selection is required
      const errorText = await response.text();
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.requires_role_selection && errorData.user_info) {
          // User doesn't exist - show role selection modal
          setOAuthUserInfo(errorData.user_info);
          setGoogleCredential(credential);
          setShowRoleModal(true);
          setSocialLoading(false);
          return;
        }
      } catch {
        // Not JSON, continue with normal error handling
      }
      
      // If it's a different error, show it
      const parsed = parseApiError(`API error ${response.status}: ${errorText}`);
      setError(parsed);
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : "Đăng nhập Google thất bại";
      const parsed = parseApiError(raw);
      setError(parsed);
    } finally {
      setSocialLoading(false);
    }
  };

  const handleRoleSelected = async (role: "landlord" | "tenant") => {
    if (!googleCredential) {
      setError("Không tìm thấy thông tin đăng nhập. Vui lòng thử lại.");
      setShowRoleModal(false);
      return;
    }

    setSocialLoading(true);
    setError(null);

    try {
      const data = await apiFetch<LoginResponse>(endpoints.googleWebLogin, {
        method: "POST",
        body: JSON.stringify({
          id_token: googleCredential,
          role: role,
          nonce: googleNonce,
        }),
      });
      
      await persistAuth(data);
      setShowRoleModal(false);
      setOAuthUserInfo(null);
      setGoogleCredential(null);
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : "Đăng ký Google thất bại";
      setError(raw);
    } finally {
      setSocialLoading(false);
    }
  };

  const parseApiError = (raw: string): string => {
    // Friendly defaults
    const defaultMsg = "Đăng nhập thất bại. Vui lòng kiểm tra email/mật khẩu.";
    // Try to parse JSON body from "API error 401: {...}"
    const jsonStart = raw.indexOf("{");
    if (jsonStart !== -1) {
      try {
        const json = JSON.parse(raw.slice(jsonStart));
        if (json.detail) return typeof json.detail === "string" ? json.detail : defaultMsg;
        if (json.error) return json.error;
        if (Array.isArray(json.non_field_errors) && json.non_field_errors[0]) return json.non_field_errors[0];
      } catch (_) {
        // ignore parse errors
      }
    }
    if (raw.includes("401")) return "Sai thông tin đăng nhập hoặc tài khoản chưa được kích hoạt.";
    return defaultMsg;
  };

  // Show loading spinner while checking existing auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#F0F9FF] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0F9FF]">
      {/* Background gradient effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary/3 rounded-full blur-[100px] hidden lg:block" />
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
          
          {/* Medium animated gradient orb - bottom left (floving) */}
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
              variants={logoVariants}
            >
              <Image
                src="/logo-homeeasy.svg"
                alt="Home Easy"
                width={128}
                height={128}
                className="w-full h-full object-contain drop-shadow-[0_6px_24px_rgba(88,199,142,0.4)]"
                priority
              />
            </motion.div>
            <motion.h1 
              className="font-(family-name:--font-poppins) text-[#0F172A] tracking-tight text-4xl lg:text-5xl font-bold leading-tight mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Chào mừng trở lại
            </motion.h1>
            <motion.p 
              className="text-[#475569] text-lg leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Quản lý tài sản Home Easy dễ dàng và hiệu quả ngay trên tay bạn.
            </motion.p>
          </div>
        </motion.div>

        {/* Right Side - Form (Desktop) / Full Screen (Mobile) */}
        <motion.div 
          className="relative flex h-full min-h-screen w-full lg:w-1/2 flex-col bg-white overflow-x-hidden lg:shadow-2xl"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Top App Bar - Mobile Only */}
          <motion.div 
            className="flex lg:hidden items-center px-4 py-3 pb-2 justify-between sticky top-0 z-10 glass"
            variants={itemVariants}
          >
            <motion.button 
              className="text-[#0F172A] flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeftOutlined className="w-5 h-5" />
            </motion.button>
            <h2 className="text-[#0F172A] text-lg font-semibold leading-tight tracking-tight flex-1 text-center pr-12">
              Đăng nhập
            </h2>
          </motion.div>

          {/* Content Scroll Area */}
          <div className="flex-1 overflow-y-auto px-5 lg:px-12 pb-8 lg:pb-12 custom-scrollbar lg:flex lg:items-center lg:justify-center">
            <div className="max-w-md w-full mx-auto lg:py-12">
              {/* Logo / Branding Area - Mobile Only */}
              <motion.div 
                className="flex lg:hidden flex-col items-center justify-center pt-10 pb-8"
                variants={containerVariants}
              >
                <motion.div 
                  className="w-20 h-20 rounded-2xl glass-card flex items-center justify-center mb-5 animate-glow"
                  variants={logoVariants}
                >
                  <BuildOutlined className="w-10 h-10 text-primary" />
                </motion.div>
                <motion.h1 
                  className="font-(family-name:--font-poppins) text-[#0F172A] tracking-tight text-3xl font-bold leading-tight text-center"
                  variants={itemVariants}
                >
                  Chào mừng trở lại
                </motion.h1>
                <motion.p 
                  className="text-[#475569] text-base font-normal leading-relaxed pt-3 text-center max-w-[280px]"
                  variants={itemVariants}
                >
                  Quản lý tài sản Home Easy dễ dàng và hiệu quả ngay trên tay bạn.
                </motion.p>
              </motion.div>

              {/* Desktop Title */}
              <motion.div 
                className="hidden lg:block mb-8"
                variants={itemVariants}
              >
                <h2 className="text-[#0F172A] text-2xl font-bold mb-2">Đăng nhập</h2>
                <p className="text-[#475569] text-sm">Nhập thông tin để tiếp tục</p>
              </motion.div>

          {/* Error Message */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                className="mb-5 p-4 rounded-xl glass-card border-red-500/30 flex items-center gap-3"
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form Fields */}
          <motion.form 
            className="flex flex-col gap-5 pt-2 stagger-children" 
            onSubmit={onSubmit}
            variants={containerVariants}
          >
            {/* Email Field */}
            <motion.label className="flex flex-col gap-2" variants={itemVariants}>
              <span className="text-[#0F172A] text-sm font-medium leading-normal ml-1">
                Email hoặc Số điện thoại
              </span>
              <Input
                className="input-glass w-full h-14 rounded-xl text-[#0F172A] text-base"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </motion.label>

            {/* Password Field */}
            <motion.label className="flex flex-col gap-2" variants={itemVariants}>
              <span className="text-[#0F172A] text-sm font-medium leading-normal ml-1">
                Mật khẩu
              </span>
              <Input
                className="input-glass w-full h-14 rounded-xl text-[#0F172A] text-base"
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </motion.label>

            {/* Forgot Password Link */}
            <motion.div className="flex justify-end" variants={itemVariants}>
              <Link 
                href="/forgot-password" 
                className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
              >
                Quên mật khẩu?
              </Link>
            </motion.div>

            {/* Primary Action Button */}
            <motion.button
              type="submit"
              disabled={loading}
              className="glass-button w-full h-14 rounded-xl text-white text-base font-bold mt-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              variants={itemVariants}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
            >
              {loading ? (
                <>
                  <LoadingOutlined className="w-5 h-5 animate-spin" />
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                "Đăng nhập"
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
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-3 text-[#64748B]">
                Hoặc đăng nhập bằng
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
                  setError("Đăng nhập Google thất bại. Vui lòng thử lại.")
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

              {/* Footer Register Link */}
              <motion.div 
                className="flex items-center justify-center gap-1.5 mt-10 pb-6"
                variants={itemVariants}
              >
                <p className="text-[#64748B] text-sm">Chưa có tài khoản?</p>
                <Link 
                  href="/register" 
                  className="text-primary font-semibold text-sm hover:underline underline-offset-2"
                >
                  Đăng ký ngay
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Role Selection Modal for OAuth */}
      <RoleSelectionModal
        show={showRoleModal}
        userInfo={oauthUserInfo}
        onRoleSelected={handleRoleSelected}
        onClose={() => {
          setShowRoleModal(false);
          setOAuthUserInfo(null);
          setGoogleCredential(null);
        }}
      />
    </div>
  );
}
