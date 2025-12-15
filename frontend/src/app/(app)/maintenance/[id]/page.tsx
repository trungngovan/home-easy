"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, endpoints, clearAuthToken } from "@/lib/api";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeftOutlined, CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, DownloadOutlined, DropboxOutlined, FileTextOutlined, HomeOutlined, ThunderboltOutlined, ToolOutlined } from '@ant-design/icons'
import { User, Wifi, Sofa, HelpCircle, Image as ImageIcon } from 'lucide-react';

const categoryConfig: Record<string, { icon: typeof ToolOutlined; color: string; bgColor: string; label: string }> = {
  electricity: { icon: ThunderboltOutlined, color: "text-yellow-400", bgColor: "bg-yellow-500/10", label: "Điện" },
  plumbing: { icon: DropboxOutlined, color: "text-blue-400", bgColor: "bg-blue-500/10", label: "Nước/Ống" },
  appliance: { icon: ToolOutlined, color: "text-orange-400", bgColor: "bg-orange-500/10", label: "Thiết bị" },
  furniture: { icon: Sofa, color: "text-purple-400", bgColor: "bg-purple-500/10", label: "Nội thất" },
  internet: { icon: Wifi, color: "text-cyan-400", bgColor: "bg-cyan-500/10", label: "Internet" },
  other: { icon: HelpCircle, color: "text-gray-400", bgColor: "bg-gray-500/10", label: "Khác" },
};

const statusConfig: Record<string, { color: string; bgColor: string; borderColor: string; label: string; icon: typeof ClockCircleOutlined }> = {
  pending: {
    color: "text-orange-400",
    bgColor: "bg-orange-500/20",
    borderColor: "border-orange-500/30",
    label: "Chờ xử lý",
    icon: ClockCircleOutlined,
  },
  in_progress: {
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    borderColor: "border-blue-500/30",
    label: "Đang xử lý",
    icon: CheckCircleOutlined,
  },
  done: {
    color: "text-green-400",
    bgColor: "bg-green-500/20",
    borderColor: "border-green-500/30",
    label: "Hoàn thành",
    icon: CheckCircleOutlined,
  },
  rejected: {
    color: "text-red-400",
    bgColor: "bg-red-500/20",
    borderColor: "border-red-500/30",
    label: "Từ chối",
    icon: CloseCircleOutlined,
  },
};

type MaintenanceRequest = {
  id: string;
  room: string;
  room_detail: {
    id: string;
    room_number: string;
    building: {
      id: string;
      name: string;
    };
  };
  requester: string;
  requester_detail: {
    id: string;
    full_name: string;
    email: string;
  };
  title: string;
  description: string;
  category: string;
  status: string;
  assignee: string | null;
  assignee_detail: {
    id: string;
    full_name: string;
  } | null;
  attachments: Array<{
    id: string;
    file: string;
    file_url: string;
    uploaded_at: string;
  }>;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
};

