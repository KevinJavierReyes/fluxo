import type { OverviewGranularity } from '@fluxo/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { toIsoDate, type DateRange } from '@/lib/date-range';
import type { Overview } from '@/lib/types';

export interface OverviewParams {
  range: DateRange;
  granularity: OverviewGranularity;
  accountId?: string;
  categoryGroupIds?: string[];
  minAmount?: number;
  maxAmount?: number;
}

function toSearchParams({
  range,
  granularity,
  accountId,
  categoryGroupIds,
  minAmount,
  maxAmount,
}: OverviewParams): Record<string, string | undefined> {
  return {
    from: toIsoDate(range.from),
    to: toIsoDate(range.to),
    granularity,
    accountId: accountId || undefined,
    categoryGroupIds:
      categoryGroupIds && categoryGroupIds.length > 0
        ? categoryGroupIds.join(',')
        : undefined,
    minAmount: minAmount !== undefined ? String(minAmount) : undefined,
    maxAmount: maxAmount !== undefined ? String(maxAmount) : undefined,
  };
}

export function useOverview(params: OverviewParams) {
  const search = toSearchParams(params);
  const query = new URLSearchParams(
    Object.entries(search).filter((entry): entry is [string, string] =>
      Boolean(entry[1]),
    ),
  ).toString();

  return useQuery({
    queryKey: queryKeys.overview(search),
    queryFn: () => apiClient.get<Overview>(`/dashboard/overview?${query}`),
    // Sin esto los gráficos parpadean cada vez que se mueve el rango o un filtro.
    placeholderData: keepPreviousData,
  });
}
