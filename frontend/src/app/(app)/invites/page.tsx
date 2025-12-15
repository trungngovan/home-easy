"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { BuildOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, DeleteOutlined, ExclamationCircleOutlined, HomeOutlined, LoadingOutlined, MailOutlined, PhoneOutlined, PlusOutlined, SearchOutlined, SendOutlined } from '@ant-design/icons'
import {  } from 'lucide-react';
import { apiFetch, clearAuthToken, endpoints, PaginatedResponse, buildPaginatedPath } from "@/lib/api";
import { Input, Select, Pagination, Modal } from "antd";

type Invite = {
  id: string;
  property: string;
  property_detail?: {
    id: string;
    name: string;
    address: string;
  };
  room: string;
  room_detail?: {
    id: string;
    room_number: string;
    floor: number;
  };
  email: string | null;
  phone: string | null;
  status: "pending" | "accepted" | "rejected" | "expired" | string;
  status_display?: string;
  is_expired?: boolean;
  created_at: string;
  expires_at: string | null;
};

const statusConfig: Record<string, { color: string; bgColor: string; borderColor: string; label: string }> = {
  pending: {
    color: "text-orange-400",
    bgColor: "bg-orange-500/20",
    borderColor: "border-orange-500/30",
    label: "Chờ phản hồi",
  },
  accepted: {
    color: "text-green-400",
    bgColor: "bg-green-500/20",
    borderColor: "border-green-500/30",
    label: "Đã chấp nhận",
  },
  rejected: {
    color: "text-red-400",
    bgColor: "bg-red-500/20",
    borderColor: "border-red-500/30",
    label: "Đã từ chối",
  },
  expired: {
    color: "text-gray-400",
    bgColor: "bg-gray-500/20",
    borderColor: "border-gray-500/30",
    label: "Hết hạn",
  },
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

export default function InvitesPage() {
  const router = useRouter();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "accepted" | "rejected" | "expired">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        
        // Build API path with pagination and filters
        const basePath = buildPaginatedPath(endpoints.invites, { page, pageSize });
        const params: string[] = [];
        
        if (statusFilter !== "all") {
          params.push(`status=${statusFilter}`);
        }
        if (debouncedSearch) {
          params.push(`search=${encodeURIComponent(debouncedSearch)}`);
        }
        
        const separator = basePath.includes("?") ? "&" : "?";
        const apiPath = params.length > 0 
          ? `${basePath}${separator}${params.join("&")}`
          : basePath;

        const res = await apiFetch<PaginatedResponse<Invite>>(apiPath);
        setInvites(res.results || []);
        setTotalCount(res.count || 0);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Không thể tải dữ liệu";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [page, pageSize, statusFilter, debouncedSearch, router]);

  const cancelInvite = async (inviteId: string) => {
    try {
      setUpdatingId(inviteId);
      await apiFetch(`${endpoints.invites}${inviteId}/`, {
        method: "PATCH",
        body: JSON.stringify({ status: "expired" }),
      });
      setInvites((prev) =>
        prev.map((inv) => (inv.id === inviteId ? { ...inv, status: "expired", status_display: "Hết hạn" } : inv))
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Không thể hủy lời mời";
      setError(message);
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteInvite = async (inviteId: string) => {
    Modal.confirm({
      title: "Xóa lời mời",
      content: "Bạn có chắc chắn muốn xóa lời mời này? Hành động này không thể hoàn tác.",
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          setDeletingId(inviteId);
          await apiFetch(`${endpoints.invites}${inviteId}/`, {
            method: "DELETE",
          });
          setInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
          setTotalCount((prev) => Math.max(0, prev - 1));
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Không thể xóa lời mời";
          setError(message);
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  // Calculate stats from current data
  const pendingCount = invites.filter((i) => i.status === "pending").length;
  const acceptedCount = invites.filter((i) => i.status === "accepted").length;
  const rejectedCount = invites.filter((i) => i.status === "rejected").length;
  const expiredCount = invites.filter((i) => i.status === "expired").length;

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handlePageChange = (newPage: number, newPageSize?: number) => {
    setPage(newPage);
    if (newPageSize) {
      setPageSize(newPageSize);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="font-[family-name:var(--font-poppins)] text-2xl lg:text-3xl font-bold text-[#0F172A] flex items-center gap-2">
            <SendOutlined className="w-5 h-5 text-primary" />
            Lời mời
          </h1>
          <p className="text-[#475569] mt-1">
            {totalCount} lời mời • {pendingCount} chờ phản hồi • {acceptedCount} đã chấp nhận • {rejectedCount} đã từ chối
          </p>
        </div>

        <Link
          href="/tenants/invite"
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-bg-dark font-semibold rounded-lg hover:bg-primary/90 transition-colors w-fit"
        >
          <PlusOutlined className="w-4 h-4" />
          Tạo lời mời mới
        </Link>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          className="bg-white border border-[#E2E8F0] rounded-xl p-5"
          variants={itemVariants}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <ClockCircleOutlined className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-400">{pendingCount}</p>
              <p className="text-xs text-[#475569]">Chờ phản hồi</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          className="bg-white border border-[#E2E8F0] rounded-xl p-5"
          variants={itemVariants}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircleOutlined className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">{acceptedCount}</p>
              <p className="text-xs text-[#475569]">Đã chấp nhận</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          className="bg-white border border-[#E2E8F0] rounded-xl p-5"
          variants={itemVariants}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <CloseCircleOutlined className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-400">{rejectedCount}</p>
              <p className="text-xs text-[#475569]">Đã từ chối</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          className="bg-white border border-[#E2E8F0] rounded-xl p-5"
          variants={itemVariants}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-500/10 flex items-center justify-center">
              <CloseCircleOutlined className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-400">{expiredCount}</p>
              <p className="text-xs text-[#475569]">Hết hạn</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          className="bg-white border border-[#E2E8F0] rounded-xl p-5"
          variants={itemVariants}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <SendOutlined className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p >{totalCount}</p>
              <p className="text-xs text-[#475569]">Tổng cộng</p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Filters */}
      <motion.div
        className="flex flex-col sm:flex-row gap-4 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {/* Search */}
        <div className="flex-1 w-full sm:max-w-md">
          <Input
            type="text"
            placeholder="Tìm theo email, số điện thoại, tài sản..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            prefix={<SearchOutlined className="w-5 h-5 text-[#64748B]" />}
            className="w-full"
          />
        </div>

        {/* Status Filter */}
        <Select
          className="w-full sm:w-[180px]"
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value as typeof statusFilter);
            setPage(1);
          }}
          placeholder="Tất cả trạng thái"
        >
          <Select.Option value="all">Tất cả trạng thái</Select.Option>
          <Select.Option value="pending">Chờ phản hồi</Select.Option>
          <Select.Option value="accepted">Đã chấp nhận</Select.Option>
          <Select.Option value="rejected">Đã từ chối</Select.Option>
          <Select.Option value="expired">Hết hạn</Select.Option>
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

      {/* Invites - Desktop Table */}
      <motion.div
        className="hidden lg:block bg-white border border-[#E2E8F0] rounded-xl overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-[#475569] uppercase tracking-wider border-b border-[#E2E8F0]">
                <th className="px-5 py-4 font-medium min-w-[180px]">Liên hệ</th>
                <th className="px-5 py-4 font-medium min-w-[220px]">Tài sản / Phòng</th>
                <th className="px-5 py-4 font-medium min-w-[120px]">Trạng thái</th>
                <th className="px-5 py-4 font-medium min-w-[140px]">Tạo lúc</th>
                <th className="px-5 py-4 font-medium min-w-[140px]">Hết hạn</th>
                <th className="px-5 py-4 font-medium min-w-[60px] text-center">Xóa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-5 py-4">
                      <div className="h-12 bg-border-dark rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : invites.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <SendOutlined className="w-12 h-12 mx-auto mb-3 text-[#64748B] opacity-50" />
                    <p className="text-[#475569]">
                      {searchQuery || statusFilter !== "all"
                        ? "Không tìm thấy lời mời nào"
                        : "Chưa có lời mời nào"}
                    </p>
                  </td>
                </tr>
              ) : (
                invites.map((invite) => {
                  const status = statusConfig[invite.status] || {
                    color: "text-[#475569]",
                    bgColor: "bg-border-dark",
                    borderColor: "border-[#E2E8F0]",
                    label: invite.status_display || invite.status,
                  };
                  return (
                    <motion.tr
                      key={invite.id}
                      variants={itemVariants}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1.5 text-sm">
                          {invite.email ? (
                            <div className="flex items-center gap-2 text-[#475569]">
                              <MailOutlined className="w-4 h-4" />
                              <span className="truncate">{invite.email}</span>
                            </div>
                          ) : null}
                          {invite.phone ? (
                            <div className="flex items-center gap-2 text-[#475569]">
                              <PhoneOutlined className="w-4 h-4" />
                              <span className="truncate">{invite.phone}</span>
                            </div>
                          ) : null}
                          {!invite.email && !invite.phone && (
                            <span className="text-[#64748B] text-sm">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <BuildOutlined className="w-4 h-4 text-primary shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-[#0F172A]">
                              {invite.property_detail?.name || "Tài sản"}
                            </div>
                            <div className="text-xs text-[#475569] mt-0.5 flex items-center gap-1.5">
                              <HomeOutlined className="w-3.5 h-3.5" />
                              Phòng {invite.room_detail?.room_number || "N/A"}
                              {invite.room_detail?.floor && (
                                <span className="text-[#64748B]">• Tầng {invite.room_detail.floor}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full border whitespace-nowrap ${status.bgColor} ${status.color} ${status.borderColor}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-[#475569]">
                        {invite.created_at
                          ? new Date(invite.created_at).toLocaleString("vi-VN", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>
                      <td className="px-5 py-4 text-sm text-[#475569]">
                        {invite.expires_at
                          ? new Date(invite.expires_at).toLocaleString("vi-VN", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Không thiết lập"}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-center">
                          <button
                            onClick={() => deleteInvite(invite.id)}
                            disabled={deletingId === invite.id}
                            className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center"
                            title="Xóa lời mời"
                          >
                            {deletingId === invite.id ? (
                              <LoadingOutlined className="w-5 h-5 animate-spin" />
                            ) : (
                              <DeleteOutlined className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Invites - Mobile Cards */}
      <motion.div
        className="lg:hidden space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {loading ? (
          [1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white border border-[#E2E8F0] rounded-xl p-4">
              <div className="h-32 bg-border-dark rounded animate-pulse" />
            </div>
          ))
        ) : invites.length === 0 ? (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-12 text-center">
            <SendOutlined className="w-12 h-12 mx-auto mb-3 text-[#64748B] opacity-50" />
            <p className="text-[#475569]">
              {searchQuery || statusFilter !== "all"
                ? "Không tìm thấy lời mời nào"
                : "Chưa có lời mời nào"}
            </p>
          </div>
        ) : (
          invites.map((invite) => {
            const status = statusConfig[invite.status] || {
              color: "text-[#475569]",
              bgColor: "bg-border-dark",
              borderColor: "border-[#E2E8F0]",
              label: invite.status_display || invite.status,
            };
            return (
              <motion.div
                key={invite.id}
                variants={itemVariants}
                className="bg-white border border-[#E2E8F0] rounded-xl p-4 space-y-3"
              >
                {/* Header: Status & Delete */}
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full border ${status.bgColor} ${status.color} ${status.borderColor}`}
                  >
                    {status.label}
                  </span>
                  <button
                    onClick={() => deleteInvite(invite.id)}
                    disabled={deletingId === invite.id}
                    className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center"
                    title="Xóa lời mời"
                  >
                    {deletingId === invite.id ? (
                      <LoadingOutlined className="w-5 h-5 animate-spin" />
                    ) : (
                      <DeleteOutlined className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {/* Contact Info */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-[#64748B] uppercase tracking-wider">Liên hệ</div>
                  <div className="space-y-1.5">
                    {invite.email ? (
                      <div className="flex items-center gap-2 text-sm text-[#475569]">
                        <MailOutlined className="w-4 h-4 shrink-0" />
                        <span className="truncate">{invite.email}</span>
                      </div>
                    ) : null}
                    {invite.phone ? (
                      <div className="flex items-center gap-2 text-sm text-[#475569]">
                        <PhoneOutlined className="w-4 h-4 shrink-0" />
                        <span className="truncate">{invite.phone}</span>
                      </div>
                    ) : null}
                    {!invite.email && !invite.phone && (
                      <span className="text-sm text-[#64748B]">-</span>
                    )}
                  </div>
                </div>

                {/* Property & Room */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-[#64748B] uppercase tracking-wider">Tài sản / Phòng</div>
                  <div className="flex items-center gap-2">
                    <BuildOutlined className="w-4 h-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#0F172A]">
                        {invite.property_detail?.name || "Tài sản"}
                      </div>
                      <div className="text-xs text-[#475569] mt-0.5 flex items-center gap-1.5">
                        <HomeOutlined className="w-3.5 h-3.5" />
                        Phòng {invite.room_detail?.room_number || "N/A"}
                        {invite.room_detail?.floor && (
                          <span className="text-[#64748B]">• Tầng {invite.room_detail.floor}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E2E8F0]">
                  <div>
                    <div className="text-xs font-medium text-[#64748B] mb-1">Tạo lúc</div>
                    <div className="text-sm text-[#475569]">
                      {invite.created_at
                        ? new Date(invite.created_at).toLocaleString("vi-VN", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-[#64748B] mb-1">Hết hạn</div>
                    <div className="text-sm text-[#475569]">
                      {invite.expires_at
                        ? new Date(invite.expires_at).toLocaleString("vi-VN", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Không thiết lập"}
                    </div>
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
              onChange={handlePageChange}
              onShowSizeChange={handlePageChange}
              showSizeChanger
              showQuickJumper
              showTotal={(total, range) => `${range[0]}-${range[1]} của ${total} lời mời`}
              pageSizeOptions={['20', '50', '100']}
            />
        </div>
      )}
    </div>
  );
}
