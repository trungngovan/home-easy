"use client";

import { useEffect, useState } from "react";
import { apiFetch, endpoints, clearAuthToken, PaginatedResponse, buildPaginatedPath } from "@/lib/api";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BuildOutlined, ExclamationCircleOutlined, HomeOutlined, PlusOutlined, RightOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons'
import { TrendingUp,  } from 'lucide-react';
import Link from "next/link";
import { Input, Pagination } from "antd";

// Property type with annotated room stats from optimized API
type Property = {
  id: string;
  name: string;
  address: string;
  description: string;
  image: string | null;
  total_rooms: number;
  vacant_rooms: number;
  occupied_rooms: number;
  maintenance_rooms: number;
  occupancy_rate: number;
  owner_detail?: {
    id: string;
    full_name: string;
    email: string;
  };
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

// Build URL with search parameter for backend filtering
function buildSearchPath(basePath: string, { page, pageSize, search }: { page: number; pageSize: number; search?: string }) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("page_size", String(pageSize));
  if (search) {
    params.set("search", search);
  }
  return `${basePath}?${params.toString()}`;
}

export default function PropertiesPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
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

  // Single optimized API call - backend returns room stats directly
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const propsData = await apiFetch<PaginatedResponse<Property>>(
          buildSearchPath(endpoints.properties, { page, pageSize, search: debouncedSearch })
        );
        setProperties(propsData.results || []);
        setTotalCount(propsData.count || 0);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Không thể tải dữ liệu";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router, page, pageSize, debouncedSearch]);

  // Stats calculations
  const totalRooms = properties.reduce((sum, p) => sum + (p.total_rooms || 0), 0);
  const totalOccupied = properties.reduce((sum, p) => sum + (p.occupied_rooms || 0), 0);
  const totalVacant = properties.reduce((sum, p) => sum + (p.vacant_rooms || 0), 0);
  const totalMaintenance = properties.reduce((sum, p) => sum + (p.maintenance_rooms || 0), 0);
  const avgOccupancy = properties.length > 0 
    ? Math.round(properties.reduce((sum, p) => sum + (p.occupancy_rate || 0), 0) / properties.length)
    : 0;

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
            Quản lý tài sản
          </h1>
          <p className="text-[#475569] mt-1">
            {properties.length} tài sản • {totalRooms} phòng
          </p>
        </div>

        <Link
          href="/properties/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-bg-dark font-semibold rounded-lg hover:bg-primary/90 transition-colors w-fit"
        >
          <PlusOutlined className="w-4 h-4" />
          Thêm tài sản
        </Link>
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
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <HomeOutlined className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p >{totalRooms}</p>
              <p className="text-xs text-[#475569]">Tổng số phòng</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          className="bg-white border border-[#E2E8F0] rounded-xl p-5"
          variants={itemVariants}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <UserOutlined className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">{totalOccupied}</p>
              <p className="text-xs text-[#475569]">Đang cho thuê</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          className="bg-white border border-[#E2E8F0] rounded-xl p-5"
          variants={itemVariants}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <BuildOutlined className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-400">{totalVacant}</p>
              <p className="text-xs text-[#475569]">Phòng trống</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          className="bg-white border border-[#E2E8F0] rounded-xl p-5"
          variants={itemVariants}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-400">{avgOccupancy}%</p>
              <p className="text-xs text-[#475569]">Tỷ lệ lấp đầy</p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Search Filter */}
      <motion.div
        className="flex flex-col sm:flex-row gap-4 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex-1 max-w-sm">
          <Input
            type="text"
            placeholder="Tìm kiếm tài sản..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            prefix={<SearchOutlined className="w-5 h-5 text-[#64748B]" />}
          />
        </div>
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

      {/* Properties - Desktop Table */}
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
                <th className="px-5 py-4 font-medium min-w-[140px]">Tài sản</th>
                <th className="px-5 py-4 font-medium min-w-[180px]">Địa chỉ</th>
                <th className="px-5 py-4 font-medium min-w-[90px]">Tổng phòng</th>
                <th className="px-5 py-4 font-medium min-w-[90px]">Đang thuê</th>
                <th className="px-5 py-4 font-medium min-w-[70px]">Trống</th>
                <th className="px-5 py-4 font-medium min-w-[70px]">Bảo trì</th>
                <th className="px-5 py-4 font-medium min-w-[100px]">Tỷ lệ</th>
                <th className="px-5 py-4 font-medium min-w-[70px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-5 py-4">
                      <div className="h-10 bg-border-dark rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : properties.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <BuildOutlined className="w-12 h-12 mx-auto mb-3 text-[#64748B] opacity-50" />
                    <p className="text-[#475569]">
                      {searchQuery ? "Không tìm thấy tài sản nào" : "Chưa có tài sản nào"}
                    </p>
                    {!searchQuery && (
                      <Link
                        href="/properties/new"
                        className="text-primary hover:underline mt-2 inline-block"
                      >
                        Thêm tài sản đầu tiên
                      </Link>
                    )}
                  </td>
                </tr>
              ) : (
                properties.map((property) => {
                  const totalRooms = property.total_rooms || 0;
                  const occupiedCount = property.occupied_rooms || 0;
                  const vacantCount = property.vacant_rooms || 0;
                  const maintenanceCount = property.maintenance_rooms || 0;
                  const occupancyRate = property.occupancy_rate || 0;

                  return (
                    <motion.tr
                      key={property.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      variants={itemVariants}
                      onClick={() => router.push(`/properties/${property.id}`)}
                      role="button"
                      tabIndex={0}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <BuildOutlined className="w-5 h-5 text-primary" />
                          </div>
                          <span className="text-sm font-medium text-[#0F172A]">
                            {property.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-[#475569] max-w-xs truncate">
                          {property.address || "Chưa có địa chỉ"}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-[#475569]">
                        <span>{totalRooms}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                          {occupiedCount}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                          {vacantCount}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {maintenanceCount > 0 ? (
                          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                            {maintenanceCount}
                          </span>
                        ) : (
                          <span className="text-sm text-[#64748B]">-</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-border-dark rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${occupancyRate}%` }}
                            />
                          </div>
                          <span className="text-sm text-[#475569]">{occupancyRate}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/properties/${property.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors inline-flex min-h-[44px] min-w-[44px] items-center justify-center"
                        >
                          <RightOutlined className="w-4 h-4 text-[#475569]" />
                        </Link>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Properties - Mobile Cards */}
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
        ) : properties.length === 0 ? (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-12 text-center">
            <BuildOutlined className="w-12 h-12 mx-auto mb-3 text-[#64748B] opacity-50" />
            <p className="text-[#475569]">
              {searchQuery ? "Không tìm thấy tài sản nào" : "Chưa có tài sản nào"}
            </p>
            {!searchQuery && (
              <Link
                href="/properties/new"
                className="text-primary hover:underline mt-2 inline-block"
              >
                Thêm tài sản đầu tiên
              </Link>
            )}
          </div>
        ) : (
          properties.map((property) => {
            const totalRooms = property.total_rooms || 0;
            const occupiedCount = property.occupied_rooms || 0;
            const vacantCount = property.vacant_rooms || 0;
            const maintenanceCount = property.maintenance_rooms || 0;
            const occupancyRate = property.occupancy_rate || 0;

            return (
              <motion.div
                key={property.id}
                variants={itemVariants}
                onClick={() => router.push(`/properties/${property.id}`)}
                className="bg-white border border-[#E2E8F0] rounded-xl p-4 space-y-3 cursor-pointer hover:border-primary/30 transition-colors"
              >
                {/* Header: Name & Action */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BuildOutlined className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-base font-semibold text-[#0F172A]">
                      {property.name}
                    </span>
                  </div>
                  <Link
                    href={`/properties/${property.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <RightOutlined className="w-4 h-4 text-[#475569]" />
                  </Link>
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-[#64748B] uppercase tracking-wider">Địa chỉ</div>
                  <div className="text-sm text-[#475569]">
                    {property.address || "Chưa có địa chỉ"}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E2E8F0]">
                  <div>
                    <div className="text-xs font-medium text-[#64748B] mb-1">Tổng phòng</div>
                    <div className="text-base font-semibold text-[#0F172A]">{totalRooms}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-[#64748B] mb-1">Tỷ lệ thuê</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-border-dark rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${occupancyRate}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-[#475569]">{occupancyRate}%</span>
                    </div>
                  </div>
                </div>

                {/* Room Status */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-[#E2E8F0]">
                  <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                    Đang thuê: {occupiedCount}
                  </span>
                  <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    Trống: {vacantCount}
                  </span>
                  {maintenanceCount > 0 && (
                    <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                      Bảo trì: {maintenanceCount}
                    </span>
                  )}
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
            showTotal={(total, range) => `${range[0]}-${range[1]} của ${total} tài sản`}
            pageSizeOptions={['20', '50', '100']}
            responsive
          />
        </div>
      )}
    </div>
  );
}
