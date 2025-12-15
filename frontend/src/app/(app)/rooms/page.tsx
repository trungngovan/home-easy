"use client";

import { useEffect, useState } from "react";
import { apiFetch, endpoints, clearAuthToken, PaginatedResponse, buildPaginatedPath } from "@/lib/api";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BuildOutlined, HomeOutlined, PlusOutlined, SearchOutlined, UserOutlined, WalletOutlined } from '@ant-design/icons'
import { Filter,  } from 'lucide-react';
import Link from "next/link";
import { Input, Select, Pagination } from "antd";

type Property = {
  id: string;
  name: string;
};

type Room = {
  id: string;
  building: string;
  room_number: string;
  floor: number;
  area: number | null;
  base_rent: number;
  status: string;
};

type Tenancy = {
  id: string;
  room: string;
  tenant: string;
  status: string;
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
    transition: { type: "spring", stiffness: 100, damping: 15 },
  },
};

export default function RoomsPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterProperty, setFilterProperty] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [propsData, roomsData, tenanciesData] = await Promise.all([
          apiFetch<PaginatedResponse<Property>>(buildPaginatedPath(endpoints.properties, { pageSize: 200 })),
          apiFetch<PaginatedResponse<Room>>(buildPaginatedPath(endpoints.rooms, { page, pageSize })),
          apiFetch<PaginatedResponse<Tenancy>>(buildPaginatedPath(endpoints.tenancies, { pageSize: 200 })),
        ]);
        setProperties(propsData.results || []);
        setRooms(roomsData.results || []);
        setTotalCount(roomsData.count || 0);
        setTenancies(tenanciesData.results || []);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Không thể tải dữ liệu";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router, page, pageSize]);

  // Filter rooms
  const filteredRooms = rooms.filter((room) => {
    const matchesSearch = room.room_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || room.status === filterStatus;
    const matchesProperty = filterProperty === "all" || room.building === filterProperty;
    return matchesSearch && matchesStatus && matchesProperty;
  });

  // Stats
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((r) => r.status === "occupied").length;
  const vacantRooms = rooms.filter((r) => r.status === "vacant").length;

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
            Quản lý phòng
          </h1>
          <p className="text-[#475569] mt-1">
            {totalRooms} phòng • {occupiedRooms} đang thuê • {vacantRooms} trống
          </p>
        </div>

        <Link
          href="/rooms/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-bg-dark font-semibold rounded-lg hover:bg-primary/90 transition-colors w-fit"
        >
          <PlusOutlined className="w-4 h-4" />
          Thêm phòng
        </Link>
      </motion.div>

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
            placeholder="Tìm theo số phòng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            prefix={<SearchOutlined className="w-5 h-5 text-[#64748B]" />}
          />
        </div>

        {/* Property Filter */}
        <Select
          className="w-full sm:w-[180px]"
          value={filterProperty}
          onChange={(value) => setFilterProperty(value)}
          placeholder="Tất cả tài sản"
        >
          <Select.Option value="all">Tất cả tài sản</Select.Option>
          {properties.map((p) => (
            <Select.Option key={p.id} value={p.id}>
              {p.name}
            </Select.Option>
          ))}
        </Select>

        {/* Status Filter */}
        <Select
          className="w-full sm:w-[180px]"
          value={filterStatus}
          onChange={(value) => setFilterStatus(value)}
          placeholder="Tất cả trạng thái"
        >
          <Select.Option value="all">Tất cả trạng thái</Select.Option>
          <Select.Option value="vacant">Trống</Select.Option>
          <Select.Option value="occupied">Đang thuê</Select.Option>
          <Select.Option value="maintenance">Bảo trì</Select.Option>
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

      {/* Rooms - Desktop Table */}
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
                <th className="px-5 py-4 font-medium min-w-[120px]">Phòng</th>
                <th className="px-5 py-4 font-medium min-w-[120px]">Tài sản</th>
                <th className="px-5 py-4 font-medium min-w-[70px]">Tầng</th>
                <th className="px-5 py-4 font-medium min-w-[90px]">Diện tích</th>
                <th className="px-5 py-4 font-medium min-w-[110px]">Giá thuê</th>
                <th className="px-5 py-4 font-medium min-w-[100px]">Trạng thái</th>
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
              ) : filteredRooms.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <HomeOutlined className="w-12 h-12 mx-auto mb-3 text-[#64748B] opacity-50" />
                    <p className="text-[#475569]">
                      {searchQuery || filterStatus !== "all" || filterProperty !== "all"
                        ? "Không tìm thấy phòng nào"
                        : "Chưa có phòng nào"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRooms.map((room) => {
                  const property = properties.find((p) => p.id === room.building);
                  const tenancy = tenancies.find(
                    (t) => t.room === room.id && t.status === "active"
                  );

                  return (
                    <motion.tr
                      key={room.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      variants={itemVariants}
                      onClick={() => router.push(`/rooms/${room.id}`)}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <HomeOutlined className="w-5 h-5 text-primary" />
                          </div>
                          <span className="text-sm font-medium text-[#0F172A]">
                            Phòng {room.room_number}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-[#475569]">
                          <BuildOutlined className="w-4 h-4" />
                          <span className="text-sm">{property?.name || "N/A"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-[#475569]">Tầng {room.floor}</td>
                      <td className="px-5 py-4 text-sm text-[#475569]">
                        {room.area ? `${room.area} m²` : "-"}
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-[#0F172A]">
                        {Number(room.base_rent).toLocaleString("vi-VN")}đ
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full border whitespace-nowrap ${
                            statusColors[room.status as keyof typeof statusColors] ||
                            statusColors.vacant
                          }`}
                        >
                          {statusLabels[room.status as keyof typeof statusLabels] || room.status}
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

      {/* Rooms - Mobile Cards */}
      <motion.div
        className="md:hidden space-y-4"
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
        ) : filteredRooms.length === 0 ? (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-12 text-center">
            <HomeOutlined className="w-12 h-12 mx-auto mb-3 text-[#64748B] opacity-50" />
            <p className="text-[#475569]">
              {searchQuery || filterStatus !== "all" || filterProperty !== "all"
                ? "Không tìm thấy phòng nào"
                : "Chưa có phòng nào"}
            </p>
          </div>
        ) : (
          filteredRooms.map((room) => {
            const property = properties.find((p) => p.id === room.building);
            return (
              <motion.div
                key={room.id}
                variants={itemVariants}
                onClick={() => router.push(`/rooms/${room.id}`)}
                className="bg-white border border-[#E2E8F0] rounded-xl p-4 space-y-3 cursor-pointer hover:border-primary/30 transition-colors"
              >
                {/* Header: Room Number & Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <HomeOutlined className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-base font-semibold text-[#0F172A]">
                      Phòng {room.room_number}
                    </span>
                  </div>
                  <span
                    className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full border ${
                      statusColors[room.status as keyof typeof statusColors] ||
                      statusColors.vacant
                    }`}
                  >
                    {statusLabels[room.status as keyof typeof statusLabels] || room.status}
                  </span>
                </div>

                {/* Property */}
                <div className="flex items-center gap-2 text-sm text-[#475569]">
                  <BuildOutlined className="w-4 h-4 shrink-0" />
                  <span>{property?.name || "N/A"}</span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[#E2E8F0]">
                  <div>
                    <div className="text-xs font-medium text-[#64748B] mb-1">Tầng</div>
                    <div className="text-sm text-[#475569]">{room.floor}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-[#64748B] mb-1">Diện tích</div>
                    <div className="text-sm text-[#475569]">
                      {room.area ? `${room.area} m²` : "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-[#64748B] mb-1">Giá thuê</div>
                    <div className="text-sm font-medium text-[#0F172A]">
                      {Number(room.base_rent).toLocaleString("vi-VN")}đ
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
            showTotal={(total, range) => `${range[0]}-${range[1]} của ${total} phòng`}
            pageSizeOptions={['20', '50', '100']}
            responsive
          />
        </div>
      )}
    </div>
  );
}
