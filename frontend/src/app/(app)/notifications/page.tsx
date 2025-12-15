"use client";

import { useEffect, useState } from "react";
import { apiFetch, endpoints, clearAuthToken, PaginatedResponse, buildPaginatedPath } from "@/lib/api";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { BellOutlined, CalendarOutlined, CheckOutlined, ExclamationCircleOutlined, FileTextOutlined, WalletOutlined, UserAddOutlined, LoadingOutlined } from '@ant-design/icons'
import { Bell, CheckCheck } from 'lucide-react';
import { Select, Pagination, App } from "antd";

type Notification = {
  id: string;
  channel: string;
  template: string;
  payload: Record<string, unknown> | null;
  created_at: string;
  sent_at: string | null;
  is_read: boolean;
  read_at: string | null;
};

// Helper function to format unknown payloads
function formatUnknownPayload(payload: Record<string, unknown>): string {
  // Try to format common payment fields
  if (payload.amount || payload.payment_id || payload.invoice_id) {
    const parts: string[] = [];
    if (payload.tenant_name) {
      parts.push(`Người thanh toán: ${payload.tenant_name}`);
    }
    if (payload.room_number) {
      parts.push(`Phòng: ${payload.room_number}`);
    }
    if (payload.amount) {
      const amount = Number(payload.amount).toLocaleString("vi-VN");
      parts.push(`Số tiền: ${amount}đ`);
    }
    if (payload.method) {
      const methodLabels: Record<string, string> = {
        cash: "Tiền mặt",
        bank_transfer: "Chuyển khoản",
        momo: "MoMo",
        vnpay: "VNPay",
        other: "Khác",
      };
      const method = payload.method as string;
      parts.push(`Phương thức: ${methodLabels[method] || method}`);
    }
    if (payload.period) {
      parts.push(`Kỳ: ${payload.period}`);
    }
    return parts.join(" • ");
  }
  
  // For other payloads, try to format key-value pairs nicely
  const entries = Object.entries(payload).slice(0, 3); // Limit to first 3 fields
  return entries.map(([key, value]) => {
    const formattedKey = key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    return `${formattedKey}: ${value}`;
  }).join(" • ");
}

// Helper function to format notification message from payload
function formatNotificationMessage(template: string, payload: Record<string, unknown> | null): string {
  if (!payload) return "";
  
  switch (template) {
    case "invite.sent":
      return `Đã gửi lời mời đến ${payload.email || payload.phone || "khách thuê"}`;
    case "invite.received": {
      const propertyName = payload.property_name as string;
      const roomNumber = payload.room_number as string;
      if (propertyName && roomNumber) {
        return `Bạn đã nhận được lời mời thuê phòng ${roomNumber} tại ${propertyName}`;
      }
      return "Bạn đã nhận được lời mời thuê phòng";
    }
    case "invite.accepted":
      return `Lời mời đã được chấp nhận bởi ${payload.email || payload.phone || "khách thuê"}`;
    case "invite.rejected":
      return `Lời mời đã bị từ chối bởi ${payload.email || payload.phone || "khách thuê"}`;
    case "invoice.created":
      return `Hóa đơn mới cho phòng ${payload.room_number || ""}`;
    case "invoice.issued":
      return `Hóa đơn ${payload.period || ""} đã được phát hành`;
    case "invoice.overdue":
      return `Hóa đơn ${payload.period || ""} đã quá hạn`;
    case "payment.created": {
      const amount = payload.amount ? Number(payload.amount).toLocaleString("vi-VN") : "";
      const method = payload.method as string;
      const methodLabels: Record<string, string> = {
        cash: "Tiền mặt",
        bank_transfer: "Chuyển khoản",
        momo: "MoMo",
        vnpay: "VNPay",
        other: "Khác",
      };
      const methodLabel = method ? methodLabels[method] || method : "";
      const tenantName = payload.tenant_name as string;
      const roomNumber = payload.room_number as string;
      
      const parts: string[] = [];
      if (tenantName) {
        parts.push(`${tenantName} đã thanh toán`);
      }
      if (amount && methodLabel) {
        parts.push(`${amount}đ bằng ${methodLabel}`);
      } else if (amount) {
        parts.push(`${amount}đ`);
      }
      if (roomNumber) {
        parts.push(`cho phòng ${roomNumber}`);
      }
      if (payload.period) {
        parts.push(`kỳ ${payload.period}`);
      }
      
      return parts.length > 0 ? parts.join(" ") : `Thanh toán mới cho hóa đơn kỳ ${payload.period || ""}`;
    }
    case "payment.received": {
      const receivedAmount = payload.amount ? Number(payload.amount).toLocaleString("vi-VN") : "";
      const receivedTenantName = payload.tenant_name as string;
      const receivedRoomNumber = payload.room_number as string;
      const receivedParts: string[] = [];
      if (receivedTenantName) {
        receivedParts.push(`Đã nhận thanh toán ${receivedAmount}đ từ ${receivedTenantName}`);
      } else {
        receivedParts.push(`Đã nhận thanh toán ${receivedAmount}đ`);
      }
      if (receivedRoomNumber) {
        receivedParts.push(`phòng ${receivedRoomNumber}`);
      }
      if (payload.period) {
        receivedParts.push(`kỳ ${payload.period}`);
      }
      return receivedParts.length > 0 ? receivedParts.join(" ") : `Đã nhận thanh toán ${payload.amount || ""} VNĐ`;
    }
    case "payment.failed":
      return `Thanh toán ${payload.amount || ""} VNĐ thất bại`;
    case "maintenance.created":
      return `Yêu cầu bảo trì mới: ${payload.title || ""}`;
    case "maintenance.assigned":
      return `Bảo trì đã được phân công`;
    case "maintenance.status_changed":
      return `Trạng thái bảo trì đã thay đổi`;
    case "tenancy.created":
      return `Hợp đồng thuê mới cho phòng ${payload.room_number || ""}`;
    default:
      return "";
  }
}

