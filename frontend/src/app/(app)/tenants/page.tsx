"use client";

import { useEffect, useState } from "react";
import { apiFetch, endpoints, clearAuthToken, PaginatedResponse, buildPaginatedPath } from "@/lib/api";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { BuildOutlined, CalendarOutlined, HomeOutlined, MailOutlined, PhoneOutlined, PlusOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons'
import { Filter, UserCheck, UserX,  } from 'lucide-react';
import { Input, Pagination, Select } from "antd";

// Optimized types with nested data from API
type PropertyNested = {
  id: string;
  name: string;
  address: string;
};

type RoomNested = {
  id: string;
  room_number: string;
  floor: number;
  base_rent: number;
  building: PropertyNested;
};

type TenantNested = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
};

type Tenancy = {
  id: string;
  room: string;
  room_detail: RoomNested;
  tenant: string;
  tenant_detail: TenantNested;
  start_date: string;
  end_date: string | null;
  status: string;
  status_display: string;
  is_active: boolean;
  days_remaining: number | null;
  base_rent: number;
  deposit: number;
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

// Build URL with filters for backend
function buildTenancyPath(
  basePath: string,
  { page, pageSize, status, search }: { page: number; pageSize: number; status?: string; search?: string }
) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("page_size", String(pageSize));
  if (status && status !== "all") {
    params.set("status", status);
  }
  if (search) {
    params.set("search", search);
  }
  return `${basePath}?${params.toString()}`;
}

