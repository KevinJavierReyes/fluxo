'use client';

import { useState } from 'react';
import { es } from 'react-day-picker/locale';
import type { DateRange as DayPickerRange } from 'react-day-picker';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  RANGE_PRESETS,
  dateToUtcMidnight,
  formatRangeLabel,
  matchPreset,
  shiftRange,
  utcMidnightToLocalDate,
  type DateRange,
} from '@/lib/date-range';
import { cn } from '@/lib/utils';

/**
 * `‹ [ 01 mar 2026 – 31 mar 2026 ] ›` con presets y calendario de rango.
 * Las flechas no tienen tope hacia adelante: navegar a meses proyectados es
 * parte de lo que queremos permitir.
 */
export function DateRangePicker({
  value,
  onValueChange,
}: {
  value: DateRange;
  onValueChange: (range: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const activePreset = matchPreset(value);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Periodo anterior"
        onClick={() => onValueChange(shiftRange(value, -1))}
      >
        <ChevronLeftIcon />
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className="min-w-[260px] justify-between font-normal"
            />
          }
        >
          <span>{formatRangeLabel(value)}</span>
          <CalendarIcon className="text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
              {RANGE_PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  type="button"
                  size="xs"
                  variant={activePreset === preset.id ? 'default' : 'outline'}
                  onClick={() => {
                    onValueChange(preset.build());
                    setOpen(false);
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <Calendar
              mode="range"
              locale={es}
              numberOfMonths={2}
              defaultMonth={utcMidnightToLocalDate(value.from)}
              selected={{
                from: utcMidnightToLocalDate(value.from),
                to: utcMidnightToLocalDate(value.to),
              }}
              onSelect={(range: DayPickerRange | undefined) => {
                if (!range?.from) return;
                onValueChange({
                  from: dateToUtcMidnight(range.from),
                  to: dateToUtcMidnight(range.to ?? range.from),
                });
                if (range.to) setOpen(false);
              }}
              className={cn('rdp-range')}
            />
          </div>
        </PopoverContent>
      </Popover>

      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Periodo siguiente"
        onClick={() => onValueChange(shiftRange(value, 1))}
      >
        <ChevronRightIcon />
      </Button>
    </div>
  );
}
