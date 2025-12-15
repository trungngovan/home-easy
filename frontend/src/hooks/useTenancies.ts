import { useQuery } from '@tanstack/react-query';
import { apiFetch, endpoints, PaginatedResponse, buildPaginatedPath } from '@/lib/api';

export type Tenancy = {
  id: string;
  room: string;
  tenant: string;
  start_date: string;
  end_date?: string;
  deposit: number;
  base_rent: number;
  status: string;
  contract_file?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

export type TenancyFilters = {
  page?: number;
  pageSize?: number;
  status?: string;
  room?: string;
  tenant?: string;
};

function buildFilteredTenancyPath(filters?: TenancyFilters): string {
  const params = new URLSearchParams();
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.pageSize) params.set('page_size', String(filters.pageSize));
  if (filters?.status) params.set('status', filters.status);
  if (filters?.room) params.set('room', filters.room);
  if (filters?.tenant) params.set('tenant', filters.tenant);

  const query = params.toString();
  return `${endpoints.tenancies}${query ? `?${query}` : ''}`;
}

export function useTenancies(filters?: TenancyFilters) {
  return useQuery({
    queryKey: ['tenancies', filters],
    queryFn: () => apiFetch<PaginatedResponse<Tenancy>>(buildFilteredTenancyPath(filters)),
    staleTime: 5 * 60 * 1000, // 5 minutes for tenancies
  });
}

export function useTenancy(id: string) {
  return useQuery({
    queryKey: ['tenancies', id],
    queryFn: () => apiFetch<Tenancy>(`${endpoints.tenancies}${id}/`),
    enabled: !!id,
  });
}

