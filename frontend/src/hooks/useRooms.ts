import { useQuery } from '@tanstack/react-query';
import { apiFetch, endpoints, PaginatedResponse, buildPaginatedPath } from '@/lib/api';

export type Room = {
  id: string;
  building: string;
  room_number: string;
  floor: number;
  area?: number;
  base_rent: number;
  status: string;
  description?: string;
  image?: string;
  created_at: string;
  updated_at: string;
};

export type RoomFilters = {
  page?: number;
  pageSize?: number;
  building?: string;
  status?: string;
  search?: string;
};

function buildFilteredRoomPath(filters?: RoomFilters): string {
  const params = new URLSearchParams();
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.pageSize) params.set('page_size', String(filters.pageSize));
  if (filters?.building) params.set('building', filters.building);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.search) params.set('search', filters.search);

  const query = params.toString();
  return `${endpoints.rooms}${query ? `?${query}` : ''}`;
}

export function useRooms(filters?: RoomFilters) {
  return useQuery({
    queryKey: ['rooms', filters],
    queryFn: () => apiFetch<PaginatedResponse<Room>>(buildFilteredRoomPath(filters)),
    staleTime: 5 * 60 * 1000, // 5 minutes for rooms
  });
}

export function useRoom(id: string) {
  return useQuery({
    queryKey: ['rooms', id],
    queryFn: () => apiFetch<Room>(`${endpoints.rooms}${id}/`),
    enabled: !!id,
  });
}

