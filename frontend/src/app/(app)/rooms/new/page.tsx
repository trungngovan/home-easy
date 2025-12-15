"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  apiFetch,
  endpoints,
  clearAuthToken,
  PaginatedResponse,
  buildPaginatedPath,
} from "@/lib/api";
import { motion } from "framer-motion";
import { ArrowLeftOutlined, BuildOutlined, FileTextOutlined, HomeOutlined, LoadingOutlined, WalletOutlined } from '@ant-design/icons'
import { Layers, Ruler,  } from 'lucide-react';
import { Select, Input, InputNumber } from "antd";

type Property = {
  id: string;
  name: string;
};

export default function NewRoomPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedProperty, setSelectedProperty] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [floor, setFloor] = useState("1");
  const [area, setArea] = useState("");
  const [baseRent, setBaseRent] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const propsData = await apiFetch<PaginatedResponse<Property>>(
          buildPaginatedPath(endpoints.properties, { pageSize: 200 })
        );
        setProperties(propsData.results || []);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Không thể tải dữ liệu";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProperty) {
      setError("Vui lòng chọn tài sản");
      return;
    }
    if (!roomNumber.trim()) {
      setError("Vui lòng nhập số phòng");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiFetch(endpoints.rooms, {
        method: "POST",
        body: JSON.stringify({
          building: selectedProperty,
          room_number: roomNumber.trim(),
          floor: parseInt(floor) || 1,
          area: area ? parseFloat(area) : null,
          base_rent: baseRent ? parseFloat(baseRent) : 0,
          description: description.trim(),
          status: "vacant",
        }),
      });
      router.push("/rooms");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Không thể tạo phòng";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center gap-3 text-[#475569]">
        <LoadingOutlined className="w-5 h-5 animate-spin" />
        Đang tải...
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <motion.div
        className="flex items-center gap-4 mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Link
          href="/rooms" >
          <ArrowLeftOutlined className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-[family-name:var(--font-poppins)] text-2xl lg:text-3xl font-bold text-[#0F172A]">
            Thêm phòng mới
          </h1>
          <p className="text-[#475569] mt-1">
            Tạo phòng cho thuê trong tài sản
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

          {/* Property Selection */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
            <label className="block mb-4">
              <span >
                <BuildOutlined className="w-4 h-4 text-primary" />
                Tài sản <span className="text-red-400">*</span>
              </span>
              <Select
                className="w-full h-12 bg-white"
                placeholder="Chọn tài sản"
                value={selectedProperty || undefined}
                onChange={(value) => setSelectedProperty(value)}
              >
                {properties.map((prop) => (
                  <Select.Option key={prop.id} value={prop.id}>
                    {prop.name}
                  </Select.Option>
                ))}
              </Select>
            </label>

            {properties.length === 0 && (
              <p className="text-[#475569] text-sm">
                Chưa có tài sản nào.{" "}
                <Link href="/properties/new" className="text-primary hover:underline">
                  Tạo tài sản đầu tiên
                </Link>
              </p>
            )}
          </div>

          {/* Room Details */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
            <h3 className="text-lg font-semibold text-[#0F172A] mb-4 flex items-center gap-2">
              <HomeOutlined className="w-5 h-5 text-primary" />
              Thông tin phòng
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-[#475569] text-sm mb-1.5 block">
                  Số phòng <span className="text-red-400">*</span>
                </span>
                <Input
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder="VD: 101, A01..."
                  required
                />
              </label>

              <label className="block">
                <span className="text-[#475569] text-sm mb-1.5 block flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" /> Tầng
                </span>
                <InputNumber
                  value={parseInt(floor) || 1}
                  onChange={(value) => setFloor(value?.toString() || "1")}
                  min={1}
                  style={{ width: '100%' }}
                />
              </label>

              <label className="block">
                <span className="text-[#475569] text-sm mb-1.5 block flex items-center gap-1">
                  <Ruler className="w-3.5 h-3.5" /> Diện tích (m²)
                </span>
                <InputNumber
                  value={area ? parseFloat(area) : undefined}
                  onChange={(value) => setArea(value?.toString() || "")}
                  placeholder="VD: 20"
                  step={0.1}
                  min={0}
                  style={{ width: '100%' }}
                />
              </label>

              <label className="block">
                <span className="text-[#475569] text-sm mb-1.5 block flex items-center gap-1">
                  <WalletOutlined className="w-3.5 h-3.5" /> Giá thuê (VNĐ/tháng)
                </span>
                <InputNumber
                  value={baseRent ? parseFloat(baseRent) : undefined}
                  onChange={(value) => setBaseRent(value?.toString() || "")}
                  placeholder="VD: 3000000"
                  step={100000}
                  min={0}
                  style={{ width: '100%' }}
                />
              </label>
            </div>

            <label className="block mt-4">
              <span className="text-[#475569] text-sm mb-1.5 block flex items-center gap-1">
                <FileTextOutlined className="w-3.5 h-3.5" /> Mô tả
              </span>
              <Input.TextArea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Thông tin thêm về phòng..."
                rows={3}
              />
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={submitting || properties.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-bg-dark font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <LoadingOutlined className="w-4 h-4 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                <>
                  <HomeOutlined className="w-4 h-4" />
                  Tạo phòng
                </>
              )}
            </button>
            <Link
              href="/rooms" >
              Hủy
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
