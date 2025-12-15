import { useQuery } from '@tanstack/react-query';
import { apiFetch, endpoints, PaginatedResponse } from '@/lib/api';

export type MeterReading = {
  id: string;
  room: string;
  period: string;
  electricity_old?: number;
  electricity_new?: number;
  water_old?: number;
  water_new?: number;
  source: string;
  created_at: string;
};

export type MeterReadingFilters = {
  page?: number;
  pageSize?: number;
  room?: string;
  period?: string;
};

function buildFilteredMeterReadingPath(filters?: MeterReadingFilters): string {
  const params = new URLSearchParams();
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.pageSize) params.set('page_size', String(filters.pageSize));
  if (filters?.room) params.set('room', filters.room);
  if (filters?.period) params.set('period', filters.period);

  const query = params.toString();
  return `${endpoints.meterReadings}${query ? `?${query}` : ''}`;
}

export function useMeterReadings(filters?: MeterReadingFilters) {
  return useQuery({
    queryKey: ['meterReadings', filters],
    queryFn: () => apiFetch<PaginatedResponse<MeterReading>>(buildFilteredMeterReadingPath(filters)),
    staleTime: 5 * 60 * 1000, // 5 minutes for meter readings
  });
}

