"use client";

import { useMemo } from "react";
import { getUser } from "@/lib/api";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BuildOutlined, CalendarOutlined, CheckCircleOutlined, ExclamationCircleOutlined, FileTextOutlined, HomeOutlined, PlusOutlined, RightOutlined, ToolOutlined, UserOutlined, WalletOutlined, EditOutlined } from '@ant-design/icons'
import { TrendingUp, TrendingDown, Bell,  } from 'lucide-react';
import Link from "next/link";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { useInvoices, type Invoice } from "@/hooks/useInvoices";
import { useProperties, type Property } from "@/hooks/useProperties";
import { useRooms, type Room } from "@/hooks/useRooms";
import { useTenancies, type Tenancy } from "@/hooks/useTenancies";
import { useMaintenanceRequests, type MaintenanceRequest } from "@/hooks/useMaintenanceRequests";

type Property = {
  id: string;
  name: string;
  address: string;
};

type Room = {
  id: string;
  building: string;
  room_number: string;
  status: string;
  base_rent: number;
};

type Tenancy = {
  id: string;
  room: string;
  tenant: string;
  start_date: string;
  end_date: string;
  status: string;
};

type Invoice = {
  id: string;
  tenancy: string;
  period: string;
  status: string;
  amount_due: number;
  total_amount: number;
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
    transition: { staggerChildren: 0.1 },
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

export default function DashboardPage() {
  const router = useRouter();
  const user = getUser();
  const { unreadCount } = useUnreadNotifications();
  const isTenant = user?.role === "tenant";
  
  // Use React Query hooks for data fetching with optimized page sizes
  const { data: invoicesData, isLoading: invoicesLoading, error: invoicesError } = useInvoices({ pageSize: 50 });
  const { data: maintenanceData, isLoading: maintenanceLoading, error: maintenanceError } = useMaintenanceRequests({ pageSize: 50 });
  const { data: propertiesData, isLoading: propertiesLoading, error: propertiesError } = useProperties({ pageSize: 50 });
  const { data: roomsData, isLoading: roomsLoading, error: roomsError } = useRooms({ pageSize: 50 });
  const { data: tenanciesData, isLoading: tenanciesLoading, error: tenanciesError } = useTenancies({ pageSize: 50 });

  // Extract results from paginated responses
  const invoices = invoicesData?.results || [];
  const maintenanceRequests = maintenanceData?.results || [];
  const properties = propertiesData?.results || [];
  const rooms = roomsData?.results || [];
  const tenancies = tenanciesData?.results || [];

  // Combined loading state
  const loading = isTenant 
    ? invoicesLoading || maintenanceLoading
    : invoicesLoading || maintenanceLoading || propertiesLoading || roomsLoading || tenanciesLoading;

  // Collect any errors from data fetching
  const error = invoicesError || maintenanceError || propertiesError || roomsError || tenanciesError;
  const errorMessage = error instanceof Error ? error.message : error ? String(error) : null;

  // Memoized stats calculations
  const totalRooms = useMemo(() => rooms.length, [rooms]);
  const occupiedRooms = useMemo(() => 
    rooms.filter(r => r.status === "occupied").length, 
    [rooms]
  );
  const vacantRooms = useMemo(() => 
    rooms.filter(r => r.status === "vacant").length, 
    [rooms]
  );
  const occupancyRate = useMemo(() => 
    totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
    [totalRooms, occupiedRooms]
  );
  
  const pendingInvoices = useMemo(() => 
    invoices.filter(i => i.status === "pending"),
    [invoices]
  );
  const totalReceivables = useMemo(() => 
    pendingInvoices.reduce((sum, inv) => sum + Number(inv.amount_due || 0), 0),
    [pendingInvoices]
  );
  
  const openMaintenance = useMemo(() => 
    maintenanceRequests.filter(m => m.status !== "done").length,
    [maintenanceRequests]
  );
  
  // Contracts expiring soon (within 30 days)
  const today = useMemo(() => new Date(), []);
  const expiringContracts = useMemo(() => {
    return tenancies.filter(t => {
      if (!t.end_date) return false;
      const endDate = new Date(t.end_date);
      const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysRemaining > 0 && daysRemaining <= 30;
    });
  }, [tenancies, today]);

  // Tenant-specific stats (memoized)
  const currentInvoice = useMemo(() => 
    invoices.find(i => i.status === "pending" || i.status === "overdue") || invoices[0],
    [invoices]
  );
  const totalDue = useMemo(() => 
    currentInvoice ? Number(currentInvoice.amount_due || 0) : 0,
    [currentInvoice]
  );
  const paidInvoices = useMemo(() => 
    invoices.filter(i => i.status === "paid").length,
    [invoices]
  );
  const tenantOpenMaintenance = useMemo(() => 
    maintenanceRequests.filter(m => m.status !== "done" && m.status !== "rejected").length,
    [maintenanceRequests]
  );

  // Render tenant dashboard
  if (isTenant) {
    return (
      <div className="p-6 lg:p-8">
        {/* Header */}
        <motion.div 
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="font-[family-name:var(--font-poppins)] text-2xl lg:text-3xl font-bold text-[#0F172A]">
              Xin chào, {user?.full_name || "Khách thuê"}! 👋
            </h1>
            <p className="text-[#475569] mt-1">
              Tổng quan thông tin của bạn
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              className="relative p-2.5 rounded-lg bg-white border border-[#E2E8F0] hover:border-primary/30 transition-colors shadow-sm cursor-pointer"
              onClick={() => router.push("/notifications")}
            >
              <Bell className="w-5 h-5 text-[#475569]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full border-2 border-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          </div>
        </motion.div>


        {/* Current Invoice Card */}
        <motion.div 
          className="mb-6 bg-gradient-to-br from-primary to-blue-600 rounded-xl p-6 sm:p-8 text-white shadow-lg"
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-white/80 text-sm mb-2">Hóa đơn hiện tại</p>
              {loading ? (
                <div className="h-8 w-32 bg-white/20 rounded animate-pulse" />
              ) : currentInvoice ? (
                <>
                  <h2 className="text-3xl sm:text-4xl font-bold mb-2">
                    {totalDue.toLocaleString("vi-VN")} đ
                  </h2>
                  <p className="text-white/80 text-sm">
                    {currentInvoice.status === "paid" ? "Đã thanh toán" : `Còn nợ ${totalDue.toLocaleString("vi-VN")} đ`}
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold mb-2">Không có hóa đơn</h2>
                  <p className="text-white/80 text-sm">Bạn chưa có hóa đơn nào</p>
                </>
              )}
            </div>
            <FileTextOutlined className="w-12 h-12 text-white/30" />
          </div>
          {currentInvoice && currentInvoice.status !== "paid" && (
            <Link
              href={`/invoices/${currentInvoice.id}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-primary font-semibold rounded-lg hover:bg-white/90 transition-colors mt-4"
            >
              Xem chi tiết
              <RightOutlined className="w-4 h-4" />
            </Link>
          )}
        </motion.div>

        {/* Stats Grid */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-4 lg:gap-6 mb-6 sm:mb-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Paid Invoices */}
          <motion.div 
            className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 hover:border-primary/30 transition-colors shadow-sm"
            variants={itemVariants}
          >
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                <CheckCircleOutlined className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
              </div>
            </div>
            {loading ? (
              <div className="h-6 sm:h-8 w-16 sm:w-20 bg-[#E2E8F0] rounded animate-pulse" />
            ) : (
              <>
                <h3 className="text-2xl sm:text-3xl font-bold text-[#0F172A] leading-tight">{paidInvoices}</h3>
                <p className="text-xs sm:text-sm text-[#475569] mt-1">Hóa đơn đã thanh toán</p>
              </>
            )}
          </motion.div>

          {/* Open Maintenance */}
          <motion.div 
            className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 hover:border-primary/30 transition-colors shadow-sm"
            variants={itemVariants}
          >
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                <ToolOutlined className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400" />
              </div>
            </div>
            {loading ? (
              <div className="h-6 sm:h-8 w-16 sm:w-20 bg-[#E2E8F0] rounded animate-pulse" />
            ) : (
              <>
                <h3 className="text-2xl sm:text-3xl font-bold text-[#0F172A] leading-tight">{tenantOpenMaintenance}</h3>
                <p className="text-xs sm:text-sm text-[#475569] mt-1">Yêu cầu bảo trì đang mở</p>
              </>
            )}
          </motion.div>

          {/* Total Invoices */}
          <motion.div 
            className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 hover:border-primary/30 transition-colors shadow-sm"
            variants={itemVariants}
          >
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <FileTextOutlined className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
              </div>
            </div>
            {loading ? (
              <div className="h-6 sm:h-8 w-16 sm:w-20 bg-[#E2E8F0] rounded animate-pulse" />
            ) : (
              <>
                <h3 className="text-2xl sm:text-3xl font-bold text-[#0F172A] leading-tight">{invoices.length}</h3>
                <p className="text-xs sm:text-sm text-[#475569] mt-1">Tổng số hóa đơn</p>
              </>
            )}
          </motion.div>
        </motion.div>

        {/* Recent Invoices */}
        <motion.div 
          className="mb-6 bg-white border border-[#E2E8F0] rounded-xl shadow-sm"
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0]">
            <h2 className="text-lg font-semibold text-[#0F172A]">Lịch sử thanh toán</h2>
            <Link href="/invoices" className="text-sm text-primary hover:underline flex items-center gap-1">
              Xem tất cả
              <RightOutlined className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="p-5">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-[#E2E8F0] rounded-lg animate-pulse" />
                ))}
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-8 text-[#475569]">
                <FileTextOutlined className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Chưa có hóa đơn nào</p>
              </div>
            ) : (
              <div className="space-y-3">
                {invoices.slice(0, 5).map((invoice) => (
                  <Link
                    key={invoice.id}
                    href={`/invoices/${invoice.id}`}
                    className="flex items-center justify-between p-4 bg-white border border-[#E2E8F0] rounded-lg hover:bg-gray-50 transition-colors group shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <CalendarOutlined className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#0F172A] group-hover:text-primary transition-colors">
                          Tháng {invoice.period?.split("-")[1]}/{invoice.period?.split("-")[0]}
                        </h3>
                        <p className="text-sm text-[#475569]">
                          {Number(invoice.total_amount).toLocaleString("vi-VN")} đ
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${
                        invoice.status === "paid" 
                          ? "bg-green-500/20 text-green-400" 
                          : "bg-orange-500/20 text-orange-400"
                      }`}>
                        {invoice.status === "paid" ? "Đã thanh toán" : "Chờ thanh toán"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Open Maintenance Requests */}
        {tenantOpenMaintenance > 0 && (
          <motion.div 
            className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm"
            variants={itemVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0]">
              <h2 className="text-lg font-semibold text-[#0F172A]">Yêu cầu bảo trì đang mở</h2>
              <Link href="/maintenance" className="text-sm text-primary hover:underline flex items-center gap-1">
                Xem tất cả
                <RightOutlined className="w-4 h-4" />
              </Link>
            </div>
            
            <div className="p-5">
              <div className="space-y-3">
                {maintenanceRequests
                  .filter(m => m.status !== "done" && m.status !== "rejected")
                  .slice(0, 3)
                  .map((request) => (
                    <Link
                      key={request.id}
                      href={`/maintenance/${request.id}`}
                      className="flex items-center justify-between p-4 bg-white border border-[#E2E8F0] rounded-lg hover:bg-gray-50 transition-colors group shadow-sm"
                    >
                      <div>
                        <h3 className="font-semibold text-[#0F172A] group-hover:text-primary transition-colors">
                          {request.title}
                        </h3>
                        <p className="text-sm text-[#475569] mt-1">
                          {request.category} • {new Date(request.created_at).toLocaleDateString("vi-VN")}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        request.status === "pending" 
                          ? "bg-orange-500/20 text-orange-400" 
                          : "bg-blue-500/20 text-blue-400"
                      }`}>
                        {request.status === "pending" ? "Chờ xử lý" : "Đang xử lý"}
                      </span>
                    </Link>
                  ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  // Render landlord dashboard (existing code)
  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <motion.div 
        className="flex items-center justify-between mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="font-[family-name:var(--font-poppins)] text-2xl lg:text-3xl font-bold text-[#0F172A]">
            Xin chào, {user?.full_name || "Chủ trọ"}! 👋
          </h1>
          <p className="text-[#475569] mt-1">
            Tổng quan hoạt động kinh doanh của bạn
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="relative p-2.5 rounded-lg bg-white border border-[#E2E8F0] hover:bg-gray-100 hover:border-primary/30 transition-colors shadow-sm cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            onClick={() => router.push("/notifications")}
          >
            <Bell className="w-5 h-5 text-[#475569]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full border-2 border-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors border border-[#E2E8F0] cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            onClick={() => router.push("/settings")}
            title="Chỉnh sửa thông tin"
          >
            <EditOutlined className="w-5 h-5 text-[#475569]" />
          </button>
          <Link
            href="/rooms/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors min-h-[44px]"
          >
            <PlusOutlined className="w-4 h-4" />
            Thêm phòng
          </Link>
        </div>
      </motion.div>

      {/* Error State */}
      {errorMessage && (
        <motion.div 
          className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          {errorMessage}
        </motion.div>
      )}

      {/* Stats Grid */}
      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-4 lg:gap-6 mb-6 sm:mb-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Total Rooms */}
        <motion.div 
          className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 hover:border-primary/30 transition-colors shadow-sm"
          variants={itemVariants}
        >
          <div className="flex items-start justify-between mb-3 sm:mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <HomeOutlined className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
            </div>
            <span className="flex items-center gap-1 text-xs sm:text-sm text-primary shrink-0">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {occupancyRate}%
            </span>
          </div>
          {loading ? (
            <div className="h-6 sm:h-8 w-16 sm:w-20 bg-[#E2E8F0] rounded animate-pulse" />
          ) : (
            <>
              <h3 className="text-2xl sm:text-3xl font-bold text-[#0F172A] leading-tight">{totalRooms}</h3>
              <p className="text-xs sm:text-sm text-[#475569] mt-1">Tổng số phòng</p>
              <div className="mt-2 sm:mt-3 flex flex-wrap gap-2 sm:gap-4 text-xs">
                <span className="text-primary">{occupiedRooms} đang thuê</span>
                <span className="text-[#475569]">{vacantRooms} trống</span>
              </div>
            </>
          )}
        </motion.div>

        {/* Tenants */}
        <motion.div 
          className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 hover:border-primary/30 transition-colors shadow-sm"
          variants={itemVariants}
        >
          <div className="flex items-start justify-between mb-3 sm:mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
              <UserOutlined className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
            </div>
          </div>
          {loading ? (
            <div className="h-6 sm:h-8 w-16 sm:w-20 bg-[#E2E8F0] rounded animate-pulse" />
          ) : (
            <>
              <h3 className="text-2xl sm:text-3xl font-bold text-[#0F172A] leading-tight">{tenancies.filter(t => t.status === "active").length}</h3>
              <p className="text-xs sm:text-sm text-[#475569] mt-1">Khách thuê hiện tại</p>
              <div className="mt-2 sm:mt-3 text-xs text-orange-400 line-clamp-2">
                {expiringContracts.length > 0 ? `${expiringContracts.length} HĐ sắp hết hạn` : "Không có HĐ sắp hết hạn"}
              </div>
            </>
          )}
        </motion.div>

        {/* Receivables */}
        <motion.div 
          className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 hover:border-primary/30 transition-colors shadow-sm"
          variants={itemVariants}
        >
          <div className="flex items-start justify-between mb-3 sm:mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
              <WalletOutlined className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400" />
            </div>
            {pendingInvoices.length > 0 && (
              <span className="flex items-center gap-1 text-xs sm:text-sm text-orange-400 shrink-0">
                <ExclamationCircleOutlined className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {pendingInvoices.length}
              </span>
            )}
          </div>
          {loading ? (
            <div className="h-6 sm:h-8 w-24 sm:w-32 bg-border-dark rounded animate-pulse" />
          ) : (
            <>
              <h3 className="text-2xl sm:text-3xl font-bold text-[#0F172A] leading-tight">
                <span className="text-lg sm:text-2xl">{totalReceivables.toLocaleString("vi-VN")}</span>
                <span className="text-sm sm:text-lg text-[#475569] ml-1">đ</span>
              </h3>
              <p className="text-xs sm:text-sm text-[#475569] mt-1">Công nợ phải thu</p>
              <div className="mt-2 sm:mt-3 text-xs text-orange-400 line-clamp-2">
                {pendingInvoices.length} hóa đơn chờ thanh toán
              </div>
            </>
          )}
        </motion.div>

        {/* Maintenance */}
        <motion.div 
          className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 hover:border-primary/30 transition-colors shadow-sm"
          variants={itemVariants}
        >
          <div className="flex items-start justify-between mb-3 sm:mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
              <ExclamationCircleOutlined className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />
            </div>
          </div>
          {loading ? (
            <div className="h-6 sm:h-8 w-16 sm:w-20 bg-[#E2E8F0] rounded animate-pulse" />
          ) : (
            <>
              <h3 className="text-2xl sm:text-3xl font-bold text-[#0F172A] leading-tight">{openMaintenance}</h3>
              <p className="text-xs sm:text-sm text-[#475569] mt-1">Yêu cầu bảo trì</p>
              <div className="mt-2 sm:mt-3 text-xs text-[#475569]">
                {maintenanceRequests.filter(m => m.status === "pending").length} chờ xử lý
              </div>
            </>
          )}
        </motion.div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Properties List */}
        <motion.div 
          className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-xl shadow-sm"
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0]">
            <h2 className="text-lg font-semibold text-[#0F172A]">Tài sản của bạn</h2>
            <Link href="/properties" className="text-sm text-primary hover:underline flex items-center gap-1">
              Xem tất cả
              <RightOutlined className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="p-5">
            {loading ? (
              <div className="space-y-4">
                {[1, 2].map(i => (
                  <div key={i} className="h-20 bg-[#E2E8F0] rounded-lg animate-pulse" />
                ))}
              </div>
            ) : properties.length === 0 ? (
              <div className="text-center py-8 text-[#475569]">
                <BuildOutlined className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Chưa có tài sản nào</p>
                <Link href="/properties/new" className="text-primary text-sm hover:underline mt-2 inline-block">
                  Thêm tài sản đầu tiên
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {properties.slice(0, 4).map((prop) => {
                  const propRooms = rooms.filter(r => r.building === prop.id);
                  const propOccupied = propRooms.filter(r => r.status === "occupied").length;
                  
                  return (
                    <Link
                      key={prop.id}
                      href={`/properties/${prop.id}`}
                      className="flex items-center gap-4 p-4 bg-white border border-[#E2E8F0] rounded-lg hover:bg-gray-50 transition-colors group shadow-sm"
                    >
                      <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <BuildOutlined className="w-7 h-7 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[#0F172A] truncate group-hover:text-primary transition-colors">
                          {prop.name}
                        </h3>
                        <p className="text-sm text-[#475569] truncate">{prop.address}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium text-[#0F172A]">
                          {propOccupied}/{propRooms.length} phòng
                        </p>
                        <p className="text-xs text-[#475569]">đang thuê</p>
                      </div>
                      <RightOutlined className="w-5 h-5 text-[#475569] group-hover:text-primary transition-colors" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* Expiring Contracts */}
        <motion.div 
          className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm"
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0]">
            <h2 className="text-lg font-semibold text-[#0F172A] flex items-center gap-2">
              <CalendarOutlined className="w-5 h-5 text-orange-400" />
              HĐ sắp hết hạn
            </h2>
            {expiringContracts.length > 0 && (
              <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs font-bold rounded-full">
                {expiringContracts.length}
              </span>
            )}
          </div>
          
          <div className="p-5">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-[#E2E8F0] rounded-lg animate-pulse" />
                ))}
              </div>
            ) : expiringContracts.length === 0 ? (
              <div className="text-center py-8 text-[#475569]">
                <CalendarOutlined className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Không có HĐ sắp hết hạn</p>
              </div>
            ) : (
              <div className="space-y-3">
                {expiringContracts.slice(0, 5).map((tenancy) => {
                  const endDate = new Date(tenancy.end_date);
                  const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  const room = rooms.find(r => r.id === tenancy.room);
                  
                  return (
                    <Link
                      key={tenancy.id}
                      href={room?.id ? `/rooms/${room.id}` : "/tenants"}
                      className="p-3 bg-white border border-[#E2E8F0] rounded-lg hover:bg-gray-50 transition-colors block shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-[#0F172A]">
                          Phòng {room?.room_number || "N/A"}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded whitespace-nowrap ${
                          daysRemaining <= 7 
                            ? "bg-red-500/20 text-red-400" 
                            : "bg-orange-500/20 text-orange-400"
                        }`}>
                          Còn {daysRemaining} ngày
                        </span>
                      </div>
                      <p className="text-xs text-[#475569]">
                        Hết hạn: {endDate.toLocaleDateString("vi-VN")}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Recent Invoices */}
      <motion.div 
        className="mt-6 bg-white border border-[#E2E8F0] rounded-xl shadow-sm"
        variants={itemVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0]">
          <h2 className="text-lg font-semibold text-[#0F172A]">Hóa đơn gần đây</h2>
          <Link href="/invoices" className="text-sm text-primary hover:underline flex items-center gap-1">
            Xem tất cả
            <RightOutlined className="w-4 h-4" />
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-[#475569] uppercase tracking-wider">
                <th className="px-5 py-3 font-medium min-w-[100px]">Kỳ thanh toán</th>
                <th className="px-5 py-3 font-medium min-w-[80px]">Phòng</th>
                <th className="px-5 py-3 font-medium min-w-[100px]">Tổng tiền</th>
                <th className="px-5 py-3 font-medium min-w-[90px]">Còn nợ</th>
                <th className="px-5 py-3 font-medium min-w-[130px]">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                [1, 2, 3].map(i => (
                  <tr key={i}>
                    <td colSpan={5} className="px-5 py-4">
                      <div className="h-6 bg-[#E2E8F0] rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-[#475569]">
                    Chưa có hóa đơn nào
                  </td>
                </tr>
              ) : (
                invoices.slice(0, 5).map((invoice) => {
                  const tenancy = tenancies.find(t => t.id === invoice.tenancy);
                  const room = rooms.find(r => r.id === tenancy?.room);
                  
                  const statusColors = {
                    draft: "bg-gray-500/20 text-gray-400",
                    pending: "bg-orange-500/20 text-orange-400",
                    partial: "bg-blue-500/20 text-blue-400",
                    paid: "bg-green-500/20 text-green-400",
                    overdue: "bg-red-500/20 text-red-400",
                  };
                  
                  const statusLabels = {
                    draft: "Nháp",
                    pending: "Chờ thanh toán",
                    partial: "Thanh toán 1 phần",
                    paid: "Đã thanh toán",
                    overdue: "Quá hạn",
                  };
                  
                  return (
                    <tr
                      key={invoice.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/invoices/${invoice.id}`)}
                    >
                      <td className="px-5 py-4 text-sm text-[#0F172A]">{invoice.period}</td>
                      <td className="px-5 py-4 text-sm text-[#475569]">
                        Phòng {room?.room_number || "N/A"}
                      </td>
                      <td className="px-5 py-4 text-sm text-[#0F172A] font-medium">
                        {Number(invoice.total_amount).toLocaleString("vi-VN")}đ
                      </td>
                      <td className="px-5 py-4 text-sm text-orange-400 font-medium">
                        {Number(invoice.amount_due).toLocaleString("vi-VN")}đ
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-block px-2 py-1 text-xs font-bold rounded whitespace-nowrap ${
                          statusColors[invoice.status as keyof typeof statusColors] || statusColors.draft
                        }`}>
                          {statusLabels[invoice.status as keyof typeof statusLabels] || invoice.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
