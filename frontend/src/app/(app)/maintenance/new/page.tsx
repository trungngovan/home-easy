"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, endpoints, clearAuthToken, PaginatedResponse, buildPaginatedPath, getUser } from "@/lib/api";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeftOutlined, DropboxOutlined, HomeOutlined, PlusOutlined, ThunderboltOutlined, ToolOutlined, UploadOutlined } from '@ant-design/icons'
import { Wifi, Sofa, HelpCircle } from 'lucide-react';
import { Input, Select, Button, App } from "antd";
import TextArea from "antd/es/input/TextArea";

const categoryConfig: Record<string, { icon: typeof ToolOutlined; color: string; bgColor: string; label: string }> = {
  electricity: { icon: ThunderboltOutlined, color: "text-yellow-400", bgColor: "bg-yellow-500/10", label: "Điện" },
  plumbing: { icon: DropboxOutlined, color: "text-blue-400", bgColor: "bg-blue-500/10", label: "Nước/Ống" },
  appliance: { icon: ToolOutlined, color: "text-orange-400", bgColor: "bg-orange-500/10", label: "Thiết bị" },
  furniture: { icon: Sofa, color: "text-purple-400", bgColor: "bg-purple-500/10", label: "Nội thất" },
  internet: { icon: Wifi, color: "text-cyan-400", bgColor: "bg-cyan-500/10", label: "Internet" },
  other: { icon: HelpCircle, color: "text-gray-400", bgColor: "bg-gray-500/10", label: "Khác" },
};

type Room = {
  id: string;
  room_number: string;
  building: {
    id: string;
    name: string;
  };
};

type Tenancy = {
  id: string;
  room: string;
  room_detail: Room;
  tenant: string;
  status: string;
};

