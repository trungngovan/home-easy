"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, endpoints, PaginatedResponse, buildPaginatedPath } from "@/lib/api";
import { motion } from "framer-motion";
import Link from "next/link";
import { CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, HomeOutlined, SearchOutlined, WalletOutlined } from '@ant-design/icons'
import { CreditCard, Filter, TrendingUp,  } from 'lucide-react';
import { Input, Pagination, Select } from "antd";

type Property = {
  id: string;
  name: string;
};

type Room = {
  id: string;
  building: string;
  room_number: string;
};

type Tenancy = {
  id: string;
  room: string;
  tenant: string;
};

type User = {
  id: string;
  full_name: string;
};

type Invoice = {
  id: string;
  tenancy: string;
  period: string;
  total_amount: number;
};

type Payment = {
  id: string;
  invoice: string;
  amount: number;
  method: string;
  status: string;
  note: string;
  created_at: string;
};

const methodLabels: Record<string, string> = {
  cash: "Tiền mặt",
  bank_transfer: "Chuyển khoản",
  momo: "MoMo",
  vnpay: "VNPay",
  other: "Khác",
};

const statusConfig: Record<string, { color: string; icon: typeof CheckCircleOutlined; label: string }> = {
  pending: { color: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: ClockCircleOutlined, label: "Chờ xử lý" },
  completed: { color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircleOutlined, label: "Thành công" },
  failed: { color: "bg-red-500/20 text-red-400 border-red-500/30", icon: CloseCircleOutlined, label: "Thất bại" },
  refunded: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: WalletOutlined, label: "Hoàn tiền" },
};

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterMethod, setFilterMethod] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [paymentsData, invoicesData, tenanciesData, roomsData, propsData, usersData] =
          await Promise.all([
            apiFetch<PaginatedResponse<Payment>>(buildPaginatedPath(endpoints.payments, { page, pageSize })),
            apiFetch<PaginatedResponse<Invoice>>(buildPaginatedPath(endpoints.invoices, { pageSize: 200 })),
            apiFetch<PaginatedResponse<Tenancy>>(buildPaginatedPath(endpoints.tenancies, { pageSize: 200 })),
            apiFetch<PaginatedResponse<Room>>(buildPaginatedPath(endpoints.rooms, { pageSize: 200 })),
            apiFetch<PaginatedResponse<Property>>(buildPaginatedPath(endpoints.properties, { pageSize: 200 })),
            apiFetch<PaginatedResponse<User>>(buildPaginatedPath(endpoints.users, { pageSize: 200 })),
          ]);

        setPayments(paymentsData.results || []);
        setTotalCount(paymentsData.count || 0);
        setInvoices(invoicesData.results || []);
        setTenancies(tenanciesData.results || []);
        setRooms(roomsData.results || []);
        setProperties(propsData.results || []);
        setUsers(usersData.results || []);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Không thể tải dữ liệu";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router, page, pageSize]);

  // Enrich payment data
  const enrichedPayments = payments.map((payment) => {
    const invoice = invoices.find((i) => i.id === payment.invoice);
    const tenancy = invoice ? tenancies.find((t) => t.id === invoice.tenancy) : null;
    const room = tenancy ? rooms.find((r) => r.id === tenancy.room) : null;
    const property = room ? properties.find((p) => p.id === room.building) : null;
    const tenant = tenancy ? users.find((u) => u.id === tenancy.tenant) : null;

    return {
      ...payment,
      invoice,
      tenancy,
      room,
      property,
      tenant,
    };
  });

  // Filter payments
  const filteredPayments = enrichedPayments.filter((payment) => {
    const matchesSearch =
      payment.tenant?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.room?.room_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.invoice?.period.includes(searchQuery);
    const matchesStatus = filterStatus === "all" || payment.status === filterStatus;
    const matchesMethod = filterMethod === "all" || payment.method === filterMethod;
    return matchesSearch && matchesStatus && matchesMethod;
  });

  // Stats
  const totalReceived = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const pendingAmount = payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const thisMonthPayments = payments.filter((p) => {
    const date = new Date(p.created_at);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });
  const thisMonthTotal = thisMonthPayments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + Number(p.amount), 0);

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
            Quản lý thanh toán
          </h1>
          <p className="text-[#475569] mt-1">
            {totalCount} giao dịch • {thisMonthPayments.length} trong tháng này
          </p>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <WalletOutlined className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0F172A]">
                {totalReceived.toLocaleString("vi-VN")}đ
              </p>
              <p className="text-sm text-[#475569]">Đã nhận</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <ClockCircleOutlined className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0F172A]">
                {pendingAmount.toLocaleString("vi-VN")}đ
              </p>
              <p className="text-sm text-[#475569]">Chờ xử lý</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0F172A]">
                {thisMonthTotal.toLocaleString("vi-VN")}đ
              </p>
              <p className="text-sm text-[#475569]">Tháng này</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        className="flex flex-col sm:flex-row gap-4 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Tìm theo tên, phòng, kỳ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            prefix={<SearchOutlined className="w-5 h-5 text-[#64748B]" />}
          />
        </div>

        <Select className="w-full sm:w-[200px]" placeholder="Tất cả trạng thái">
            <Select.Option value="all">Tất cả trạng thái</Select.Option>
            <Select.Option value="completed">Thành công</Select.Option>
            <Select.Option value="pending">Chờ xử lý</Select.Option>
            <Select.Option value="failed">Thất bại</Select.Option>
          </Select>

        <Select className="w-full sm:w-[200px]" placeholder="Tất cả phương thức">
            <Select.Option value="all">Tất cả phương thức</Select.Option>
            <Select.Option value="cash">Tiền mặt</Select.Option>
            <Select.Option value="bank_transfer">Chuyển khoản</Select.Option>
            <Select.Option value="momo">MoMo</Select.Option>
            <Select.Option value="vnpay">VNPay</Select.Option>
          </Select>
      </motion.div>

      {error && (
        <motion.div
          className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {error}
        </motion.div>
      )}

      {/* Payments Table */}
      <motion.div
        className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-[#475569] uppercase tracking-wider border-b border-[#E2E8F0]">
                <th className="px-5 py-4 font-medium min-w-[100px]">Thời gian</th>
                <th className="px-5 py-4 font-medium min-w-[120px]">Khách thuê</th>
                <th className="px-5 py-4 font-medium min-w-[100px]">Phòng</th>
                <th className="px-5 py-4 font-medium min-w-[80px]">Kỳ</th>
                <th className="px-5 py-4 font-medium min-w-[100px]">Số tiền</th>
                <th className="px-5 py-4 font-medium min-w-[110px]">Phương thức</th>
                <th className="px-5 py-4 font-medium min-w-[110px]">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-5 py-4">
                      <div className="h-10 bg-[#E2E8F0] rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <CreditCard className="w-12 h-12 mx-auto mb-3 text-[#64748B] opacity-50" />
                    <p className="text-[#475569]">Chưa có giao dịch nào</p>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => {
                  const StatusIcon = statusConfig[payment.status]?.icon || ClockCircleOutlined;
                  return (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-sm">
                          <CalendarOutlined className="w-4 h-4 text-[#475569]" />
                          <span className="text-[#0F172A]">
                            {new Date(payment.created_at).toLocaleDateString("vi-VN")}
                          </span>
                        </div>
                        <p className="text-xs text-[#475569] mt-0.5">
                          {new Date(payment.created_at).toLocaleTimeString("vi-VN")}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-[#0F172A]">
                        {payment.tenant?.full_name || "N/A"}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <HomeOutlined className="w-4 h-4 text-primary" />
                          <span className="text-[#0F172A] text-sm">
                            Phòng {payment.room?.room_number || "N/A"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[#475569] text-sm">
                        {payment.invoice?.period || "N/A"}
                      </td>
                      <td className="px-5 py-4 text-[#0F172A] font-semibold">
                        {Number(payment.amount).toLocaleString("vi-VN")}đ
                      </td>
                      <td className="px-5 py-4 text-[#475569] text-sm">
                        {methodLabels[payment.method] || payment.method}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border whitespace-nowrap ${
                            statusConfig[payment.status]?.color || statusConfig.pending.color
                          }`}
                        >
                          <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                          {statusConfig[payment.status]?.label || payment.status}
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
            showTotal={(total, range) => `${range[0]}-${range[1]} của ${total} giao dịch`}
            pageSizeOptions={['20', '50', '100']}
            responsive
          />
        </div>
      )}
    </div>
  );
}
