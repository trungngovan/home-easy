"use client";

import { useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeftOutlined, BuildOutlined, CalendarOutlined, DeleteOutlined, DropboxOutlined, EditOutlined, ExclamationCircleOutlined, FileTextOutlined, HomeOutlined, MailOutlined, MoreOutlined, PhoneOutlined, RightOutlined, ThunderboltOutlined, ToolOutlined, UserOutlined, WalletOutlined } from '@ant-design/icons'
import { Button } from "antd";
import { useRoom, type Room } from "@/hooks/useRooms";
import { useProperty } from "@/hooks/useProperties";
import { useTenancies, type Tenancy } from "@/hooks/useTenancies";
import { useInvoices, type Invoice } from "@/hooks/useInvoices";
import { useMeterReadings, type MeterReading } from "@/hooks/useMeterReadings";
import { useMaintenanceRequests, type MaintenanceRequest } from "@/hooks/useMaintenanceRequests";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, endpoints, PaginatedResponse } from "@/lib/api";

type User = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
};

type Property = {
  id: string;
  name: string;
  address: string;
};

type Room = {
  id: string;
  building: string;
  room_number: string;
  floor: number;
  area: number | null;
  base_rent: number;
  status: string;
  description: string;
};

type User = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
};

type Tenancy = {
  id: string;
  room: string;
  tenant: string;
  start_date: string;
  end_date: string;
  deposit: number;
  base_rent: number;
  status: string;
  contract_file: string | null;
  contract_file_detail?: {
    id: string;
    url: string;
    path: string;
  };
};

type Invoice = {
  id: string;
  tenancy: string;
  period: string;
  total_amount: number;
  amount_due: number;
  status: string;
};

type MeterReading = {
  id: string;
  room: string;
  period: string;
  electricity_old: number | null;
  electricity_new: number | null;
  water_old: number | null;
  water_new: number | null;
};

type MaintenanceRequest = {
  id: string;
  room: string;
  title: string;
  status: string;
  category: string;
  created_at: string;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 15 },
  },
};