export default function TenantsPage() {
  const router = useRouter();
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Single optimized API call - tenancies now include nested tenant, room, property data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const tenanciesData = await apiFetch<PaginatedResponse<Tenancy>>(
          buildTenancyPath(endpoints.tenancies, {
            page,
            pageSize,
            status: filterStatus,
            search: debouncedSearch,
          })
        );

        setTenancies(tenanciesData.results || []);
        setTotalCount(tenanciesData.count || 0);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Không thể tải dữ liệu";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router, page, pageSize, filterStatus, debouncedSearch]);

  // Transform tenancies to tenant view - using nested data from API
  const tenantsWithInfo = tenancies.map((tenancy) => ({
    id: tenancy.tenant_detail?.id || tenancy.tenant,
    full_name: tenancy.tenant_detail?.full_name || "N/A",
    email: tenancy.tenant_detail?.email || "",
    phone: tenancy.tenant_detail?.phone || null,
    tenancy,
    room: tenancy.room_detail,
    property: tenancy.room_detail?.building,
    isActive: tenancy.is_active,
    daysRemaining: tenancy.days_remaining,
  }));

  // No client-side filtering needed - backend handles it
  const filteredTenants = tenantsWithInfo;

  // Stats from current data (is_active comes from backend, true when status === "active")
  const totalTenants = totalCount;
  const activeTenants = tenancies.filter((t) => t.is_active).length;
  const expiredOrTerminated = tenancies.filter((t) => !t.is_active).length;

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
            Quản lý khách thuê
          </h1>
          <p className="text-[#475569] mt-1">
            {totalTenants} hợp đồng • {activeTenants} đang thuê • {expiredOrTerminated} đã kết thúc
          </p>
        </div>

        <Link
          href="/tenants/invite"
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-bg-dark font-semibold rounded-lg hover:bg-primary/90 transition-colors w-fit"
        >
          <PlusOutlined className="w-4 h-4" />
          Mời khách thuê
        </Link>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <UserOutlined className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0F172A]">{totalTenants}</p>
              <p className="text-sm text-[#475569]">Tổng khách thuê</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0F172A]">{activeTenants}</p>
              <p className="text-sm text-[#475569]">Đang thuê</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-500/10 flex items-center justify-center">
              <UserX className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0F172A]">{expiredOrTerminated}</p>
              <p className="text-sm text-[#475569]">Đã kết thúc</p>
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
        {/* Search */}
        <div className="flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Tìm theo tên, email, số điện thoại..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            prefix={<SearchOutlined className="w-5 h-5 text-[#64748B]" />}
          />
        </div>

        {/* Status Filter - matches backend Tenancy.STATUS_CHOICES */}
        <Select
          value={filterStatus}
          onChange={setFilterStatus}
          className="w-full sm:w-[180px]"
          placeholder="Tất cả trạng thái"
        >
          <Select.Option value="all">Tất cả trạng thái</Select.Option>
          <Select.Option value="active">Đang thuê</Select.Option>
          <Select.Option value="expired">Hết hạn</Select.Option>
          <Select.Option value="terminated">Đã kết thúc</Select.Option>
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

      {/* Tenants - Desktop Table */}
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
                <th className="px-5 py-4 font-medium min-w-[140px]">Khách thuê</th>
                <th className="px-5 py-4 font-medium min-w-[180px]">Liên hệ</th>
                <th className="px-5 py-4 font-medium min-w-[120px]">Phòng</th>
                <th className="px-5 py-4 font-medium min-w-[110px]">Ngày bắt đầu</th>
                <th className="px-5 py-4 font-medium min-w-[110px]">Ngày kết thúc</th>
                <th className="px-5 py-4 font-medium min-w-[110px]">Tiền thuê</th>
                <th className="px-5 py-4 font-medium min-w-[100px]">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-5 py-4">
                      <div className="h-12 bg-border-dark rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <UserOutlined className="w-12 h-12 mx-auto mb-3 text-[#64748B] opacity-50" />
                    <p className="text-[#475569]">
                      {searchQuery || filterStatus !== "all"
                        ? "Không tìm thấy khách thuê nào"
                        : "Chưa có khách thuê nào"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => (
                  <motion.tr
                    key={`${tenant.id}-${tenant.tenancy.id}`}
                    className="hover:bg-gray-50 cursor-pointer"
                    variants={itemVariants}
                    onClick={() => router.push(`/tenants/${tenant.id}`)}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <UserOutlined className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-sm font-medium text-[#0F172A]">{tenant.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm">
                        <div className="flex items-center gap-1.5 text-[#475569]">
                          <MailOutlined className="w-3.5 h-3.5" />
                          {tenant.email}
                        </div>
                        {tenant.phone && (
                          <div className="flex items-center gap-1.5 text-[#475569] mt-1">
                            <PhoneOutlined className="w-3.5 h-3.5" />
                            {tenant.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {tenant.room ? (
                        <div className="flex items-center gap-2">
                          <HomeOutlined className="w-4 h-4 text-primary" />
                          <div>
                            <p className="text-sm font-medium text-[#0F172A]">Phòng {tenant.room.room_number}</p>
                            <p className="text-xs text-[#475569]">
                              {tenant.property?.name || "N/A"}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-[#475569]">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm text-[#475569]">
                        {tenant.tenancy.start_date
                          ? new Date(tenant.tenancy.start_date).toLocaleDateString("vi-VN")
                          : "-"}
                      </div>
                      {tenant.daysRemaining !== null && tenant.daysRemaining <= 30 && tenant.isActive && (
                        <div className="text-xs text-orange-400 mt-0.5">
                          Còn {tenant.daysRemaining} ngày
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm text-[#475569]">
                        {tenant.tenancy.end_date
                          ? new Date(tenant.tenancy.end_date).toLocaleDateString("vi-VN")
                          : "-"}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-[#475569]">
                      {tenant.tenancy.base_rent
                        ? `${Number(tenant.tenancy.base_rent).toLocaleString("vi-VN")}đ`
                        : "-"}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full border whitespace-nowrap ${
                          tenant.isActive
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                        }`}
                      >
                        {tenant.tenancy.status_display || (tenant.isActive ? "Đang thuê" : "Đã rời")}
                      </span>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Tenants - Mobile Cards */}
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
        ) : filteredTenants.length === 0 ? (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-12 text-center">
            <UserOutlined className="w-12 h-12 mx-auto mb-3 text-[#64748B] opacity-50" />
            <p className="text-[#475569]">
              {searchQuery || filterStatus !== "all"
                ? "Không tìm thấy khách thuê nào"
                : "Chưa có khách thuê nào"}
            </p>
          </div>
        ) : (
          filteredTenants.map((tenant) => (
            <motion.div
              key={`${tenant.id}-${tenant.tenancy.id}`}
              variants={itemVariants}
              onClick={() => router.push(`/tenants/${tenant.id}`)}
              className="bg-white border border-[#E2E8F0] rounded-xl p-4 space-y-3 cursor-pointer hover:border-primary/30 transition-colors"
            >
              {/* Header: Name & Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserOutlined className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-base font-semibold text-[#0F172A]">{tenant.full_name}</span>
                </div>
                <span
                  className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full border ${
                    tenant.isActive
                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                      : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                  }`}
                >
                  {tenant.tenancy.status_display || (tenant.isActive ? "Đang thuê" : "Đã rời")}
                </span>
              </div>

              {/* Contact Info */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-[#64748B] uppercase tracking-wider">Liên hệ</div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-[#475569]">
                    <MailOutlined className="w-4 h-4 shrink-0" />
                    <span className="truncate">{tenant.email}</span>
                  </div>
                  {tenant.phone && (
                    <div className="flex items-center gap-2 text-sm text-[#475569]">
                      <PhoneOutlined className="w-4 h-4 shrink-0" />
                      <span className="truncate">{tenant.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Room Info */}
              {tenant.room && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-[#64748B] uppercase tracking-wider">Phòng</div>
                  <div className="flex items-center gap-2">
                    <HomeOutlined className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">Phòng {tenant.room.room_number}</p>
                      <p className="text-xs text-[#475569]">{tenant.property?.name || "N/A"}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Dates & Rent */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E2E8F0]">
                <div>
                  <div className="text-xs font-medium text-[#64748B] mb-1">Ngày bắt đầu</div>
                  <div className="text-sm text-[#475569]">
                    {tenant.tenancy.start_date
                      ? new Date(tenant.tenancy.start_date).toLocaleDateString("vi-VN")
                      : "-"}
                  </div>
                  {tenant.daysRemaining !== null && tenant.daysRemaining <= 30 && tenant.isActive && (
                    <div className="text-xs text-orange-400 mt-1">
                      Còn {tenant.daysRemaining} ngày
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs font-medium text-[#64748B] mb-1">Ngày kết thúc</div>
                  <div className="text-sm text-[#475569]">
                    {tenant.tenancy.end_date
                      ? new Date(tenant.tenancy.end_date).toLocaleDateString("vi-VN")
                      : "-"}
                  </div>
                </div>
              </div>

              {/* Rent */}
              {tenant.tenancy.base_rent && (
                <div className="pt-2 border-t border-[#E2E8F0]">
                  <div className="text-xs font-medium text-[#64748B] mb-1">Tiền thuê</div>
                  <div className="text-base font-semibold text-[#0F172A]">
                    {Number(tenant.tenancy.base_rent).toLocaleString("vi-VN")}đ
                  </div>
                </div>
              )}
            </motion.div>
          ))
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
            showTotal={(total, range) => `${range[0]}-${range[1]} của ${total} người dùng`}
            pageSizeOptions={['20', '50', '100']}
            responsive
          />
        </div>
      )}
    </div>
  );
}
