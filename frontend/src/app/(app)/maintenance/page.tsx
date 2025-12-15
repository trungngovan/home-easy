"use client";

import { useEffect, useState } from "react";
import { apiFetch, endpoints, clearAuthToken, PaginatedResponse, buildPaginatedPath, getUser } from "@/lib/api";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, DropboxOutlined, HomeOutlined, PlusOutlined, RightOutlined, SearchOutlined, ThunderboltOutlined, ToolOutlined } from '@ant-design/icons'
import { Wifi, Sofa, HelpCircle, Play,  } from 'lucide-react';
import { Input, Select, Pagination } from "antd";

type Property = {
  id: string;
  name: string;
};

type Room = {
  id: string;
  building: string;
  room_number: string;
};

type UserType = {
  id: string;
  full_name: string;
  phone: string | null;
};

type MaintenanceRequest = {
  id: string;
  room: string;
  requester: string;
  title: string;
  description: string;
  category: string;
  status: string;
  assignee: string | null;
  created_at: string;
  updated_at: string;
};

const categoryConfig: Record<string, { icon: typeof ToolOutlined; color: string; bgColor: string; label: string }> = {
  electricity: { icon: ThunderboltOutlined, color: "text-yellow-400", bgColor: "bg-yellow-500/10", label: "Điện" },
  plumbing: { icon: DropboxOutlined, color: "text-blue-400", bgColor: "bg-blue-500/10", label: "Nước/Ống" },
  appliance: { icon: ToolOutlined, color: "text-orange-400", bgColor: "bg-orange-500/10", label: "Thiết bị" },
  furniture: { icon: Sofa, color: "text-purple-400", bgColor: "bg-purple-500/10", label: "Nội thất" },
  internet: { icon: Wifi, color: "text-cyan-400", bgColor: "bg-cyan-500/10", label: "Internet" },
  other: { icon: HelpCircle, color: "text-gray-400", bgColor: "bg-gray-500/10", label: "Khác" },
};

