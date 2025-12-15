"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { Input, InputNumber } from "antd";

type Property = {
  id: string;
  name: string;
};

type Room = {
  id: string;
  building: string;
  room_number: string;
  floor: number;
  area: number | null;
  base_rent: number;
  status: "vacant" | "occupied" | "maintenance" | string;
  description: string;
};

export default function EditRoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = (() => {
    try {
      if (params && typeof params === "object" && "id" in params) {
        return String(params.id);
      }
      return "";
    } catch {
      return "";
    }
  })();

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
  const [status, setStatus] = useState("vacant");

  const statusLabels: Record<string, string> = {
    vacant: "Trống",
    occupied: "Đang thuê",
    maintenance: "Bảo trì",
  };

  const statusStyles: Record<string, string> = {
    vacant: "bg-green-500/20 text-green-400 border-green-500/30",
    occupied: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    maintenance: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [roomData, propsData] = await Promise.all([
          apiFetch<Room>(`${endpoints.rooms}${roomId}/`),
          apiFetch<PaginatedResponse<Property>>(buildPaginatedPath(endpoints.properties, { pageSize: 200 })),
        ]);

        setProperties(propsData.results || []);
        setSelectedProperty(roomData.building);
        setRoomNumber(roomData.room_number);
        setFloor(String(roomData.floor || 1));
        setArea(roomData.area !== null ? String(roomData.area) : "");
        setBaseRent(roomData.base_rent ? String(roomData.base_rent) : "");
        setDescription(roomData.description || "");
        setStatus(roomData.status || "vacant");
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Không thể tải dữ liệu";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    if (roomId) {
      loadData();
    }
  }, [roomId, router]);

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
      await apiFetch(`${endpoints.rooms}${roomId}/`, {
        method: "PATCH",
        body: JSON.stringify({
          building: selectedProperty,
          room_number: roomNumber.trim(),
          floor: parseInt(floor) || 1,
          area: area ? parseFloat(area) : null,
          base_rent: baseRent ? parseFloat(baseRent) : 0,
          description: description.trim(),
          // status is locked; updated via tenancy/contract lifecycle
        }),
      });
      router.push(`/rooms/${roomId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Không thể cập nhật phòng";
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
          href={`/rooms/${roomId}`} >
          <ArrowLeftOutlined className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-[family-name:var(--font-poppins)] text-2xl lg:text-3xl font-bold text-[#0F172A]">Cập nhật phòng</h1>
          <p className="text-[#475569] mt-1">
            Chỉnh sửa thông tin phòng; tài sản và trạng thái được khóa
          </p>
        </div>
      </motion.div>

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
            <div className="text-lg font-semibold text-[#0F172A] mb-2 flex items-center gap-2">
              <BuildOutlined className="w-4 h-4 text-primary" />
              Tài sản (không thể đổi tại đây)
            </div>
            <div >
              {properties.find((p) => p.id === selectedProperty)?.name || "Chưa xác định"}
            </div>
            <p className="text-[#475569] text-sm mt-2">
              Muốn đổi tài sản, hãy tạo phòng mới và di chuyển hợp đồng.
            </p>
          </div>

          {/* Room Details */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#0F172A] flex items-center gap-2">
                <HomeOutlined className="w-5 h-5 text-primary" />
                Thông tin phòng
              </h3>
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 text-sm font-medium rounded-full border ${statusStyles[status] || "border-[#E2E8F0] text-[#475569]"}`}
                >
                  {statusLabels[status] || status}
                </span>
                <span className="text-[#475569] text-xs">
                  Trạng thái tự đổi khi gán / hết hạn hợp đồng.
                </span>
              </div>
            </div>

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
                <span className="text-[#475569] text-sm mb-1.5 flex items-center gap-1">
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
                <span className="text-[#475569] text-sm mb-1.5 flex items-center gap-1">
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
                <span className="text-[#475569] text-sm mb-1.5 flex items-center gap-1">
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

            <label className="block">
              <span className="text-[#475569] text-sm mb-1.5 flex items-center gap-1">
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
                  Đang lưu...
                </>
              ) : (
                <>
                  <HomeOutlined className="w-4 h-4" />
                  Lưu thay đổi
                </>
              )}
            </button>
            <Link
              href={`/rooms/${roomId}`} >
              Hủy
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
