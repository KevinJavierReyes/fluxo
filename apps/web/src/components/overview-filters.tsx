'use client';

import { useState } from 'react';
import { ChevronDownIcon, XIcon } from 'lucide-react';
import { useAccounts } from '@/hooks/use-accounts';
import { useCategoryGroups } from '@/hooks/use-categories';
import { GroupChip } from '@/components/group-chip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RangeSlider } from '@/components/ui/slider';
import { ACCOUNT_TYPE_LABELS } from '@/lib/account-type';
import { formatCurrency } from '@/lib/format';

export interface OverviewFilterState {
  accountId?: string;
  categoryGroupIds: string[];
  minAmount?: number;
  maxAmount?: number;
}

export const EMPTY_FILTERS: OverviewFilterState = {
  accountId: undefined,
  categoryGroupIds: [],
  minAmount: undefined,
  maxAmount: undefined,
};

const ALL_ACCOUNTS = '__all__';

export function OverviewFilters({
  value,
  onValueChange,
  amountRange,
}: {
  value: OverviewFilterState;
  onValueChange: (filters: OverviewFilterState) => void;
  amountRange: { min: number; max: number } | undefined;
}) {
  const { data: accounts } = useAccounts();
  const { data: groups } = useCategoryGroups();

  const bounds = {
    min: amountRange?.min ?? 0,
    max: Math.max(amountRange?.max ?? 100, (amountRange?.min ?? 0) + 1),
  };

  // Mientras se arrastra el slider mandan los valores locales; al soltar se
  // devuelve el control al filtro, para no disparar una query por cada pixel.
  const [draggingValue, setDraggingValue] = useState<[number, number] | null>(null);
  const sliderValue: [number, number] = draggingValue ?? [
    value.minAmount ?? bounds.min,
    value.maxAmount ?? bounds.max,
  ];

  const selectedGroups =
    groups?.filter((group) => value.categoryGroupIds.includes(group.id)) ?? [];
  const hasFilters =
    Boolean(value.accountId) ||
    value.categoryGroupIds.length > 0 ||
    value.minAmount !== undefined ||
    value.maxAmount !== undefined;

  const toggleGroup = (groupId: string) => {
    const next = value.categoryGroupIds.includes(groupId)
      ? value.categoryGroupIds.filter((id) => id !== groupId)
      : [...value.categoryGroupIds, groupId];
    onValueChange({ ...value, categoryGroupIds: next });
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Filtros</p>
          {hasFilters && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => onValueChange(EMPTY_FILTERS)}
            >
              <XIcon />
              Restablecer filtros
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Por cuenta</Label>
            <Select
              value={value.accountId ?? ALL_ACCOUNTS}
              onValueChange={(next) =>
                onValueChange({
                  ...value,
                  accountId: !next || next === ALL_ACCOUNTS ? undefined : next,
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(v: string) =>
                    v === ALL_ACCOUNTS
                      ? 'Todas las cuentas'
                      : (accounts?.find((a) => a.id === v)?.name ?? 'Cuenta')
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_ACCOUNTS}>Todas las cuentas</SelectItem>
                {accounts?.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                    <span className="text-muted-foreground">
                      {' '}
                      · {ACCOUNT_TYPE_LABELS[account.type]}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Por categoría</Label>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between font-normal"
                  />
                }
              >
                <span className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {selectedGroups.length > 0
                      ? selectedGroups.length
                      : (groups?.length ?? 0)}
                  </Badge>
                  {selectedGroups.length === 0
                    ? 'Todas las categorías'
                    : selectedGroups.map((g) => g.name).join(', ')}
                </span>
                <ChevronDownIcon className="text-muted-foreground" />
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64">
                <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
                  {groups?.map((group) => (
                    <label
                      key={group.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-sm hover:bg-muted"
                    >
                      <Checkbox
                        checked={value.categoryGroupIds.includes(group.id)}
                        onCheckedChange={() => toggleGroup(group.id)}
                      />
                      <GroupChip color={group.color} icon={group.icon} size="sm" />
                      <span className="truncate">{group.name}</span>
                    </label>
                  ))}
                </div>
                {value.categoryGroupIds.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="mt-2 w-full"
                    onClick={() =>
                      onValueChange({ ...value, categoryGroupIds: [] })
                    }
                  >
                    Limpiar selección
                  </Button>
                )}
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Por monto</Label>
            <div className="pt-1.5">
              <RangeSlider
                aria-label="Monto"
                min={bounds.min}
                max={bounds.max}
                value={sliderValue}
                onValueChange={setDraggingValue}
                onValueCommitted={([min, max]) => {
                  setDraggingValue(null);
                  onValueChange({
                    ...value,
                    minAmount: min === bounds.min ? undefined : min,
                    maxAmount: max === bounds.max ? undefined : max,
                  });
                }}
              />
              <div className="mt-1 flex justify-between text-xs text-muted-foreground tabular-nums">
                <span>{formatCurrency(sliderValue[0])}</span>
                <span>{formatCurrency(sliderValue[1])}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
