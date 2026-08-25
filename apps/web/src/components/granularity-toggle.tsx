'use client';

import type { OverviewGranularity } from '@fluxo/shared';
import { Button } from '@/components/ui/button';

const OPTIONS: { id: OverviewGranularity; label: string }[] = [
  { id: 'day', label: 'Días' },
  { id: 'week', label: 'Semanas' },
  { id: 'month', label: 'Meses' },
];

export function GranularityToggle({
  value,
  onValueChange,
  available,
}: {
  value: OverviewGranularity;
  onValueChange: (value: OverviewGranularity) => void;
  available: Record<OverviewGranularity, boolean>;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg bg-muted/60 p-0.5">
      {OPTIONS.map((option) => (
        <Button
          key={option.id}
          type="button"
          size="xs"
          variant={value === option.id ? 'default' : 'ghost'}
          disabled={!available[option.id]}
          onClick={() => onValueChange(option.id)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