const templateConfig: Record<string, { icon: typeof BellOutlined; color: string; label: string }> = {
  "invoice.created": { icon: FileTextOutlined, color: "text-blue-400", label: "Hóa đơn mới" },
  "invoice.issued": { icon: CalendarOutlined, color: "text-orange-400", label: "Hóa đơn đã phát hành" },
  "invoice.overdue": { icon: ExclamationCircleOutlined, color: "text-red-400", label: "Hóa đơn quá hạn" },
  "payment.received": { icon: WalletOutlined, color: "text-green-400", label: "Đã nhận thanh toán" },
  "payment.failed": { icon: ExclamationCircleOutlined, color: "text-red-400", label: "Thanh toán thất bại" },
  "payment.created": { icon: WalletOutlined, color: "text-blue-400", label: "Thanh toán mới" },
  "maintenance.created": { icon: ExclamationCircleOutlined, color: "text-yellow-400", label: "Yêu cầu bảo trì mới" },
  "maintenance.assigned": { icon: CheckOutlined, color: "text-blue-400", label: "Bảo trì đã phân công" },
  "maintenance.status_changed": { icon: CheckOutlined, color: "text-green-400", label: "Trạng thái bảo trì thay đổi" },
  "invite.sent": { icon: UserAddOutlined, color: "text-blue-400", label: "Đã gửi lời mời" },
  "invite.received": { icon: UserAddOutlined, color: "text-primary", label: "Lời mời mới" },
  "invite.accepted": { icon: CheckOutlined, color: "text-green-400", label: "Lời mời đã chấp nhận" },
  "invite.rejected": { icon: ExclamationCircleOutlined, color: "text-red-400", label: "Lời mời đã bị từ chối" },
  "tenancy.created": { icon: CheckOutlined, color: "text-green-400", label: "Hợp đồng mới" },
  "meter_reading.submitted": { icon: FileTextOutlined, color: "text-blue-400", label: "Đã gửi chỉ số" },
};

