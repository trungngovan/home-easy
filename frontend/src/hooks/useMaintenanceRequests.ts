import { useQuery } from '@tanstack/react-query';
import { apiFetch, endpoints, PaginatedResponse, buildPaginatedPath } from '@/lib/api';

export type MaintenanceRequest = {
  id: string;
  room: string;
  title: string;
  description?: string;
  status: string;
  category: string;
  requester?: string;
  assignee?: string;
  created_at: string;
  updated_at: string;
};

export type MaintenanceFilters = {
  page?: number;
  pageSize?: number;
  status?: string;
  category?: string;
  room?: string;
};

function buildFilteredMaintenancePath(filters?: MaintenanceFilters): string {
  const params = new URLSearchParams();
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.pageSize) params.set('page_size', String(filters.pageSize));
  if (filters?.status) params.set('status', filters.status);
  if (filters?.category) params.set('category', filters.category);
  if (filters?.room) params.set('room', filters.room);

  const query = params.toString();
  return `${endpoints.maintenanceRequests}${query ? `?${query}` : ''}`;
}

export function useMaintenanceRequests(filters?: MaintenanceFilters) {
  return useQuery({
    queryKey: ['maintenanceRequests', filters],
    queryFn: () => apiFetch<PaginatedResponse<MaintenanceRequest>>(buildFilteredMaintenancePath(filters)),
    staleTime: 2 * 60 * 1000, // 2 minutes for maintenance requests
  });
}

export function useMaintenanceRequest(id: string) {
  return useQuery({
    queryKey: ['maintenanceRequests', id],
    queryFn: () => apiFetch<MaintenanceRequest>(`${endpoints.maintenanceRequests}${id}/`),
    enabled: !!id,
  });
}

