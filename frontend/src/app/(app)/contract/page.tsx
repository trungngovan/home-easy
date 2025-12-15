"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, endpoints, clearAuthToken, buildPaginatedPath, PaginatedResponse } from "@/lib/api";
import { motion } from "framer-motion";
import { CalendarOutlined, DownloadOutlined, FileTextOutlined, HomeOutlined, LoadingOutlined } from '@ant-design/icons'
import { User, AlertCircle,  } from 'lucide-react';

type Tenancy = {
  id: string;
  room: string;
  room_detail: {
    id: string;
    room_number: string;
    building: {
      id: string;
      name: string;
      address: string;
    };
  };
  tenant: string;
  tenant_detail: {
    id: string;
    full_name: string;
    email: string;
  };
  start_date: string;
  end_date: string | null;
  deposit: number;
  base_rent: number;
  status: string;
  contract_file: string | null;
  contract_file_detail?: {
    id: string;
    url: string;
    path: string;
    mime_type: string;
  };
  created_at: string;
};

export default function ContractPage() {
  const router = useRouter();
  const [tenancy, setTenancy] = useState<Tenancy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadContract() {
      try {
        setLoading(true);
        // Get active tenancy for current user
        const tenanciesData = await apiFetch<PaginatedResponse<Tenancy>>(
          buildPaginatedPath(endpoints.tenancies, { pageSize: 100 })
        );
        const activeTenancy = tenanciesData.results.find((t) => t.status === "active");
        
        if (!activeTenancy) {
          setError("Bạn chưa có hợp đồng thuê nào");
          return;
        }

        // Fetch full tenancy details with contract file
        const tenancyData = await apiFetch<Tenancy>(`${endpoints.tenancies}${activeTenancy.id}/`);
        setTenancy(tenancyData);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Không thể tải hợp đồng";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    loadContract();
  }, [router]);

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3 text-[#475569]">
          <LoadingOutlined className="w-5 h-5 animate-spin" />
          Đang tải...
        </div>
      </div>
    );
  }

  if (error || !tenancy) {
    return (
      <div className="p-6 lg:p-8">
        <motion.div
          className="bg-white border border-[#E2E8F0] rounded-xl p-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-[#475569] opacity-50" />
          <h2 >Không tìm thấy hợp đồng</h2>
          <p className="text-[#475569] mb-6">{error || "Bạn chưa có hợp đồng thuê nào"}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-[family-name:var(--font-poppins)] text-2xl lg:text-3xl font-bold text-[#0F172A]">
          Hợp đồng thuê nhà
        </h1>
        <p className="text-[#475569]">Xem và tải xuống hợp đồng thuê nhà của bạn</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contract Info */}
          <motion.div
            className="bg-white border border-[#E2E8F0] rounded-xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileTextOutlined className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h2 >Hợp đồng thuê nhà</h2>
                <p className="text-[#475569]">
                  {tenancy.room_detail?.building?.name || ""} - Phòng {tenancy.room_detail?.room_number || ""}
                </p>
              </div>
            </div>

            {/* Contract File */}
            {tenancy.contract_file_detail ? (
              <div className="space-y-4">
                <div className="p-4 bg-white rounded-lg border border-[#E2E8F0]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileTextOutlined className="w-8 h-8 text-primary" />
                      <div>
                        <p >Hợp đồng thuê nhà.pdf</p>
                        <p className="text-[#475569] text-sm">
                          {tenancy.contract_file_detail.mime_type || "application/pdf"}
                        </p>
                      </div>
                    </div>
                    <a
                      href={tenancy.contract_file_detail.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-bg-dark font-semibold rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <DownloadOutlined className="w-4 h-4" />
                      Tải xuống
                    </a>
                  </div>
                </div>
                <div className="p-4 bg-white rounded-lg border border-[#E2E8F0]">
                  <iframe
                    src={tenancy.contract_file_detail.url}
                    className="w-full h-[600px] rounded-lg border border-[#E2E8F0]"
                    title="Contract PDF"
                  />
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-white rounded-lg border border-[#E2E8F0]">
                <FileTextOutlined className="w-16 h-16 mx-auto mb-4 text-[#475569] opacity-50" />
                <p className="text-[#475569]">Chưa có file hợp đồng</p>
                <p className="text-[#475569] text-sm mt-2">
                  Vui lòng liên hệ chủ trọ để được cung cấp hợp đồng
                </p>
              </div>
            )}
          </motion.div>
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
                    Phòng {tenancy.room_detail?.room_number || "N/A"}
                  </p>
                  <p className="text-[#475569] text-sm">
                    {tenancy.room_detail?.building?.name || ""}
                  </p>
                  <p className="text-[#475569] text-xs">
                    {tenancy.room_detail?.building?.address || ""}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Contract Details */}
          <motion.div
            className="bg-white border border-[#E2E8F0] rounded-xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-sm font-medium text-[#475569] mb-4">Chi tiết hợp đồng</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-[#475569]">Ngày bắt đầu:</p>
                <p >
                  {new Date(tenancy.start_date).toLocaleDateString("vi-VN")}
                </p>
              </div>
              {tenancy.end_date && (
                <div>
                  <p className="text-[#475569]">Ngày kết thúc:</p>
                  <p >
                    {new Date(tenancy.end_date).toLocaleDateString("vi-VN")}
                  </p>
                </div>
              )}
              <div>
                <p className="text-[#475569]">Tiền thuê:</p>
                <p >
                  {Number(tenancy.base_rent).toLocaleString("vi-VN")} đ/tháng
                </p>
              </div>
              <div>
                <p className="text-[#475569]">Tiền cọc:</p>
                <p >
                  {Number(tenancy.deposit).toLocaleString("vi-VN")} đ
                </p>
              </div>
              <div>
                <p className="text-[#475569]">Trạng thái:</p>
                <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                  {tenancy.status === "active" ? "Đang thuê" : tenancy.status}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Tenant Info */}
          <motion.div
            className="bg-white border border-[#E2E8F0] rounded-xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <h3 className="text-sm font-medium text-[#475569] mb-4">Thông tin khách thuê</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#475569]" />
                <span >{tenancy.tenant_detail?.full_name || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarOutlined className="w-4 h-4 text-[#475569]" />
                <span className="text-[#475569]">
                  {tenancy.tenant_detail?.email || ""}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

