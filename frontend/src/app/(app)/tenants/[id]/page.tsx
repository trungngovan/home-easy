"use client";

import { useEffect, useState } from "react";
import { apiFetch, endpoints, clearAuthToken, PaginatedResponse, buildPaginatedPath } from "@/lib/api";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeftOutlined, BuildOutlined, CalendarOutlined, EditOutlined, ExclamationCircleOutlined, FileTextOutlined, HomeOutlined, MailOutlined, PhoneOutlined, ToolOutlined, UserOutlined, WalletOutlined } from '@ant-design/icons'
import { MessageSquare,  } from 'lucide-react';

type User = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar: string | null;
  role: string;
  created_at: string;
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
  base_rent: number;
};

type Tenancy = {
  id: string;
  room: string;
  tenant: string;
  start_date: string;
  end_date: string | null;
  deposit: number;
  base_rent: number;
  status: string;
};

type Invoice = {
  id: string;
  tenancy: string;
  period: string;
  total_amount: number;
  amount_due: number;
  status: string;
};

export default function TenantDetailPage() {
  const router = useRouter();
  const params = useParams();
  // Safely extract id from params - handle Next.js 16 params serialization
  // Extract immediately to avoid serialization issues
  const tenantId = (() => {
    try {
      if (params && typeof params === 'object' && 'id' in params) {
        return String(params.id);
      }
      return '';
    } catch {
      return '';
    }
  })();

  const [tenant, setTenant] = useState<User | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [usersData, propsData, roomsData, tenanciesData, invoicesData] = await Promise.all([
          apiFetch<PaginatedResponse<User>>(buildPaginatedPath(endpoints.users, { pageSize: 200 })),
          apiFetch<PaginatedResponse<Property>>(buildPaginatedPath(endpoints.properties, { pageSize: 200 })),
          apiFetch<PaginatedResponse<Room>>(buildPaginatedPath(endpoints.rooms, { pageSize: 200 })),
          apiFetch<PaginatedResponse<Tenancy>>(buildPaginatedPath(endpoints.tenancies, { pageSize: 200 })),
          apiFetch<PaginatedResponse<Invoice>>(buildPaginatedPath(endpoints.invoices, { pageSize: 200 })),
        ]);

        const tenantData = (usersData.results || []).find((u) => u.id === tenantId);
        setTenant(tenantData || null);
        setProperties(propsData.results || []);
        setRooms(roomsData.results || []);
        setTenancies((tenanciesData.results || []).filter((t) => t.tenant === tenantId));
        setInvoices(invoicesData.results || []);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Không thể tải dữ liệu";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [tenantId, router]);

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="h-8 w-48 bg-border-dark rounded animate-pulse mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-48 bg-white rounded-xl animate-pulse" />
            <div className="h-64 bg-white rounded-xl animate-pulse" />
          </div>
          <div className="space-y-6">
            <div className="h-48 bg-white rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12">
          <ExclamationCircleOutlined className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <p className="text-red-400 text-lg">{error || "Không tìm thấy khách thuê"}</p>
          <Link href="/tenants" className="text-primary hover:underline mt-4 inline-block">
            Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  const activeTenancy = tenancies.find((t) => t.status === "active");
  const activeRoom = activeTenancy ? rooms.find((r) => r.id === activeTenancy.room) : null;
  const activeProperty = activeRoom ? properties.find((p) => p.id === activeRoom.building) : null;

  // Get invoices for this tenant's tenancies
  const tenantTenancyIds = tenancies.map((t) => t.id);
  const tenantInvoices = invoices.filter((inv) => tenantTenancyIds.includes(inv.tenancy));
  const pendingInvoices = tenantInvoices.filter((inv) => inv.status === "pending" || inv.status === "overdue");
  const totalDebt = pendingInvoices.reduce((sum, inv) => sum + Number(inv.amount_due), 0);

  const statusLabels: Record<string, string> = {
    paid: "Đã thanh toán",
    pending: "Chờ thanh toán",
    overdue: "Quá hạn",
    partial: "Thanh toán 1 phần",
  };

  const statusColors: Record<string, string> = {
    paid: "bg-green-500/20 text-green-400",
    pending: "bg-orange-500/20 text-orange-400",
    overdue: "bg-red-500/20 text-red-400",
    partial: "bg-blue-500/20 text-blue-400",
  };

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
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <UserOutlined className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="font-[family-name:var(--font-poppins)] text-2xl lg:text-3xl font-bold text-[#0F172A]">
                {tenant.full_name}
              </h1>
              <p className="text-[#475569] mt-1">
                {activeTenancy ? "Đang thuê" : "Đã rời đi"} • Tham gia{" "}
                {new Date(tenant.created_at).toLocaleDateString("vi-VN")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors border border-[#E2E8F0]">
            <MessageSquare className="w-5 h-5 text-[#475569]" />
          </button>
          <button className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors border border-[#E2E8F0]">
            <EditOutlined className="w-5 h-5 text-[#475569]" />
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Info */}
          <motion.div
            className="bg-white border border-[#E2E8F0] rounded-xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-lg font-semibold text-[#0F172A] mb-4 flex items-center gap-2">
              <PhoneOutlined className="w-5 h-5 text-primary" />
              Thông tin liên hệ
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-white rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <MailOutlined className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-[#475569]">Email</p>
                  <p >{tenant.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <PhoneOutlined className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-[#475569]">Số điện thoại</p>
                  <p >{tenant.phone || "Chưa cập nhật"}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Current Room */}
          {activeTenancy && activeRoom && (
            <motion.div
              className="bg-white border border-[#E2E8F0] rounded-xl p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-lg font-semibold text-[#0F172A] mb-4 flex items-center gap-2">
                <HomeOutlined className="w-5 h-5 text-primary" />
                Phòng đang thuê
              </h2>
              <Link
                href={`/rooms/${activeRoom.id}`}
                className="flex items-center gap-4 p-4 bg-white rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BuildOutlined className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 >
                    Phòng {activeRoom.room_number}
                  </h3>
                  <p className="text-sm text-[#475569]">{activeProperty?.name || "N/A"}</p>
                </div>
                <div className="text-right">
                  <p >
                    {Number(activeTenancy.base_rent).toLocaleString("vi-VN")}đ
                  </p>
                  <p className="text-xs text-[#475569]">/ tháng</p>
                </div>
              </Link>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                <div className="p-3 bg-white rounded-lg text-center">
                  <p className="text-xs text-[#475569] mb-1">Ngày bắt đầu</p>
                  <p >
                    {new Date(activeTenancy.start_date).toLocaleDateString("vi-VN")}
                  </p>
                </div>
                <div className="p-3 bg-white rounded-lg text-center">
                  <p className="text-xs text-[#475569] mb-1">Ngày kết thúc</p>
                  <p >
                    {activeTenancy.end_date
                      ? new Date(activeTenancy.end_date).toLocaleDateString("vi-VN")
                      : "Không xác định"}
                  </p>
                </div>
                <div className="p-3 bg-white rounded-lg text-center">
                  <p className="text-xs text-[#475569] mb-1">Tiền cọc</p>
                  <p >
                    {Number(activeTenancy.deposit).toLocaleString("vi-VN")}đ
                  </p>
                </div>
                <div className="p-3 bg-white rounded-lg text-center">
                  <p className="text-xs text-[#475569] mb-1">Tiền thuê</p>
                  <p >
                    {Number(activeTenancy.base_rent).toLocaleString("vi-VN")}đ
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Invoice History */}
          <motion.div
            className="bg-white border border-[#E2E8F0] rounded-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0]">
              <h2 className="text-lg font-semibold text-[#0F172A] flex items-center gap-2">
                <FileTextOutlined className="w-5 h-5 text-primary" />
                Lịch sử hóa đơn
              </h2>
              <Link href="/invoices" className="text-primary text-sm hover:underline">
                Xem tất cả
              </Link>
            </div>
            <div className="p-5">
              {tenantInvoices.length === 0 ? (
                <p className="text-center text-[#475569] py-4">Chưa có hóa đơn nào</p>
              ) : (
                <div className="space-y-3">
                  {tenantInvoices.slice(0, 5).map((invoice) => (
                    <Link
                      key={invoice.id}
                      href={`/invoices/${invoice.id}`}
                      className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-gray-50 transition-colors"
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
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Financial Summary */}
          <motion.div
            className="bg-white border border-[#E2E8F0] rounded-xl p-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 >
              <WalletOutlined className="w-5 h-5 text-primary" />
              Tình trạng tài chính
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-white rounded-lg">
                <p className="text-sm text-[#475569] mb-1">Công nợ hiện tại</p>
                <p className={`text-2xl font-bold ${totalDebt > 0 ? "text-orange-400" : "text-green-400"}`}>
                  {totalDebt.toLocaleString("vi-VN")}đ
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white rounded-lg text-center">
                  <p >{tenantInvoices.length}</p>
                  <p className="text-xs text-[#475569]">Tổng hóa đơn</p>
                </div>
                <div className="p-3 bg-white rounded-lg text-center">
                  <p className="text-xl font-bold text-orange-400">{pendingInvoices.length}</p>
                  <p className="text-xs text-[#475569]">Chưa thanh toán</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            className="bg-white border border-[#E2E8F0] rounded-xl p-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-lg font-semibold text-[#0F172A] mb-4 flex items-center gap-2">
              <ToolOutlined className="w-5 h-5 text-primary" />
              Thao tác nhanh
            </h3>
            <div className="space-y-2">
              <Link
                href="/invoices/new" >
                Tạo hóa đơn mới
              </Link>
              <button >
                Gửi thông báo
              </button>
              <button >
                Gia hạn hợp đồng
              </button>
              {activeTenancy && (
                <button className="w-full p-3 text-left text-sm text-red-400 bg-white rounded-lg hover:bg-red-500/10 transition-colors">
                  Kết thúc hợp đồng
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