export default function NewMaintenancePage() {
  const { message } = App.useApp();
  const router = useRouter();
  const user = getUser();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [roomId, setRoomId] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  
  // Data
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [loadingTenancies, setLoadingTenancies] = useState(true);

  useEffect(() => {
    const userId = user?.id;
    const userRole = user?.role;
    
    if (!userId || !userRole) {
      setLoadingTenancies(false);
      return;
    }
    
    // Redirect landlords
    if (userRole !== "tenant") {
      router.push("/maintenance");
      return;
    }
    
    let isMounted = true;
    
    async function loadTenancies() {
      try {
        setLoadingTenancies(true);
        // Get active tenancies for current user (tenant)
        const tenanciesData = await apiFetch<PaginatedResponse<Tenancy>>(
          buildPaginatedPath(endpoints.tenancies, { pageSize: 100 })
        );
        
        if (!isMounted) return;
        
        // Filter for active tenancies of current user
        const activeTenancies = tenanciesData.results.filter(
          t => t.status === "active" && t.tenant === userId
        );
        setTenancies(activeTenancies);
        
        // Auto-select first room if only one (only if roomId is not already set)
        if (activeTenancies.length === 1) {
          setRoomId(prev => prev || activeTenancies[0].room);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : "Không thể tải dữ liệu";
        setError(message);
      } finally {
        if (isMounted) {
          setLoadingTenancies(false);
        }
      }
    }
    
    loadTenancies();
    
    return () => {
      isMounted = false;
    };
  }, [user?.id, user?.role, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomId || !title || !description || !category) {
      message.error("Vui lòng điền đầy đủ thông tin");
      return;
    }

    if (!user?.id) {
      message.error("Không tìm thấy thông tin người dùng");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiFetch(endpoints.maintenanceRequests, {
        method: "POST",
        body: JSON.stringify({
          room: roomId,
          requester: user.id,
          title: title.trim(),
          description: description.trim(),
          category: category,
          status: "pending",
        }),
      });

      message.success("Tạo yêu cầu bảo trì thành công!");
      router.push("/maintenance");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Không thể tạo yêu cầu bảo trì";
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedRoom = tenancies.find(t => t.room === roomId)?.room_detail;

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <motion.div
        className="flex items-center gap-4 mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Link
          href="/maintenance"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ArrowLeftOutlined className="w-5 h-5 text-[#475569]" />
        </Link>
        <div>
          <h1 className="font-[family-name:var(--font-poppins)] text-2xl lg:text-3xl font-bold text-[#0F172A]">
            Tạo yêu cầu bảo trì mới
          </h1>
          <p className="text-[#475569] mt-1">
            Mô tả vấn đề cần bảo trì và chúng tôi sẽ xử lý sớm nhất
          </p>
        </div>
      </motion.div>

      {/* Error State */}
      {error && (
        <motion.div
          className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {error}
        </motion.div>
      )}

      {/* Form */}
      <motion.div
        className="max-w-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Room Selection */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6">
            <label className="block text-sm font-semibold text-[#0F172A] mb-3">
              Phòng cần bảo trì *
            </label>
            {loadingTenancies ? (
              <div className="h-10 bg-[#E2E8F0] rounded-lg animate-pulse" />
            ) : tenancies.length === 0 ? (
              <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-400">
                Bạn chưa có phòng đang thuê. Vui lòng liên hệ chủ trọ.
              </div>
            ) : (
              <Select
                value={roomId}
                onChange={setRoomId}
                className="w-full"
                placeholder="Chọn phòng"
                size="large"
                required
              >
                {tenancies.map((tenancy) => {
                  const room = tenancy.room_detail;
                  return (
                    <Select.Option key={tenancy.room} value={tenancy.room}>
                      <div className="flex items-center gap-2">
                        <HomeOutlined className="w-4 h-4 text-primary" />
                        <span>
                          Phòng {room.room_number} - {room.building.name}
                        </span>
                      </div>
                    </Select.Option>
                  );
                })}
              </Select>
            )}
            {selectedRoom && (
              <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-[#475569]">
                  <HomeOutlined className="w-4 h-4 text-primary" />
                  <span>
                    {selectedRoom.building.name} - Phòng {selectedRoom.room_number}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Category */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6">
            <label className="block text-sm font-semibold text-[#0F172A] mb-3">
              Loại bảo trì *
            </label>
            <Select
              value={category}
              onChange={setCategory}
              className="w-full"
              placeholder="Chọn loại bảo trì"
              size="large"
              required
            >
              {Object.entries(categoryConfig).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <Select.Option key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${config.color}`} />
                      <span>{config.label}</span>
                    </div>
                  </Select.Option>
                );
              })}
            </Select>
            {category && (
              <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2">
                  {(() => {
                    const config = categoryConfig[category];
                    const Icon = config.icon;
                    return (
                      <>
                        <div className={`w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center`}>
                          <Icon className={`w-4 h-4 ${config.color}`} />
                        </div>
                        <span className="text-sm font-medium text-[#0F172A]">{config.label}</span>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6">
            <label className="block text-sm font-semibold text-[#0F172A] mb-3">
              Tiêu đề *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Vòi sen bị gãy, Ổ cắm không hoạt động..."
              size="large"
              required
              maxLength={200}
            />
            <p className="text-xs text-[#64748B] mt-2">
              Mô tả ngắn gọn vấn đề ({title.length}/200)
            </p>
          </div>

          {/* Description */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6">
            <label className="block text-sm font-semibold text-[#0F172A] mb-3">
              Mô tả chi tiết *
            </label>
            <TextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả chi tiết vấn đề cần bảo trì, vị trí, mức độ nghiêm trọng..."
              rows={6}
              required
              maxLength={1000}
            />
            <p className="text-xs text-[#64748B] mt-2">
              {description.length}/1000 ký tự
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center gap-4">
            <Link
              href="/maintenance"
              className="flex-1 px-4 py-2.5 border border-[#E2E8F0] text-[#475569] rounded-lg hover:bg-gray-100 transition-colors text-center font-semibold"
            >
              Hủy
            </Link>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={submitting}
              disabled={!roomId || !title || !description || !category || submitting}
              className="flex-1 bg-primary text-white font-semibold"
            >
              {submitting ? "Đang tạo..." : "Tạo yêu cầu"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

