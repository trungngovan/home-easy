"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BuildOutlined, HomeOutlined, LoadingOutlined } from '@ant-design/icons';

type UserInfo = {
  email: string;
  full_name: string;
  avatar: string;
};

type RoleSelectionModalProps = {
  show: boolean;
  userInfo: UserInfo | null;
  onRoleSelected: (role: "landlord" | "tenant") => Promise<void>;
  onClose?: () => void;
};

export default function RoleSelectionModal({
  show,
  userInfo,
  onRoleSelected,
  onClose,
}: RoleSelectionModalProps) {
  const [selectedRole, setSelectedRole] = useState<"landlord" | "tenant" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!selectedRole) {
      setError("Vui lòng chọn vai trò của bạn");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onRoleSelected(selectedRole);
      // Modal will be closed by parent after successful role selection
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
      setLoading(false);
    }
  };

  if (!show || !userInfo) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop với blur */}
        <motion.div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onClose} // Allow closing by clicking backdrop
        />

        {/* Modal content */}
        <motion.div
          className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 z-10"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
        >
          {/* User info từ Google */}
          <div className="text-center mb-6">
            {userInfo.avatar && (
              <img
                src={userInfo.avatar}
                alt={userInfo.full_name}
                className="w-16 h-16 rounded-full mx-auto mb-3 border-2 border-primary/20"
              />
            )}
            <h2 className="text-xl font-semibold text-[#0F172A] mb-1">
              {userInfo.full_name}
            </h2>
            <p className="text-sm text-[#64748B]">{userInfo.email}</p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.div>
          )}

          {/* Role selection label */}
          <label className="text-base font-semibold text-[#0F172A] mb-4 block">
            Chọn vai trò của bạn
          </label>

          {/* Role selection cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <motion.button
              type="button"
              onClick={() => {
                setSelectedRole("landlord");
                setError(null);
              }}
              disabled={loading}
              className={`p-6 rounded-xl border-2 transition-all text-left disabled:opacity-50 ${
                selectedRole === "landlord"
                  ? "border-primary bg-primary/5 shadow-lg"
                  : "border-[#E2E8F0] bg-white hover:border-primary/50"
              }`}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
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
                setSelectedRole("tenant");
                setError(null);
              }}
              disabled={loading}
              className={`p-6 rounded-xl border-2 transition-all text-left disabled:opacity-50 ${
                selectedRole === "tenant"
                  ? "border-primary bg-primary/5 shadow-lg"
                  : "border-[#E2E8F0] bg-white hover:border-primary/50"
              }`}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
            >
              <HomeOutlined className="w-8 h-8 text-primary mb-3" />
              <h3 className="font-semibold text-lg mb-1">Người thuê</h3>
              <p className="text-sm text-[#64748B]">
                Xem hóa đơn, đăng ký bảo trì và hợp đồng
              </p>
            </motion.button>
          </div>

          {!selectedRole && error && (
            <p className="text-sm text-red-400 mb-4">Vui lòng chọn vai trò của bạn</p>
          )}

          {/* Continue button */}
          <button
            onClick={handleContinue}
            disabled={!selectedRole || loading}
            className="glass-button w-full h-12 rounded-xl text-white text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <LoadingOutlined className="w-5 h-5 animate-spin" />
                <span>Đang tạo tài khoản...</span>
              </>
            ) : (
              "Tiếp tục"
            )}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
