import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { toIsoDate, type DateRange } from '@/lib/date-range';
import type { CashflowProjection } from '@/lib/types';

export interface CashflowProjectionParams {
  range: DateRange;
  accountIds?: string[];
}

function toSearchParams({
  range,
  accountIds,
}: CashflowProjectionParams): Record<string, string | undefined> {
  return {
    from: toIsoDate(range.from),
    to: toIsoDate(range.to),
    accountIds: accountIds && accountIds.length > 0 ? accountIds.join(',') : undefined,
  };
}

export function useCashflowProjection(params: CashflowProjectionParams) {
  const search = toSearchParams(params);
  const query = new URLSearchParams(
    Object.entries(search).filter((entry): entry is [string, string] =>
      Boolean(entry[1]),
    ),
  ).toString();

  return useQuery({
    queryKey: queryKeys.cashflowProjection(search),
    queryFn: () => apiClient.get<CashflowProjection>(`/cashflow/projection?${query}`),
    // Evita parpadeo del saldo por día al mover el rango o el filtro de cuentas.
    placeholderData: keepPreviousData,
  });
}
