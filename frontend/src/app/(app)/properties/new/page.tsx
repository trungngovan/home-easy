"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, endpoints, clearAuthToken } from "@/lib/api";
import { motion } from "framer-motion";
import { ArrowLeftOutlined, BuildOutlined, FileTextOutlined, LoadingOutlined } from '@ant-design/icons'
import { MapPin } from 'lucide-react';
import { Input } from "antd";

export default function NewPropertyPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Vui lòng nhập tên tài sản");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiFetch(endpoints.properties, {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim(),
          description: description.trim(),
        }),
      });
      router.push("/properties");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Không thể tạo tài sản";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <motion.div
        className="flex items-center gap-4 mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Link
          href="/properties" >
          <ArrowLeftOutlined className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-[family-name:var(--font-poppins)] text-2xl lg:text-3xl font-bold text-[#0F172A]">
            Thêm tài sản mới
          </h1>
          <p className="text-[#475569] mt-1">
            Tạo nhà trọ, căn hộ hoặc tòa nhà mới
          </p>
        </div>
      </motion.div>

      {/* Form */}
      <motion.div
        className="w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
              {error}
            </div>
          )}

          {/* Name */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
            <label className="block mb-4">
              <span >
                <BuildOutlined className="w-4 h-4 text-primary" />
                Tên tài sản <span className="text-red-400">*</span>
              </span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Nhà trọ Minh Tâm, Căn hộ ABC..."
                required
              />
            </label>

            <label className="block mb-4">
              <span >
                <MapPin className="w-4 h-4 text-primary" />
                Địa chỉ
              </span>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="VD: 123 Nguyễn Văn A, Quận 1, TP.HCM"
              />
            </label>

            <label className="block">
              <span >
                <FileTextOutlined className="w-4 h-4 text-primary" />
                Mô tả
              </span>
              <Input.TextArea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Thông tin thêm về tài sản..."
                rows={4}
              />
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-bg-dark font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <LoadingOutlined className="w-4 h-4 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                <>
                  <BuildOutlined className="w-4 h-4" />
                  Tạo tài sản
                </>
              )}
            </button>
            <Link
              href="/properties" >
              Hủy
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