export default function RoomDetailPage() {
  const router = useRouter();
  const params = useParams();
  // Safely extract id from params - handle Next.js 16 params serialization
  // Extract immediately to avoid serialization issues
  const roomId = (() => {
    try {
      if (params && typeof params === 'object' && 'id' in params) {
        return String(params.id);
      }
      return '';
    } catch {
      return '';
    }
  })();

  // Use React Query hooks with filtered queries for this specific room
  const { data: room, isLoading: roomLoading } = useRoom(roomId);
  const { data: tenanciesData, isLoading: tenanciesLoading } = useTenancies({ room: roomId, pageSize: 50 });
  const { data: invoicesData, isLoading: invoicesLoading } = useInvoices({ pageSize: 50 });
  const { data: meterReadingsData, isLoading: meterReadingsLoading } = useMeterReadings({ room: roomId, pageSize: 50 });
  const { data: maintenanceData, isLoading: maintenanceLoading } = useMaintenanceRequests({ room: roomId, pageSize: 50 });
  
  // Fetch property and users only if room is loaded
  const { data: property } = useProperty(room?.building || '');
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiFetch<PaginatedResponse<User>>(`${endpoints.users}?page_size=100`),
    enabled: !!room, // Only fetch if room is loaded
    staleTime: 5 * 60 * 1000,
  });

  // Extract results
  const tenancies = tenanciesData?.results || [];
  const invoices = invoicesData?.results || [];
  const meterReadings = meterReadingsData?.results || [];
  const maintenanceRequests = maintenanceData?.results || [];
  const users = usersData?.results || [];

  // Combined loading state
  const loading = roomLoading || tenanciesLoading || invoicesLoading || meterReadingsLoading || maintenanceLoading;

  // Memoized computed values
  const currentTenancy = useMemo(() => 
    tenancies.find((t) => t.status === "active"),
    [tenancies]
  );
  
  const currentTenant = useMemo(() => {
    if (!currentTenancy) return null;
    return users.find((u) => u.id === currentTenancy.tenant) || null;
  }, [currentTenancy, users]);

  // Get room invoices through tenancies (memoized)
  const roomTenancyIds = useMemo(() => tenancies.map((t) => t.id), [tenancies]);
  const roomInvoices = useMemo(() => 
    invoices.filter((inv) => roomTenancyIds.includes(inv.tenancy)),
    [invoices, roomTenancyIds]
  );

  // Latest meter reading (memoized)
  const latestMeter = useMemo(() => 
    meterReadings.sort((a, b) => b.period.localeCompare(a.period))[0],
    [meterReadings]
  );

  // Open maintenance requests (memoized)
  const openMaintenance = useMemo(() => 
    maintenanceRequests.filter((m) => m.status !== "done"),
    [maintenanceRequests]
  );

  const statusColors = {
    vacant: "bg-green-500/20 text-green-400 border-green-500/30",
    occupied: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    maintenance: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  };

  const statusLabels = {
    vacant: "Trống",
    occupied: "Đang thuê",
    maintenance: "Bảo trì",
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="h-8 w-48 bg-border-dark rounded animate-pulse mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-64 bg-white rounded-xl animate-pulse" />
            <div className="h-48 bg-white rounded-xl animate-pulse" />
          </div>
          <div className="space-y-6">
            <div className="h-48 bg-white rounded-xl animate-pulse" />
            <div className="h-48 bg-white rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!loading && !room) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12">
          <ExclamationCircleOutlined className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <p className="text-red-400 text-lg">Không tìm thấy phòng</p>
          <Link href="/rooms" className="text-primary hover:underline mt-4 inline-block">
            Quay lại danh sách phòng
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeftOutlined className="w-5 h-5 text-[#475569]" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-[family-name:var(--font-poppins)] text-2xl lg:text-3xl font-bold text-[#0F172A]">
                Phòng {room.room_number}
              </h1>
              <span
                className={`px-3 py-1 text-sm font-medium rounded-full border ${
                  statusColors[room.status as keyof typeof statusColors] || statusColors.vacant
                }`}
              >
                {statusLabels[room.status as keyof typeof statusLabels] || room.status}
              </span>
            </div>
            <p className="text-[#475569] mt-1 flex items-center gap-2">
              <BuildOutlined className="w-4 h-4" />
              {property?.name || "N/A"} • Tầng {room.floor}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors border border-[#E2E8F0]"
            onClick={() => router.push(`/rooms/${roomId}/edit`)}
            aria-label="Chỉnh sửa phòng"
          >
            <EditOutlined className="w-5 h-5 text-[#475569]" />
          </button>
          <button className="p-2.5 hover:bg-red-500/20 rounded-lg transition-colors border border-[#E2E8F0]">
            <DeleteOutlined className="w-5 h-5 text-red-400" />
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <motion.div
          className="lg:col-span-2 space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Room Info */}
          <motion.div
            className="bg-white border border-[#E2E8F0] rounded-xl p-6"
            variants={itemVariants}
          >
            <h2 className="text-lg font-semibold text-[#0F172A] mb-4 flex items-center gap-2">
              <HomeOutlined className="w-5 h-5 text-primary" />
              Thông tin phòng
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-white rounded-lg">
                <p className="text-[#475569] text-sm mb-1">Diện tích</p>
                <p >{room.area ? `${room.area} m²` : "-"}</p>
              </div>
              <div className="p-4 bg-white rounded-lg">
                <p className="text-[#475569] text-sm mb-1">Giá thuê cơ bản</p>
                <p >
                  {Number(room.base_rent).toLocaleString("vi-VN")}đ
                </p>
              </div>
              <div className="p-4 bg-white rounded-lg">
                <p className="text-[#475569] text-sm mb-1">Tầng</p>
                <p >{room.floor}</p>
              </div>
              <div className="p-4 bg-white rounded-lg">
                <p className="text-[#475569] text-sm mb-1">Trạng thái</p>
                <p >
                  {statusLabels[room.status as keyof typeof statusLabels] || room.status}
                </p>
              </div>
            </div>
            {room.description && (
              <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                <p className="text-[#475569] text-sm mb-1">Mô tả</p>
                <p >{room.description}</p>
              </div>
            )}
          </motion.div>

          {/* Current Tenant */}
          <motion.div
            className="bg-white border border-[#E2E8F0] rounded-xl p-6 hover:border-primary/30 transition-colors"
            variants={itemVariants}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[#0F172A] flex items-center gap-2">
                <UserOutlined className="w-5 h-5 text-primary" />
                Người thuê hiện tại
              </h2>
            </div>
            {currentTenant ? (
              <div className="space-y-4">
                {/* Tenant Info Section */}
                <div className="flex items-start gap-4 pb-4 border-b border-[#E2E8F0]">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <UserOutlined className="w-7 h-7 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-[#0F172A] mb-2">{currentTenant.full_name}</h3>
                    <div className="flex flex-col gap-2 text-sm">
                      {currentTenant.phone && (
                        <div className="flex items-center gap-2 text-[#475569]">
                          <PhoneOutlined className="w-4 h-4 shrink-0" />
                          <span className="truncate">{currentTenant.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-[#475569]">
                        <MailOutlined className="w-4 h-4 shrink-0" />
                        <span className="truncate">{currentTenant.email}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tenancy Details Section */}
                {currentTenancy && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 p-3 bg-[#F8FAFC] rounded-lg">
                        <CalendarOutlined className="w-4 h-4 text-[#475569] shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-[#64748B] mb-0.5">Thời hạn thuê</p>
                          <p className="text-sm font-medium text-[#0F172A]">
                            {new Date(currentTenancy.start_date).toLocaleDateString("vi-VN")}
                            {currentTenancy.end_date &&
                              ` - ${new Date(currentTenancy.end_date).toLocaleDateString("vi-VN")}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-3 bg-[#F8FAFC] rounded-lg">
                        <WalletOutlined className="w-4 h-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-[#64748B] mb-0.5">Giá thuê</p>
                          <p className="text-sm font-medium text-[#0F172A]">
                            {Number(currentTenancy.base_rent).toLocaleString("vi-VN")}đ/tháng
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {currentTenancy.contract_file_detail && (
                      <a
                        href={currentTenancy.contract_file_detail.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors p-2 rounded-lg hover:bg-primary/5"
                      >
                        <FileTextOutlined className="w-4 h-4" />
                        <span>Xem hợp đồng (PDF)</span>
                      </a>
                    )}
                  </div>
                )}

                {/* Action Button */}
                <div className="pt-2">
                  <Link href={`/tenants/${currentTenant.id}`}>
                    <Button className="w-full sm:w-auto">
                      Xem chi tiết
                      <RightOutlined className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-[#F8FAFC] flex items-center justify-center mx-auto mb-4">
                  <UserOutlined className="w-8 h-8 text-[#64748B] opacity-50" />
                </div>
                <p className="text-[#475569] font-medium mb-2">Phòng đang trống</p>
                <p className="text-sm text-[#64748B] mb-4">Chưa có người thuê trong phòng này</p>
                <Button
                  onClick={() => router.push(`/tenants/invite?room=${roomId}`)}
                  className="w-full sm:w-auto"
                >
                  Thêm người thuê mới
                </Button>
              </div>
            )}
          </motion.div>

          {/* Recent Invoices */}
          <motion.div
            className="bg-white border border-[#E2E8F0] rounded-xl"
            variants={itemVariants}
          >
            <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0]">
              <h2 className="text-lg font-semibold text-[#0F172A] flex items-center gap-2">
                <FileTextOutlined className="w-5 h-5 text-primary" />
                Hóa đơn gần đây
              </h2>
              <Link href="/invoices" className="text-primary text-sm hover:underline">
                Xem tất cả
              </Link>
            </div>
            <div className="p-5">
              {roomInvoices.length === 0 ? (
                <p className="text-center text-[#475569] py-4">Chưa có hóa đơn nào</p>
              ) : (
                <div className="space-y-3">
                  {roomInvoices.slice(0, 5).map((invoice) => {
                    const statusColors: Record<string, string> = {
                      paid: "bg-green-500/20 text-green-400",
                      pending: "bg-orange-500/20 text-orange-400",
                      overdue: "bg-red-500/20 text-red-400",
                    };
                    const statusLabels: Record<string, string> = {
                      paid: "Đã thanh toán",
                      pending: "Chờ thanh toán",
                      overdue: "Quá hạn",
                    };
                    return (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between p-3 bg-white rounded-lg"
                      >
                        <div>
                          <p >{invoice.period}</p>
                          <p className="text-sm text-[#475569]">
                            {Number(invoice.total_amount).toLocaleString("vi-VN")}đ
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-bold rounded ${
                            statusColors[invoice.status] || "bg-gray-500/20 text-gray-400"
                          }`}
                        >
                          {statusLabels[invoice.status] || invoice.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>

        {/* Sidebar */}
        <motion.div
          className="space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Meter Readings */}
          <motion.div
            className="bg-white border border-[#E2E8F0] rounded-xl p-5"
            variants={itemVariants}
          >
            <h3 >Chỉ số điện nước</h3>
            {latestMeter ? (
              <div className="space-y-4">
                <p className="text-sm text-[#475569]">Kỳ: {latestMeter.period}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-white rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <ThunderboltOutlined className="w-4 h-4 text-yellow-400" />
                      <span className="text-[#475569] text-sm">Điện</span>
                    </div>
                    <p >
                      {latestMeter.electricity_new !== null
                        ? `${latestMeter.electricity_new} kWh`
                        : "-"}
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <DropboxOutlined className="w-4 h-4 text-blue-400" />
                      <span className="text-[#475569] text-sm">Nước</span>
                    </div>
                    <p >
                      {latestMeter.water_new !== null ? `${latestMeter.water_new} m³` : "-"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-[#475569] py-4">Chưa có chỉ số</p>
            )}
          </motion.div>

          {/* Maintenance Requests */}
          <motion.div
            className="bg-white border border-[#E2E8F0] rounded-xl p-5"
            variants={itemVariants}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 >Yêu cầu bảo trì</h3>
              {openMaintenance.length > 0 && (
                <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs font-bold rounded-full">
                  {openMaintenance.length}
                </span>
              )}
            </div>
            {maintenanceRequests.length === 0 ? (
              <p className="text-center text-[#475569] py-4">Không có yêu cầu nào</p>
            ) : (
              <div className="space-y-3">
                {maintenanceRequests.slice(0, 3).map((req) => {
                  const statusColors: Record<string, string> = {
                    pending: "text-orange-400",
                    in_progress: "text-blue-400",
                    done: "text-green-400",
                  };
                  return (
                    <div key={req.id} className="p-3 bg-white rounded-lg">
                      <div className="flex items-start justify-between">
                        <p >{req.title}</p>
                        <span className={`text-xs ${statusColors[req.status] || "text-gray-400"}`}>
                          {req.status === "pending"
                            ? "Chờ xử lý"
                            : req.status === "in_progress"
                            ? "Đang xử lý"
                            : "Hoàn thành"}
                        </span>
                      </div>
                      <p className="text-xs text-[#475569] mt-1">
                        {new Date(req.created_at).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            className="bg-white border border-[#E2E8F0] rounded-xl p-6 hover:border-primary/30 transition-colors"
            variants={itemVariants}
          >
            <h3 className="text-lg font-semibold text-[#0F172A] mb-4">Thao tác nhanh</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link href={`/invoices/new?room=${roomId}`} className="group">
                <div className="w-full h-full p-4 border border-[#E2E8F0] rounded-lg hover:bg-primary/5 hover:border-primary/50 transition-all cursor-pointer bg-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-colors">
                      <FileTextOutlined className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0F172A]">Tạo hóa đơn mới</p>
                    </div>
                    <RightOutlined className="w-4 h-4 text-[#64748B] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </Link>
              
              <button
                onClick={() => {
                  // TODO: Implement meter reading modal/page
                  if (typeof window !== "undefined") {
                    window.alert("Tính năng nhập chỉ số điện nước sẽ sớm được cập nhật.");
                  }
                }}
                className="w-full h-full p-4 border border-[#E2E8F0] rounded-lg hover:bg-primary/5 hover:border-primary/50 transition-all cursor-pointer bg-white group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0 group-hover:bg-yellow-500/20 transition-colors">
                    <ThunderboltOutlined className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0F172A]">Nhập chỉ số điện nước</p>
                  </div>
                  <RightOutlined className="w-4 h-4 text-[#64748B] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
              
              <Link href={`/maintenance?room=${roomId}`} className="group">
                <div className="w-full h-full p-4 border border-[#E2E8F0] rounded-lg hover:bg-primary/5 hover:border-primary/50 transition-all cursor-pointer bg-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0 group-hover:bg-orange-500/20 transition-colors">
                      <ToolOutlined className="w-5 h-5 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0F172A]">Tạo yêu cầu bảo trì</p>
                    </div>
                    <RightOutlined className="w-4 h-4 text-[#64748B] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
