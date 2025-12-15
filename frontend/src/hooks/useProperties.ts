import { useQuery } from '@tanstack/react-query';
import { apiFetch, endpoints, PaginatedResponse, buildPaginatedPath } from '@/lib/api';

export type Property = {
  id: string;
  name: string;
  address: string;
  description?: string;
  image?: string;
  created_at: string;
  updated_at: string;
};

export type PropertyFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export function useProperties(filters?: PropertyFilters) {
  return useQuery({
    queryKey: ['properties', filters],
    queryFn: () => apiFetch<PaginatedResponse<Property>>(
      buildPaginatedPath(endpoints.properties, {
        page: filters?.page,
        pageSize: filters?.pageSize || 20,
      })
    ),
    staleTime: 5 * 60 * 1000, // 5 minutes for properties
  });
}

export function useProperty(id: string) {
  return useQuery({
    queryKey: ['properties', id],
    queryFn: () => apiFetch<Property>(`${endpoints.properties}${id}/`),
    enabled: !!id,
  });
}