export default function NotificationsPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const { refetch: refetchUnreadCount } = useUnreadNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterChannel, setFilterChannel] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [acceptingInvites, setAcceptingInvites] = useState<Set<string>>(new Set());
  const [rejectingInvites, setRejectingInvites] = useState<Set<string>>(new Set());
  const [inviteStatuses, setInviteStatuses] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await apiFetch<PaginatedResponse<Notification>>(
          buildPaginatedPath(endpoints.notifications, { page, pageSize })
        );
        setNotifications(data.results || []);
        setTotalCount(data.count || 0);
        
        // Fetch invite statuses for invite.received notifications
        const inviteNotifications = data.results?.filter(
          (n) => n.template === "invite.received" && n.payload?.invite_id
        ) || [];
        
        if (inviteNotifications.length > 0) {
          const statusPromises = inviteNotifications.map(async (notification) => {
            const inviteId = notification.payload?.invite_id as string;
            try {
              const invite = await apiFetch<{ status: string }>(
                `${endpoints.invites}${inviteId}/`
              );
              return { inviteId, status: invite.status };
            } catch {
              return { inviteId, status: "unknown" };
            }
          });
          
          const statuses = await Promise.all(statusPromises);
          const statusMap: Record<string, string> = {};
          statuses.forEach(({ inviteId, status }) => {
            statusMap[inviteId] = status;
          });
          setInviteStatuses((prev) => ({ ...prev, ...statusMap }));
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Không thể tải dữ liệu";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router, page, pageSize]);

  const filteredNotifications = notifications.filter((n) => {
    return filterChannel === "all" || n.channel === filterChannel;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Group notifications by date
  const groupedNotifications = filteredNotifications.reduce(
    (groups, notification) => {
      const date = new Date(notification.created_at).toLocaleDateString("vi-VN");
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(notification);
      return groups;
    },
    {} as Record<string, Notification[]>
  );

  const markAllAsRead = async () => {
    try {
      setMarkingAllRead(true);
      const response = await apiFetch<{ marked_read: number }>(
        `${endpoints.notifications}mark_all_read/`,
        {
          method: "POST",
        }
      );
      
      // Refresh notifications
      const data = await apiFetch<PaginatedResponse<Notification>>(
        buildPaginatedPath(endpoints.notifications, { page, pageSize })
      );
      setNotifications(data.results || []);
      setTotalCount(data.count || 0);
      
      // Refetch unread count
      refetchUnreadCount();
      
      message.success(`Đã đánh dấu ${response.marked_read} thông báo là đã đọc`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Không thể đánh dấu đã đọc";
      message.error(errorMessage);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const acceptInvite = async (notification: Notification) => {
    if (!notification.payload || typeof notification.payload.invite_id !== "string") {
      message.error("Không tìm thấy thông tin lời mời");
      return;
    }

    const inviteId = notification.payload.invite_id as string;
    
    // Check if invite is already accepted/rejected
    const currentStatus = inviteStatuses[inviteId];
    if (currentStatus === "accepted") {
      message.warning("Lời mời này đã được chấp nhận rồi");
      return;
    }
    if (currentStatus === "rejected") {
      message.warning("Lời mời này đã bị từ chối rồi");
      return;
    }
    
    try {
      setAcceptingInvites((prev) => new Set(prev).add(notification.id));
      
      // Update invite status to accepted
      await apiFetch(`${endpoints.invites}${inviteId}/`, {
        method: "PATCH",
        body: JSON.stringify({ status: "accepted" }),
      });
      
      // Mark notification as read
      try {
        await apiFetch(`${endpoints.notifications}${notification.id}/mark_read/`, {
          method: "POST",
        });
      } catch {
        // Ignore if marking as read fails
      }
      
      // Update invite status in local state
      setInviteStatuses((prev) => ({ ...prev, [inviteId]: "accepted" }));
      
      // Refresh notifications
      const data = await apiFetch<PaginatedResponse<Notification>>(
        buildPaginatedPath(endpoints.notifications, { page, pageSize })
      );
      setNotifications(data.results || []);
      setTotalCount(data.count || 0);
      
      // Refetch unread count
      refetchUnreadCount();
      
      message.success("Đã chấp nhận lời mời thành công!");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Không thể chấp nhận lời mời";
      // Check if error is about already accepted/rejected
      if (errorMessage.includes("đã được chấp nhận")) {
        setInviteStatuses((prev) => ({ ...prev, [inviteId]: "accepted" }));
      } else if (errorMessage.includes("đã bị từ chối")) {
        setInviteStatuses((prev) => ({ ...prev, [inviteId]: "rejected" }));
      }
      message.error(errorMessage);
    } finally {
      setAcceptingInvites((prev) => {
        const next = new Set(prev);
        next.delete(notification.id);
        return next;
      });
    }
  };

  const rejectInvite = async (notification: Notification) => {
    if (!notification.payload || typeof notification.payload.invite_id !== "string") {
      message.error("Không tìm thấy thông tin lời mời");
      return;
    }

    const inviteId = notification.payload.invite_id as string;
    
    // Check if invite is already accepted/rejected
    const currentStatus = inviteStatuses[inviteId];
    if (currentStatus === "accepted") {
      message.warning("Lời mời này đã được chấp nhận rồi");
      return;
    }
    if (currentStatus === "rejected") {
      message.warning("Lời mời này đã bị từ chối rồi");
      return;
    }
    
    try {
      setRejectingInvites((prev) => new Set(prev).add(notification.id));
      
      // Update invite status to rejected
      await apiFetch(`${endpoints.invites}${inviteId}/`, {
        method: "PATCH",
        body: JSON.stringify({ status: "rejected" }),
      });
      
      // Mark notification as read
      try {
        await apiFetch(`${endpoints.notifications}${notification.id}/mark_read/`, {
          method: "POST",
        });
      } catch {
        // Ignore if marking as read fails
      }
      
      // Update invite status in local state
      setInviteStatuses((prev) => ({ ...prev, [inviteId]: "rejected" }));
      
      // Refresh notifications
      const data = await apiFetch<PaginatedResponse<Notification>>(
        buildPaginatedPath(endpoints.notifications, { page, pageSize })
      );
      setNotifications(data.results || []);
      setTotalCount(data.count || 0);
      
      // Refetch unread count
      refetchUnreadCount();
      
      message.success("Đã từ chối lời mời");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Không thể từ chối lời mời";
      // Check if error is about already accepted/rejected
      if (errorMessage.includes("đã được chấp nhận")) {
        setInviteStatuses((prev) => ({ ...prev, [inviteId]: "accepted" }));
      } else if (errorMessage.includes("đã bị từ chối")) {
        setInviteStatuses((prev) => ({ ...prev, [inviteId]: "rejected" }));
      }
      message.error(errorMessage);
    } finally {
      setRejectingInvites((prev) => {
        const next = new Set(prev);
        next.delete(notification.id);
        return next;
      });
    }
  };

  const markNotificationAsRead = async (notification: Notification) => {
    // If already read, do nothing
    if (notification.is_read) {
      return;
    }

    try {
      // Mark notification as read on server
      await apiFetch(`${endpoints.notifications}${notification.id}/mark_read/`, {
        method: "POST",
      });
      
      // Update local state immediately for better UX
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
      
      // Refetch unread count to update badge
      refetchUnreadCount();
    } catch (err: unknown) {
      // Silently fail - the notification will be updated on next refresh
      console.error("Failed to mark notification as read:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F9FF]">
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="font-[family-name:var(--font-poppins)] text-2xl lg:text-3xl font-bold text-[#0F172A]">
              Thông báo
            </h1>
            <p className="text-[#475569] mt-1">
              {totalCount} thông báo • {unreadCount} chưa đọc
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={markAllAsRead}
              disabled={markingAllRead || unreadCount === 0}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] cursor-pointer w-full sm:w-auto"
            >
              {markingAllRead ? (
                <>
                  <LoadingOutlined className="w-4 h-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <CheckCheck className="w-4 h-4" />
                  Đánh dấu đã đọc tất cả
                </>
              )}
            </button>
          </div>
        </motion.div>

      {/* Filters */}
      <motion.div
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Select 
          className="w-full sm:w-[180px]" 
          placeholder="Tất cả kênh"
          value={filterChannel}
          onChange={(value) => setFilterChannel(value)}
        >
            <Select.Option value="all">Tất cả kênh</Select.Option>
            <Select.Option value="inapp">Trong ứng dụng</Select.Option>
            <Select.Option value="email">Email</Select.Option>
            <Select.Option value="push">Push</Select.Option>
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

      {/* Notifications List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-16 bg-white border border-[#E2E8F0] rounded-xl shadow-sm">
            <Bell className="w-16 h-16 mx-auto mb-4 text-[#64748B] opacity-50" />
            <p className="text-[#475569] text-lg font-medium">Chưa có thông báo nào</p>
          </div>
        ) : (
          <div className="w-full">
            {Object.entries(groupedNotifications).map(([date, items]) => (
            <div key={date} className="mb-8">
              <h3 className="text-sm font-semibold text-[#475569] mb-4 px-2 uppercase tracking-wider">{date}</h3>
              <div className="space-y-3">
                {items.map((notification) => {
                  const config = templateConfig[notification.template] || {
                    icon: Bell,
                    color: "text-[#475569]",
                    label: notification.template,
                  };
                  const Icon = config.icon;
                  const isRead = notification.is_read;
                  const isInviteReceived = notification.template === "invite.received";
                  const inviteId = notification.payload?.invite_id as string | undefined;
                  const isAccepting = inviteId ? acceptingInvites.has(notification.id) : false;
                  const isRejecting = inviteId ? rejectingInvites.has(notification.id) : false;
                  const inviteStatus = inviteId ? inviteStatuses[inviteId] : undefined;
                  // Check if invite can be accepted/rejected (must be pending and not already processed)
                  const canAcceptInvite = isInviteReceived && inviteId && !isAccepting && !isRejecting && inviteStatus !== "accepted" && inviteStatus !== "rejected" && (inviteStatus === "pending" || inviteStatus === undefined);
                  const canRejectInvite = isInviteReceived && inviteId && !isAccepting && !isRejecting && inviteStatus !== "accepted" && inviteStatus !== "rejected" && (inviteStatus === "pending" || inviteStatus === undefined);

                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => markNotificationAsRead(notification)}
                      className={`flex items-start gap-3 p-3 sm:p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                        isRead
                          ? "bg-white border-[#E2E8F0] hover:border-primary/30 hover:shadow-sm"
                          : "bg-white border-primary/30 shadow-sm hover:border-primary/50 hover:shadow-md"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isRead ? "bg-[#F1F5F9]" : "bg-primary/10"
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p
                                className={`font-semibold text-sm ${isRead ? "text-[#475569]" : "text-[#0F172A]"}`}
                              >
                                {config.label}
                              </p>
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded-md font-medium whitespace-nowrap ${
                                  notification.channel === "email"
                                    ? "bg-blue-500/10 text-blue-600"
                                    : notification.channel === "push"
                                    ? "bg-purple-500/10 text-purple-600"
                                    : "bg-gray-500/10 text-gray-600"
                                }`}
                              >
                                {notification.channel === "inapp"
                                  ? "Trong app"
                                  : notification.channel === "email"
                                  ? "Email"
                                  : "Push"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {!isRead && (
                              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            )}
                            <span className="text-xs text-[#94A3B8] whitespace-nowrap">
                              {new Date(notification.created_at).toLocaleTimeString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                        {notification.payload && (
                          <p className="text-sm text-[#64748B] leading-relaxed mt-1">
                            {formatNotificationMessage(notification.template, notification.payload) || 
                             formatUnknownPayload(notification.payload)}
                          </p>
                        )}
                        {(canAcceptInvite || canRejectInvite) && (
                          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-[#E2E8F0]">
                            {canAcceptInvite && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  acceptInvite(notification);
                                }}
                                disabled={isAccepting || isRejecting}
                                className="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                {isAccepting ? (
                                  <>
                                    <LoadingOutlined className="w-3.5 h-3.5 animate-spin" />
                                    Đang xử lý...
                                  </>
                                ) : (
                                  <>
                                    <CheckOutlined className="w-3.5 h-3.5" />
                                    Chấp nhận
                                  </>
                                )}
                              </button>
                            )}
                            {canRejectInvite && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  rejectInvite(notification);
                                }}
                                disabled={isAccepting || isRejecting}
                                className="px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                {isRejecting ? (
                                  <>
                                    <LoadingOutlined className="w-3.5 h-3.5 animate-spin" />
                                    Đang xử lý...
                                  </>
                                ) : (
                                  <>
                                    <ExclamationCircleOutlined className="w-3.5 h-3.5" />
                                    Từ chối
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
            ))}
          </div>
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
            showTotal={(total, range) => `${range[0]}-${range[1]} của ${total} thông báo`}
            pageSizeOptions={['20', '50', '100']}
            responsive
          />
        </div>
      )}
      </div>
    </div>
  );
}
