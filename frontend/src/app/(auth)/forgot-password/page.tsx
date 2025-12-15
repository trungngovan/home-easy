 "use client";

import { FormEvent, useState } from "react";
 import { useRouter } from "next/navigation";
 import Link from "next/link";
 import { motion } from "framer-motion";
 import { ArrowLeftOutlined, LoadingOutlined } from '@ant-design/icons'
import { CheckCircle2 } from 'lucide-react';
import Image from "next/image";
import { Input } from "antd";

 const containerVariants = {
   hidden: { opacity: 0 },
   visible: {
     opacity: 1,
     transition: { staggerChildren: 0.05, delayChildren: 0.05 },
   },
 };

 const itemVariants = {
   hidden: { opacity: 0, y: 20 },
   visible: {
     opacity: 1,
     y: 0,
     transition: { type: "spring" as const, stiffness: 260, damping: 20 },
   },
 };

const logoVariants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 200, damping: 16 },
  },
};

 export default function ForgotPasswordPage() {
   const router = useRouter();
   const [email, setEmail] = useState("");
   const [submitting, setSubmitting] = useState(false);
   const [submitted, setSubmitted] = useState(false);
   const [error, setError] = useState<string | null>(null);

   const onSubmit = async (e: FormEvent) => {
     e.preventDefault();
     setSubmitting(true);
     setError(null);
     try {
       // TODO: integrate backend reset endpoint when available
       await new Promise((resolve) => setTimeout(resolve, 600));
       setSubmitted(true);
     } catch (err: unknown) {
       const message =
         err instanceof Error ? err.message : "Không thể gửi yêu cầu";
       setError(message);
     } finally {
       setSubmitting(false);
     }
   };

   return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0F9FF]">
      {/* Background accents */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary/3 rounded-full blur-[100px] hidden lg:block" />
      </div>

      <div className="w-full min-h-screen flex flex-col lg:flex-row">
        {/* Left hero (desktop) */}
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
              className="w-36 h-36 rounded-3xl glass-card flex items-center justify-center mb-8 animate-glow mx-auto p-0 overflow-hidden"
              variants={logoVariants}
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
              className="font-[family-name:var(--font-poppins)] text-[#0F172A] tracking-tight text-4xl lg:text-5xl font-bold leading-tight mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Quên mật khẩu?
            </motion.h1>
            <motion.p
              className="text-[#475569] text-lg leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Nhập email đã đăng ký. Chúng tôi sẽ gửi hướng dẫn khi tính năng khôi phục được bật.
            </motion.p>
          </div>
        </motion.div>

        {/* Right: form area */}
        <motion.div
          className="relative flex h-full min-h-screen w-full lg:w-1/2 flex-col bg-white overflow-x-hidden lg:shadow-2xl"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Mobile top bar */}
          <motion.div
            className="flex lg:hidden items-center px-4 py-3 pb-2 justify-between sticky top-0 z-10 glass"
            variants={itemVariants}
          >
            <motion.button
              className="text-[#0F172A] flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.back()}
            >
              <ArrowLeftOutlined className="w-5 h-5" />
            </motion.button>
            <h2 className="text-[#0F172A] text-lg font-semibold leading-tight tracking-tight flex-1 text-center pr-12">
              Quên mật khẩu
            </h2>
          </motion.div>

          <div className="flex-1 overflow-y-auto px-5 lg:px-12 pb-10 lg:pb-16 custom-scrollbar lg:flex lg:items-center lg:justify-center">
            <div className="max-w-md w-full mx-auto lg:py-12">
              {/* Mobile hero */}
              <motion.div
                className="flex lg:hidden flex-col items-center justify-center pt-10 pb-8"
                variants={containerVariants}
              >
                <motion.div
                  className="w-20 h-20 rounded-2xl glass-card flex items-center justify-center mb-5 animate-glow p-0 overflow-hidden"
                  variants={logoVariants}
                >
                  <Image
                    src="/logo-homeeasy.svg"
                    alt="Home Easy"
                    width={96}
                    height={96}
                    className="w-full h-full object-contain drop-shadow-[0_6px_18px_rgba(88,199,142,0.35)]"
                    priority
                  />
                </motion.div>
                <motion.h1
                  className="font-[family-name:var(--font-poppins)] text-[#0F172A] tracking-tight text-3xl font-bold leading-tight text-center"
                  variants={itemVariants}
                >
                  Quên mật khẩu?
                </motion.h1>
                <motion.p
                  className="text-[#475569] text-base font-normal leading-relaxed pt-3 text-center max-w-[280px]"
                  variants={itemVariants}
                >
                  Nhập email đã đăng ký để nhận hướng dẫn khôi phục.
                </motion.p>
              </motion.div>

              {/* Desktop title */}
              <motion.div className="hidden lg:block mb-8" variants={itemVariants}>
                <h2 className="text-[#0F172A] text-2xl font-bold mb-2">Đặt lại mật khẩu</h2>
                <p className="text-[#475569] text-sm">
                  Chúng tôi sẽ gửi hướng dẫn đến email đã đăng ký.
                </p>
              </motion.div>

              {/* Form */}
              <motion.form
                className="flex flex-col gap-5"
                onSubmit={onSubmit}
                variants={containerVariants}
              >
                <motion.label className="flex flex-col gap-2" variants={itemVariants}>
                  <span className="text-[#0F172A] text-sm font-medium leading-normal ml-1">
                    Email
                  </span>
                  <Input
                    className="input-glass w-full h-14 rounded-xl text-[#0F172A] text-base"
                    placeholder="email@example.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </motion.label>

                {error && (
                  <motion.div
                    className="p-4 rounded-xl glass-card border-red-500/30 text-red-400 text-sm"
                    variants={itemVariants}
                  >
                    {error}
                  </motion.div>
                )}

                <motion.button
                  type="submit"
                  disabled={submitting || submitted}
                  className="glass-button w-full h-14 rounded-xl text-white text-base font-bold mt-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  variants={itemVariants}
                  whileHover={{ scale: submitting || submitted ? 1 : 1.02 }}
                  whileTap={{ scale: submitting || submitted ? 1 : 0.98 }}
                >
                  {submitted ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Đã ghi nhận yêu cầu</span>
                    </>
                  ) : submitting ? (
                    <>
                      <LoadingOutlined className="w-5 h-5 animate-spin" />
                      <span>Đang gửi...</span>
                    </>
                  ) : (
                    "Gửi yêu cầu"
                  )}
                </motion.button>
              </motion.form>

              <motion.div
                className="flex items-center justify-center gap-2 mt-8 text-sm text-[#475569]"
                variants={itemVariants}
              >
                <span>Nhớ mật khẩu?</span>
                <Link
                  href="/login"
                  className="text-primary font-semibold hover:underline underline-offset-2"
                >
                  Quay lại đăng nhập
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
     </div>
   );
 }
