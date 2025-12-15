"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { apiFetch, endpoints, clearAuthToken, PaginatedResponse, buildPaginatedPath, getUser } from "@/lib/api";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CalendarOutlined, DownloadOutlined, FileTextOutlined, MoreOutlined, PlusOutlined, RightOutlined, SearchOutlined, SendOutlined } from '@ant-design/icons'
import {  } from 'lucide-react';
import Link from "next/link";
import { Input, Button, Select, Pagination } from "antd";

// Nested types from optimized API response
type TenantNested = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
};

type RoomNested = {
  id: string;
  room_number: string;
  floor: number;
};

type PropertyNested = {
  id: string;
  name: string;
  address: string;
};

type TenancyNested = {
  id: string;
  room: RoomNested;
  tenant: TenantNested;
  property: PropertyNested | null;
};

type Invoice = {
  id: string;
  tenancy: string;
  tenancy_detail: TenancyNested;
  period: string;
  status: string;
  status_display: string;
  total_amount: number;
  amount_due: number;
  total_paid: number;
  payment_count: number;
  is_overdue: boolean;
  due_date: string | null;
  created_at: string;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 },
  },
};

// Build query string for backend filtering
function buildFilteredInvoicePath(
  basePath: string,
  { page, pageSize, status, period, search }: {
    page: number;
    pageSize: number;
    status?: string;
    period?: string;
    search?: string;
  }
) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("page_size", String(pageSize));
  
  // Backend filtering instead of frontend
  if (status && status !== "all") {
    params.set("status", status);
  }
  if (period && period !== "all") {
    params.set("period", period);
  }
  if (search) {
    params.set("search", search);
  }
  
  return `${basePath}?${params.toString()}`;
}

