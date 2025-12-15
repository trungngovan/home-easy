import { useQuery } from '@tanstack/react-query';
import { apiFetch, endpoints, PaginatedResponse, buildPaginatedPath } from '@/lib/api';

export type Invoice = {
  id: string;
  tenancy: string;
  period: string;
  total_amount: number;
  amount_due: number;
  status: string;
  due_date?: string;
  issued_at?: string;
  paid_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

export type InvoiceFilters = {
  page?: number;
  pageSize?: number;
  status?: string;
  period?: string;
  search?: string;
};

function buildFilteredInvoicePath(filters?: InvoiceFilters): string {
  const params = new URLSearchParams();
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.pageSize) params.set('page_size', String(filters.pageSize));
  if (filters?.status) params.set('status', filters.status);
  if (filters?.period) params.set('period', filters.period);
  if (filters?.search) params.set('search', filters.search);

  const query = params.toString();
  return `${endpoints.invoices}${query ? `?${query}` : ''}`;
}

export function useInvoices(filters?: InvoiceFilters) {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: () => apiFetch<PaginatedResponse<Invoice>>(buildFilteredInvoicePath(filters)),
    staleTime: 2 * 60 * 1000, // 2 minutes for invoices
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ['invoices', id],
    queryFn: () => apiFetch<Invoice>(`${endpoints.invoices}${id}/`),
    enabled: !!id,
  });
}