const statusConfig: Record<string, { color: string; bgColor: string; borderColor: string; label: string }> = {
  pending: { 
    color: "text-orange-400", 
    bgColor: "bg-orange-500/20",
    borderColor: "border-orange-500/30", 
    label: "Chờ xử lý" 
  },
  in_progress: { 
    color: "text-blue-400", 
    bgColor: "bg-blue-500/20",
    borderColor: "border-blue-500/30", 
    label: "Đang xử lý" 
  },
  done: { 
    color: "text-green-400", 
    bgColor: "bg-green-500/20",
    borderColor: "border-green-500/30", 
    label: "Hoàn thành" 
  },
  rejected: { 
    color: "text-red-400", 
    bgColor: "bg-red-500/20",
    borderColor: "border-red-500/30", 
    label: "Từ chối" 
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

export default function MaintenancePage() {
  const router = useRouter();
  const user = getUser();
  const isTenant = user?.role === "tenant";
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterProperty, setFilterProperty] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset to first page when search changes
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Build maintenance requests API path with filters and pagination
        const basePath = buildPaginatedPath(endpoints.maintenanceRequests, { page, pageSize });
        const params: string[] = [];
        
        if (filterStatus !== "all") {
          params.push(`status=${filterStatus}`);
        }
        if (filterCategory !== "all") {
          params.push(`category=${filterCategory}`);
        }
        if (filterProperty !== "all") {
          params.push(`room__building=${filterProperty}`);
        }
        if (debouncedSearch) {
          params.push(`search=${encodeURIComponent(debouncedSearch)}`);
        }
        
        const separator = basePath.includes("?") ? "&" : "?";
        const requestsApiPath = params.length > 0 
          ? `${basePath}${separator}${params.join("&")}`
          : basePath;

        // Tenants only see their own requests (backend filters automatically)
        // Landlords see all requests and need properties/rooms/users for filtering
        if (isTenant) {
          const requestsData = await apiFetch<PaginatedResponse<MaintenanceRequest>>(requestsApiPath);
          setRequests(requestsData.results || []);
          setTotalCount(requestsData.count || 0);
        } else {
          const [requestsData, propsData, roomsData, usersData] = await Promise.all([
            apiFetch<PaginatedResponse<MaintenanceRequest>>(requestsApiPath),
            apiFetch<PaginatedResponse<Property>>(buildPaginatedPath(endpoints.properties, { pageSize: 200 })),
            apiFetch<PaginatedResponse<Room>>(buildPaginatedPath(endpoints.rooms, { pageSize: 200 })),
            apiFetch<PaginatedResponse<UserType>>(buildPaginatedPath(endpoints.users, { pageSize: 200 })),
          ]);

          setRequests(requestsData.results || []);
          setTotalCount(requestsData.count || 0);
          setProperties(propsData.results || []);
          setRooms(roomsData.results || []);
          setUsers(usersData.results || []);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Không thể tải dữ liệu";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router, page, pageSize, filterStatus, filterCategory, filterProperty, debouncedSearch, isTenant]);

  // Enrich requests with related data
  const enrichedRequests = requests.map((req) => {
    const room = rooms.find((r) => r.id === req.room);
    const property = room ? properties.find((p) => p.id === room.building) : null;
    const requester = users.find((u) => u.id === req.requester);
    const assignee = req.assignee ? users.find((u) => u.id === req.assignee) : null;

    return {
      ...req,
      room,
      property,
      requester,
      assignee,
    };
  });

  // Filter requests (client-side filtering only for search since server handles status/category/property)
  // Note: Search is handled server-side, but we keep this for any additional client-side filtering if needed
  const filteredRequests = enrichedRequests;

  // Stats - calculate from current page data (for display)
  // Note: For accurate stats, you might want to fetch separate counts from API
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const inProgressCount = requests.filter((r) => r.status === "in_progress").length;
  const doneCount = requests.filter((r) => r.status === "done").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;

  const updateStatus = async (requestId: string, newStatus: string) => {
    try {
      await apiFetch(`${endpoints.maintenanceRequests}${requestId}/`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: newStatus } : r))
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Không thể cập nhật";
      setError(message);
    }
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
          <h1 className="font-[family-name:var(--font-poppins)] text-2xl lg:text-3xl font-bold text-[#0F172A]">
            {isTenant ? "Yêu cầu bảo trì của tôi" : "Yêu cầu bảo trì"}
          </h1>
          <p className="text-[#475569] mt-1">
            {totalCount} yêu cầu • {pendingCount} chờ xử lý
          </p>
        </div>
        {isTenant && (
          <Link
            href="/maintenance/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors min-h-[44px]"
          >
            <PlusOutlined className="w-4 h-4" />
            Tạo yêu cầu mới
          </Link>
        )}
      </motion.div>

      {/* Stats Cards */}
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <ClockCircleOutlined className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-400">{pendingCount}</p>
              <p className="text-xs text-[#475569]">Chờ xử lý</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          className="bg-white border border-[#E2E8F0] rounded-xl p-5"
          variants={itemVariants}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Play className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-400">{inProgressCount}</p>
              <p className="text-xs text-[#475569]">Đang xử lý</p>
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
              <p className="text-2xl font-bold text-green-400">{doneCount}</p>
              <p className="text-xs text-[#475569]">Hoàn thành</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          className="bg-white border border-[#E2E8F0] rounded-xl p-5"
          variants={itemVariants}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <ToolOutlined className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p >{requests.length}</p>
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
        <div className="flex-1 max-w-sm">
          <Input
            type="text"
            placeholder="Tìm theo tiêu đề, phòng, người yêu cầu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            prefix={<SearchOutlined className="w-5 h-5 text-[#64748B]" />}
          />
        </div>

        {!isTenant && (
          <Select
            value={filterProperty}
            onChange={(value) => {
              setFilterProperty(value);
              setPage(1);
            }}
            className="w-full sm:w-[180px]"
          >
            <Select.Option value="all">Tất cả tài sản</Select.Option>
            {properties.map((p) => (
              <Select.Option key={p.id} value={p.id}>
                {p.name}
              </Select.Option>
            ))}
          </Select>
        )}

        <Select
          value={filterStatus}
          onChange={(value) => {
            setFilterStatus(value);
            setPage(1);
          }}
        >
          
          
            <Select.Option value="all">Tất cả trạng thái</Select.Option>
            <Select.Option value="pending">Chờ xử lý</Select.Option>
            <Select.Option value="in_progress">Đang xử lý</Select.Option>
            <Select.Option value="done">Hoàn thành</Select.Option>
            <Select.Option value="rejected">Từ chối</Select.Option>
          
        </Select>

        <Select
          value={filterCategory}
          onChange={(value) => {
            setFilterCategory(value);
            setPage(1);
          }}
        >
          
          
            <Select.Option value="all">Tất cả loại</Select.Option>
            <Select.Option value="electricity">Điện</Select.Option>
            <Select.Option value="plumbing">Nước/Ống</Select.Option>
            <Select.Option value="appliance">Thiết bị</Select.Option>
            <Select.Option value="furniture">Nội thất</Select.Option>
            <Select.Option value="internet">Internet</Select.Option>
            <Select.Option value="other">Khác</Select.Option>
          
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

      {/* Maintenance Table */}
      <motion.div
        className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-[#475569] uppercase tracking-wider border-b border-[#E2E8F0]">
                <th className="px-5 py-4 font-medium min-w-[200px]">Yêu cầu</th>
                <th className="px-5 py-4 font-medium min-w-[120px]">Phòng</th>
                <th className="px-5 py-4 font-medium min-w-[80px]">Loại</th>
                <th className="px-5 py-4 font-medium min-w-[120px]">Người yêu cầu</th>
                <th className="px-5 py-4 font-medium min-w-[110px]">Ngày tạo</th>
                <th className="px-5 py-4 font-medium min-w-[100px]">Trạng thái</th>
                <th className="px-5 py-4 font-medium min-w-[140px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-5 py-4">
                      <div className="h-10 bg-border-dark rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <ToolOutlined className="w-12 h-12 mx-auto mb-3 text-[#64748B] opacity-50" />
                    <p className="text-[#475569]">
                      {searchQuery || filterStatus !== "all" || filterCategory !== "all" || filterProperty !== "all"
                        ? "Không tìm thấy yêu cầu nào"
                        : "Chưa có yêu cầu bảo trì nào"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => {
                  const category = categoryConfig[request.category] || categoryConfig.other;
                  const status = statusConfig[request.status] || statusConfig.pending;
                  const CategoryIcon = category.icon;

                  return (
                    <motion.tr
                      key={request.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      variants={itemVariants}
                      onClick={() => router.push(`/maintenance/${request.id}`)}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg ${category.bgColor} flex items-center justify-center`}>
                            <CategoryIcon className={`w-5 h-5 ${category.color}`} />
                          </div>
                          <div>
                            <div >{request.title}</div>
                            <div className="text-xs text-[#64748B] line-clamp-1 max-w-xs">
                              {request.description || "Không có mô tả"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <HomeOutlined className="w-4 h-4 text-primary" />
                          <div>
                            <div >Phòng {request.room?.room_number || "N/A"}</div>
                            <div className="text-xs text-[#475569]">{request.property?.name || ""}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-block px-2 py-1 rounded text-xs whitespace-nowrap ${category.color} bg-white/5`}>
                          {category.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[#475569]">
                        {request.requester?.full_name || "N/A"}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-[#475569]">
                          <CalendarOutlined className="w-4 h-4" />
                          <span>{new Date(request.created_at).toLocaleDateString("vi-VN")}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full border whitespace-nowrap ${status.bgColor} ${status.color} ${status.borderColor}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {!isTenant ? (
                          <div className="flex items-center gap-1.5 flex-nowrap">
                            {request.status === "pending" && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateStatus(request.id, "in_progress");
                                  }}
                                  className="px-2.5 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors whitespace-nowrap"
                                >
                                  Xử lý
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateStatus(request.id, "rejected");
                                  }}
                                  className="px-2.5 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors whitespace-nowrap"
                                >
                                  Từ chối
                                </button>
                              </>
                            )}
                            {request.status === "in_progress" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateStatus(request.id, "done");
                                }}
                                className="px-2.5 py-1 text-xs bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors whitespace-nowrap"
                              >
                                Hoàn thành
                              </button>
                            )}
                            {(request.status === "done" || request.status === "rejected") && (
                              <span className="text-[#64748B] text-xs">-</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#64748B] text-xs">-</span>
                        )}
                      </td>
                    </motion.tr>
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
            showTotal={(total, range) => `${range[0]}-${range[1]} của ${total} yêu cầu`}
            pageSizeOptions={['20', '50', '100']}
            responsive
          />
        </div>
      )}
    </div>
  );
}