export default function InvoicesPage() {
  const router = useRouter();
  const user = getUser();
  const isTenant = user?.role === "tenant";
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);

  // Debounce search input to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load available periods once (for the dropdown)
  useEffect(() => {
    async function loadPeriods() {
      try {
        const data = await apiFetch<PaginatedResponse<Invoice>>(
          buildPaginatedPath(endpoints.invoices, { pageSize: 100 })
        );
        const periods = [...new Set(data.results.map((i) => i.period))].sort().reverse();
        setAvailablePeriods(periods);
      } catch {
        // Ignore error - periods filter will just not be available
      }
    }
    loadPeriods();
  }, []);

  // Main data fetch - now only ONE API call with server-side filtering!
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        
        // Single optimized API call with backend filtering
        const invoicesData = await apiFetch<PaginatedResponse<Invoice>>(
          buildFilteredInvoicePath(endpoints.invoices, {
            page,
            pageSize,
            status: filterStatus,
            period: filterPeriod,
            search: debouncedSearch,
          })
        );
        
        setInvoices(invoicesData.results || []);
        setTotalCount(invoicesData.count || 0);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Không thể tải dữ liệu";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router, page, pageSize, filterStatus, filterPeriod, debouncedSearch]);

  // Use available periods from state, or extract from current invoices
  const periods = availablePeriods.length > 0 
    ? availablePeriods 
    : [...new Set(invoices.map((i) => i.period))].sort().reverse();

  // No need to filter on frontend anymore - backend handles it
  const filteredInvoices = invoices;

  // Memoized stats
  const totalAmount = useMemo(() => 
    filteredInvoices.reduce((sum, i) => sum + Number(i.total_amount || 0), 0),
    [filteredInvoices]
  );
  const totalDue = useMemo(() => 
    filteredInvoices.reduce((sum, i) => sum + Number(i.amount_due || 0), 0),
    [filteredInvoices]
  );
  const paidInvoices = useMemo(() => 
    filteredInvoices.filter((i) => i.status === "paid").length,
    [filteredInvoices]
  );
  const pendingInvoices = useMemo(() => 
    filteredInvoices.filter((i) => i.status === "pending").length,
    [filteredInvoices]
  );

  // Memoized status mappings
  const statusColors: Record<string, string> = useMemo(() => ({
    draft: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    pending: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    partial: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    paid: "bg-green-500/20 text-green-400 border-green-500/30",
    overdue: "bg-red-500/20 text-red-400 border-red-500/30",
  }), []);

  const statusLabels: Record<string, string> = useMemo(() => ({
    draft: "Nháp",
    pending: "Chờ thanh toán",
    partial: "Thanh toán 1 phần",
    paid: "Đã thanh toán",
    overdue: "Quá hạn",
  }), []);

  const handleExport = useCallback(() => {
    if (typeof window !== "undefined") {
      window.alert("Xuất báo cáo sẽ khả dụng khi backend export được bật.");
    }
  }, []);

  const handleSendReminder = useCallback((invoiceId: string) => {
    if (typeof window !== "undefined") {
      window.alert(`Gửi nhắc nhở cho hóa đơn ${invoiceId} sẽ khả dụng khi tích hợp thông báo.`);
    }
  }, []);

  const handleInvoiceClick = useCallback((invoiceId: string) => {
    router.push(`/invoices/${invoiceId}`);
  }, [router]);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="font-[family-name:var(--font-poppins)] text-2xl lg:text-3xl font-bold text-[#0F172A]">
            {isTenant ? "Hóa đơn của tôi" : "Quản lý hóa đơn"}
          </h1>
          <p className="text-[#475569] mt-1">
            {invoices.length} hóa đơn • {pendingInvoices} chờ thanh toán
          </p>
        </div>

        {!isTenant && (
          <div className="flex items-center gap-3">
            <Button
              onClick={handleExport}
              icon={<DownloadOutlined className="w-4 h-4" />}
            >
              Xuất báo cáo
            </Button>
            <Link
              href="/invoices/new"
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-bg-dark font-semibold rounded-lg hover:bg-primary/90 transition-colors"
            >
              <PlusOutlined className="w-4 h-4" />
              Tạo hóa đơn
            </Link>
          </div>
        )}
      </motion.div>

      {/* Stats Cards - Only show for landlords */}
      {!isTenant && (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
        <motion.div
          className="bg-white border border-[#E2E8F0] rounded-xl p-5"
          variants={itemVariants}
        >
          <p className="text-[#475569] text-sm mb-1">Tổng doanh thu</p>
          <p className="text-2xl font-bold text-[#0F172A]">
            {totalAmount.toLocaleString("vi-VN")}đ
          </p>
        </motion.div>
        <motion.div
          className="bg-white border border-[#E2E8F0] rounded-xl p-5"
          variants={itemVariants}
        >
          <p className="text-[#475569] text-sm mb-1">Công nợ còn lại</p>
          <p className="text-2xl font-bold text-orange-400">
            {totalDue.toLocaleString("vi-VN")}đ
          </p>
        </motion.div>
        <motion.div
          className="bg-white border border-[#E2E8F0] rounded-xl p-5"
          variants={itemVariants}
        >
          <p className="text-[#475569] text-sm mb-1">Đã thanh toán</p>
          <p className="text-2xl font-bold text-green-400">{paidInvoices}</p>
        </motion.div>
        <motion.div
          className="bg-white border border-[#E2E8F0] rounded-xl p-5"
          variants={itemVariants}
        >
          <p className="text-[#475569] text-sm mb-1">Chờ thanh toán</p>
          <p className="text-2xl font-bold text-orange-400">{pendingInvoices}          </p>
        </motion.div>
      </motion.div>
      )}

      {/* Filters */}
      <motion.div
        className="flex flex-col sm:flex-row gap-4 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {/* Search */}
        <div className="flex-1 max-w-sm">
          <Input
            type="text"
            placeholder="Tìm theo phòng, kỳ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            prefix={<SearchOutlined className="w-5 h-5 text-[#64748B]" />}
          />
        </div>

        {/* Period Filter */}
        <Select
          value={filterPeriod}
          onChange={setFilterPeriod}
          className="w-full sm:w-[180px]"
          placeholder="Tất cả kỳ"
        >
          <Select.Option value="all">Tất cả kỳ</Select.Option>
          {periods.map((p) => (
            <Select.Option key={p} value={p}>
              Tháng {p.split("-")[1]}/{p.split("-")[0]}
            </Select.Option>
          ))}
        </Select>

        {/* Status Filter */}
        <Select
          value={filterStatus}
          onChange={setFilterStatus}
          className="w-full sm:w-[180px]"
          placeholder="Tất cả trạng thái"
        >
          <Select.Option value="all">Tất cả trạng thái</Select.Option>
          <Select.Option value="pending">Chờ thanh toán</Select.Option>
          <Select.Option value="paid">Đã thanh toán</Select.Option>
          <Select.Option value="overdue">Quá hạn</Select.Option>
        </Select>
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

      {/* Invoices - Desktop Table */}
      <motion.div
        className="hidden md:block bg-white border border-[#E2E8F0] rounded-xl overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-[#475569] uppercase tracking-wider border-b border-[#E2E8F0]">
                <th className="px-5 py-4 font-medium min-w-[140px]">Kỳ thanh toán</th>
                <th className="px-5 py-4 font-medium min-w-[120px]">Phòng</th>
                <th className="px-5 py-4 font-medium min-w-[100px]">Tổng tiền</th>
                <th className="px-5 py-4 font-medium min-w-[100px]">Còn nợ</th>
                <th className="px-5 py-4 font-medium min-w-[130px]">Hạn thanh toán</th>
                <th className="px-5 py-4 font-medium min-w-[130px]">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-5 py-4">
                      <div className="h-10 bg-border-dark rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <FileTextOutlined className="w-12 h-12 mx-auto mb-3 text-[#64748B] opacity-50" />
                    <p className="text-[#475569]">
                      {searchQuery || filterStatus !== "all" || filterPeriod !== "all"
                        ? "Không tìm thấy hóa đơn nào"
                        : "Chưa có hóa đơn nào"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => {
                  // Use nested data directly from API response - no client-side joining!
                  const room = invoice.tenancy_detail?.room;
                  const property = invoice.tenancy_detail?.property;
                  const tenant = invoice.tenancy_detail?.tenant;

                  return (
                    <motion.tr
                      key={invoice.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      variants={itemVariants}
                      onClick={() => handleInvoiceClick(invoice.id)}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <CalendarOutlined className="w-5 h-5 text-primary" />
                          </div>
                          <span className="text-sm font-medium text-[#0F172A]">
                            Tháng {invoice.period.split("-")[1]}/{invoice.period.split("-")[0]}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-medium text-[#0F172A]">Phòng {room?.room_number || "N/A"}</div>
                        <div className="text-xs text-[#475569]">{property?.name}</div>
                        {tenant && (
                          <div className="text-xs text-[#64748B] mt-0.5">{tenant.full_name}</div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-[#0F172A]">
                        {Number(invoice.total_amount).toLocaleString("vi-VN")}đ
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-sm ${invoice.amount_due > 0 ? "text-orange-400 font-medium" : "text-green-400"}`}>
                          {Number(invoice.amount_due).toLocaleString("vi-VN")}đ
                        </span>
                        {invoice.payment_count > 0 && (
                          <div className="text-xs text-[#64748B]">
                            {invoice.payment_count} lần thanh toán
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm text-[#475569]">
                        {invoice.due_date
                          ? new Date(invoice.due_date).toLocaleDateString("vi-VN")
                          : "-"}
                        {invoice.is_overdue && (
                          <span className="ml-1 text-xs text-red-400">(Quá hạn)</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full border whitespace-nowrap ${
                            statusColors[invoice.status] || statusColors.draft
                          }`}
                        >
                          {invoice.status_display || statusLabels[invoice.status] || invoice.status}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Invoices - Mobile Cards */}
      <motion.div
        className="md:hidden space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {loading ? (
          [1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white border border-[#E2E8F0] rounded-xl p-4">
              <div className="h-40 bg-border-dark rounded animate-pulse" />
            </div>
          ))
        ) : filteredInvoices.length === 0 ? (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-12 text-center">
            <FileTextOutlined className="w-12 h-12 mx-auto mb-3 text-[#64748B] opacity-50" />
            <p className="text-[#475569]">
              {searchQuery || filterStatus !== "all" || filterPeriod !== "all"
                ? "Không tìm thấy hóa đơn nào"
                : "Chưa có hóa đơn nào"}
            </p>
          </div>
        ) : (
          filteredInvoices.map((invoice) => {
            const room = invoice.tenancy_detail?.room;
            const property = invoice.tenancy_detail?.property;
            const tenant = invoice.tenancy_detail?.tenant;

            return (
              <motion.div
                key={invoice.id}
                variants={itemVariants}
                onClick={() => handleInvoiceClick(invoice.id)}
                className="bg-white border border-[#E2E8F0] rounded-xl p-4 space-y-3 cursor-pointer hover:border-primary/30 transition-colors"
              >
                {/* Header: Period & Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CalendarOutlined className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-base font-semibold text-[#0F172A]">
                      Tháng {invoice.period.split("-")[1]}/{invoice.period.split("-")[0]}
                    </span>
                  </div>
                  <span
                    className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full border ${
                      statusColors[invoice.status] || statusColors.draft
                    }`}
                  >
                    {invoice.status_display || statusLabels[invoice.status] || invoice.status}
                  </span>
                </div>

                {/* Room & Property */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-[#64748B] uppercase tracking-wider">Phòng</div>
                  <div>
                    <div className="text-sm font-medium text-[#0F172A]">Phòng {room?.room_number || "N/A"}</div>
                    <div className="text-xs text-[#475569]">{property?.name}</div>
                    {tenant && (
                      <div className="text-xs text-[#64748B] mt-0.5">{tenant.full_name}</div>
                    )}
                  </div>
                </div>

                {/* Amounts */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E2E8F0]">
                  <div>
                    <div className="text-xs font-medium text-[#64748B] mb-1">Tổng tiền</div>
                    <div className="text-base font-semibold text-[#0F172A]">
                      {Number(invoice.total_amount).toLocaleString("vi-VN")}đ
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-[#64748B] mb-1">Còn nợ</div>
                    <div className={`text-base font-semibold ${invoice.amount_due > 0 ? "text-orange-400" : "text-green-400"}`}>
                      {Number(invoice.amount_due).toLocaleString("vi-VN")}đ
                    </div>
                    {invoice.payment_count > 0 && (
                      <div className="text-xs text-[#64748B] mt-0.5">
                        {invoice.payment_count} lần thanh toán
                      </div>
                    )}
                  </div>
                </div>

                {/* Due Date */}
                <div className="pt-2 border-t border-[#E2E8F0]">
                  <div className="text-xs font-medium text-[#64748B] mb-1">Hạn thanh toán</div>
                  <div className="text-sm text-[#475569]">
                    {invoice.due_date
                      ? new Date(invoice.due_date).toLocaleDateString("vi-VN")
                      : "-"}
                    {invoice.is_overdue && (
                      <span className="ml-2 text-xs text-red-400 font-medium">(Quá hạn)</span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </motion.div>

      {/* Pagination controls */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
          <Pagination
            current={page}
            total={totalCount}
            pageSize={pageSize}
            onChange={(newPage, newPageSize) => {
              setPage(newPage);
              if (newPageSize) {
                setPageSize(newPageSize);
              }
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onShowSizeChange={(current, size) => {
              setPageSize(size);
              setPage(1);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            showSizeChanger
            showQuickJumper
            showTotal={(total, range) => `${range[0]}-${range[1]} của ${total} hóa đơn`}
            pageSizeOptions={['20', '50', '100']}
            responsive
          />
        </div>
      )}
    </div>
  );
}
