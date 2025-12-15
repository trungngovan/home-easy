"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  apiFetch,
  endpoints,
  clearAuthToken,
  PaginatedResponse,
  buildPaginatedPath,
} from "@/lib/api";
import { motion } from "framer-motion";
import { ArrowLeftOutlined, BuildOutlined, HomeOutlined, LoadingOutlined, MoreOutlined, SearchOutlined } from '@ant-design/icons'
import { MapPin,  } from 'lucide-react';
import { Input, Select, Pagination } from "antd";

type Property = {
  id: string;
  name: string;
  address: string;
  description: string;
};

type Room = {
  id: string;
  building: string;
  room_number: string;
  status: string;
  floor: number;
  area: number | null;
  base_rent: number;
};

type Tenancy = {
  id: string;
  room: string;
  tenant: string;
  status: string;
};

const statusLabels: Record<string, string> = {
  vacant: "Trống",
  occupied: "Đang thuê",
  maintenance: "Bảo trì",
};

const statusColors = {
  vacant: "bg-green-500/20 text-green-400 border-green-500/30",
  occupied: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  maintenance: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  // Safely extract id from params - handle Next.js 16 params serialization
  // Extract immediately to avoid serialization issues
  const propertyId = (() => {
    try {
      if (params && typeof params === 'object' && 'id' in params) {
        return String(params.id);
      }
      return undefined;
    } catch {
      return undefined;
    }
  })();

  const [property, setProperty] = useState<Property | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!propertyId) return;
    async function loadData() {
      try {
        setLoading(true);
        // Build rooms API path with building filter and pagination
        const basePath = buildPaginatedPath(endpoints.rooms, { page, pageSize });
        // basePath already has ?page=1&page_size=20, so we need to append building filter
        const separator = basePath.includes("?") ? "&" : "?";
        let roomsApiPath = `${basePath}${separator}building=${propertyId}`;
        if (filterStatus !== "all") {
          roomsApiPath += `&status=${filterStatus}`;
        }

        const [propData, roomsData, tenanciesData] = await Promise.all([
          apiFetch<Property>(`${endpoints.properties}${propertyId}/`),
          apiFetch<PaginatedResponse<Room>>(roomsApiPath),
          apiFetch<PaginatedResponse<Tenancy>>(buildPaginatedPath(endpoints.tenancies, { pageSize: 200 })),
        ]);
        setProperty(propData);
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
  }, [propertyId, router, page, pageSize, filterStatus]);

  // Filter rooms by search query (client-side)
  const filteredRooms = rooms.filter((room) => {
    const matchesSearch = room.room_number.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center gap-3 text-[#475569]">
        <LoadingOutlined className="w-5 h-5 animate-spin" />
        Đang tải...
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-4">
          <button
            onClick={() => router.back()} >
            <ArrowLeftOutlined className="w-4 h-4" /> Quay lại
          </button>
        </div>
        <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
          {error || "Không tìm thấy tài sản"}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <BuildOutlined className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-[family-name:var(--font-poppins)] text-2xl lg:text-3xl font-bold text-[#0F172A]">
              {property.name}
            </h1>
            <p className="text-[#475569] flex items-center gap-2 mt-1">
              <MapPin className="w-4 h-4" /> {property.address || "Chưa có địa chỉ"}
            </p>
          </div>
        </div>
        <button
          onClick={() => router.back()} >
          <ArrowLeftOutlined className="w-4 h-4" /> Quay lại
        </button>
      </div>

      {property.description && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 text-[#475569]">
          {property.description}
        </div>
      )}

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
            placeholder="Tìm theo số phòng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            prefix={<SearchOutlined className="w-5 h-5 text-[#64748B]" />}
          />
        </div>

        <Select
          value={filterStatus}
          onChange={(value) => {
            setFilterStatus(value);
            setPage(1);
          }}
        >
          
          
            <Select.Option value="all">Tất cả trạng thái</Select.Option>
            <Select.Option value="vacant">Trống</Select.Option>
            <Select.Option value="occupied">Đang thuê</Select.Option>
            <Select.Option value="maintenance">Bảo trì</Select.Option>
          
        </Select>
      </motion.div>

      {/* Rooms Table */}
      <motion.div
        className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0]">
          <div >
            <HomeOutlined className="w-5 h-5" /> Phòng trong tài sản
          </div>
          <Link
            href="/rooms/new"
            className="px-3 py-2 rounded-lg bg-primary text-bg-dark font-medium hover:bg-primary/90 transition-colors"
          >
            Thêm phòng
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-[#475569] uppercase tracking-wider border-b border-[#E2E8F0]">
                <th className="px-5 py-4 font-medium min-w-[120px]">Phòng</th>
                <th className="px-5 py-4 font-medium min-w-[70px]">Tầng</th>
                <th className="px-5 py-4 font-medium min-w-[90px]">Diện tích</th>
                <th className="px-5 py-4 font-medium min-w-[110px]">Giá thuê</th>
                <th className="px-5 py-4 font-medium min-w-[100px]">Trạng thái</th>
                <th className="px-5 py-4 font-medium min-w-[120px]">Khách thuê</th>
                <th className="px-5 py-4 font-medium min-w-[50px]"></th>
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
              ) : filteredRooms.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <HomeOutlined className="w-12 h-12 mx-auto mb-3 text-[#64748B] opacity-50" />
                    <p className="text-[#475569]">
                      {searchQuery || filterStatus !== "all"
                        ? "Không tìm thấy phòng nào"
                        : "Chưa có phòng nào"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRooms.map((room) => {
                  const tenancy = tenancies.find(
                    (t) => t.room === room.id && t.status === "active"
                  );

                  return (
                    <motion.tr
                      key={room.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => router.push(`/rooms/${room.id}`)}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <HomeOutlined className="w-5 h-5 text-primary" />
                          </div>
                          <span >
                            Phòng {room.room_number}
                          </span>
                        </div>
                      </td>
                      <td >Tầng {room.floor}</td>
                      <td className="px-5 py-4 text-[#475569]">
                        {room.area ? `${room.area} m²` : "-"}
                      </td>
                      <td >
                        {Number(room.base_rent).toLocaleString("vi-VN")}đ
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full border whitespace-nowrap ${
                            statusColors[room.status as keyof typeof statusColors] ||
                            statusColors.vacant
                          }`}
                        >
                          {statusLabels[room.status] || room.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[#475569] text-sm">
                        {tenancy ? "Đang có khách" : "-"}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Open menu
                          }}
                        >
                          <MoreOutlined className="w-4 h-4 text-[#475569]" />
                        </button>
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
            showTotal={(total, range) => `${range[0]}-${range[1]} của ${total} phòng`}
            pageSizeOptions={['20', '50', '100']}
            responsive
          />
        </div>
      )}
    </div>
  );
}