export default function MaintenanceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [request, setRequest] = useState<MaintenanceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    async function loadRequest() {
      try {
        setLoading(true);
        const data = await apiFetch<MaintenanceRequest>(`${endpoints.maintenanceRequests}${params.id}/`);
        setRequest(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Không thể tải chi tiết yêu cầu";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    loadRequest();
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-screen">
        <div className="text-[#475569]">Đang tải...</div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="p-6 lg:p-8">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error || "Không tìm thấy yêu cầu"}
        </div>
        <Link href="/maintenance" className="mt-4 inline-block text-primary hover:underline">
          ← Quay lại danh sách
        </Link>
      </div>
    );
  }

  const category = categoryConfig[request.category] || categoryConfig.other;
  const status = statusConfig[request.status] || statusConfig.pending;
  const CategoryIcon = category.icon;
  const StatusIcon = status.icon;

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
          className="p-2 hover:bg-white rounded-lg transition-colors"
        >
          <ArrowLeftOutlined className="w-5 h-5 text-[#475569]" />
        </Link>
        <div>
          <h1 className="font-[family-name:var(--font-poppins)] text-2xl lg:text-3xl font-bold text-[#0F172A]">
            Chi tiết yêu cầu bảo trì
          </h1>
          <p className="text-[#475569] mt-1">ID: {request.id}</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Request Info Card */}
          <motion.div
            className="bg-white border border-[#E2E8F0] rounded-xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-start gap-4 mb-6">
              <div className={`w-12 h-12 rounded-lg ${category.bgColor} flex items-center justify-center flex-shrink-0`}>
                <CategoryIcon className={`w-6 h-6 ${category.color}`} />
              </div>
              <div className="flex-1">
                <h2 >{request.title}</h2>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${status.bgColor} ${status.color} ${status.borderColor}`}>
                    <StatusIcon className="w-4 h-4 inline-block mr-1" />
                    {status.label}
                  </span>
                  <span className={`inline-block px-3 py-1 rounded text-sm ${category.color} bg-white/5`}>
                    {category.label}
                  </span>
                </div>
              </div>
            </div>

            {request.description && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-[#475569] mb-2">Mô tả</h3>
                <p >{request.description}</p>
              </div>
            )}

            {/* Attachments */}
            {request.attachments && request.attachments.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-[#475569] mb-3">File đính kèm</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {request.attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={attachment.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-[#E2E8F0] hover:border-primary/40 transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p >
                          File {attachment.id.slice(0, 8)}
                        </p>
                        <p className="text-[#475569] text-xs">
                          {new Date(attachment.uploaded_at).toLocaleDateString("vi-VN")}
                        </p>
                      </div>
                      <DownloadOutlined className="w-4 h-4 text-[#475569] group-hover:text-primary transition-colors flex-shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Resolution Note */}
          {request.resolution_note && (
            <motion.div
              className="bg-white border border-[#E2E8F0] rounded-xl p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-sm font-medium text-[#475569] mb-2">Ghi chú xử lý</h3>
              <p >{request.resolution_note}</p>
              {request.resolved_at && (
                <p className="text-[#475569] text-xs mt-2">
                  Hoàn thành: {new Date(request.resolved_at).toLocaleString("vi-VN")}
                </p>
              )}
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Room Info */}
          <motion.div
            className="bg-white border border-[#E2E8F0] rounded-xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h3 className="text-sm font-medium text-[#475569] mb-4">Thông tin phòng</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <HomeOutlined className="w-5 h-5 text-primary" />
                <div>
                  <p >
                    Phòng {request.room_detail?.room_number || "N/A"}
                  </p>
                  <p className="text-[#475569] text-sm">
                    {request.room_detail?.building?.name || ""}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Requester Info */}
          <motion.div
            className="bg-white border border-[#E2E8F0] rounded-xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-sm font-medium text-[#475569] mb-4">Người yêu cầu</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-primary" />
                <div>
                  <p >
                    {request.requester_detail?.full_name || "N/A"}
                  </p>
                  <p className="text-[#475569] text-sm">
                    {request.requester_detail?.email || ""}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Assignee Info */}
          {request.assignee_detail && (
            <motion.div
              className="bg-white border border-[#E2E8F0] rounded-xl p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <h3 className="text-sm font-medium text-[#475569] mb-4">Người xử lý</h3>
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-primary" />
                <p >
                  {request.assignee_detail.full_name}
                </p>
              </div>
            </motion.div>
          )}

          {/* Timestamps */}
          <motion.div
            className="bg-white border border-[#E2E8F0] rounded-xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-sm font-medium text-[#475569] mb-4">Thời gian</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <CalendarOutlined className="w-4 h-4 text-[#475569]" />
                <span className="text-[#475569]">Tạo:</span>
                <span >
                  {new Date(request.created_at).toLocaleString("vi-VN")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ClockCircleOutlined className="w-4 h-4 text-[#475569]" />
                <span className="text-[#475569]">Cập nhật:</span>
                <span >
                  {new Date(request.updated_at).toLocaleString("vi-VN")}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

