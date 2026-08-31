'use client';

import { useEffect, useState } from 'react';
import { es } from 'react-day-picker/locale';
import type { DateRange as DayPickerRange } from 'react-day-picker';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  RANGE_PRESETS,
  dateToUtcMidnight,
  formatInputDate,
  formatRangeLabel,
  matchPreset,
  parseInputDate,
  shiftRange,
  utcMidnightToLocalDate,
  type DateRange,
} from '@/lib/date-range';
import { cn } from '@/lib/utils';

/**
 * `‹ [ 01 mar 2026 – 31 mar 2026 ] ›` con presets, calendario de rango y
 * entrada manual. Los presets aplican al instante (son una elección de un
 * solo clic); el calendario y el tipeo manual quedan como borrador hasta
 * apretar "Confirmar", para no disparar una búsqueda por cada clic/tecla.
 *
 * `draftTo` se mantiene `undefined` mientras el rango está a medio elegir:
 * react-day-picker usa eso (junto con `resetOnSelect`) para decidir si un
 * clic nuevo completa el rango o empieza uno — si lo forzáramos a un valor
 * siempre "completo", cada clic quedaría reescribiendo solo el "hasta".
 *
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
  // A 2 meses el calendario desborda el popover en pantallas angostas (<640px);
  // se reduce a 1 mes ahí y se apoya en los inputs "Desde/Hasta" para el resto del rango.
  const [calendarMonths, setCalendarMonths] = useState(2);
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 640px)');
    const update = () => setCalendarMonths(mql.matches ? 2 : 1);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);
  const [draftFrom, setDraftFrom] = useState<Date>(value.from);
  const [draftTo, setDraftTo] = useState<Date | undefined>(value.to);
  const [fromText, setFromText] = useState(() => formatInputDate(value.from));
  const [toText, setToText] = useState(() => formatInputDate(value.to));
  const [fromError, setFromError] = useState<string>();
  const [toError, setToError] = useState<string>();
  const activePreset = matchPreset(value);

  const resetDraft = (range: DateRange) => {
    setDraftFrom(range.from);
    setDraftTo(range.to);
    setFromText(formatInputDate(range.from));
    setToText(formatInputDate(range.to));
    setFromError(undefined);
    setToError(undefined);
  };

  const handleOpenChange = (next: boolean) => {
    if (next) resetDraft(value);
    setOpen(next);
  };

  const applyPreset = (range: DateRange) => {
    onValueChange(range);
    setOpen(false);
  };

  const commitFromText = (text: string) => {
    const parsed = parseInputDate(text);
    if (!parsed) {
      setFromError('Fecha inválida');
      return;
    }
    setFromError(undefined);
    setDraftFrom(parsed);
  };

  const commitToText = (text: string) => {
    const parsed = parseInputDate(text);
    if (!parsed) {
      setToError('Fecha inválida');
      return;
    }
    setToError(undefined);
    setDraftTo(parsed);
  };

  const handleCalendarSelect = (range: DayPickerRange | undefined) => {
    const from = range?.from ? dateToUtcMidnight(range.from) : undefined;
    const to = range?.to ? dateToUtcMidnight(range.to) : undefined;
    setDraftFrom(from ?? draftFrom);
    setDraftTo(to);
    setFromText(from ? formatInputDate(from) : '');
    setToText(to ? formatInputDate(to) : '');
    setFromError(undefined);
    setToError(undefined);
  };

  const rangeInvalid = !!draftTo && draftFrom > draftTo;
  const canConfirm = !!draftTo && !fromError && !toError && !rangeInvalid;

  const handleConfirm = () => {
    if (!canConfirm || !draftTo) return;
    onValueChange({ from: draftFrom, to: draftTo });
    setOpen(false);
  };

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

      <Popover open={open} onOpenChange={handleOpenChange}>
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
        <PopoverContent align="end" className="w-[min(92vw,20rem)] sm:w-auto">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
              {RANGE_PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  type="button"
                  size="xs"
                  variant={activePreset === preset.id ? 'default' : 'outline'}
                  onClick={() => applyPreset(preset.build())}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            <div className="flex items-start gap-2">
              <div className="flex flex-1 flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Desde</Label>
                <Input
                  value={fromText}
                  placeholder="dd/mm/aaaa"
                  aria-invalid={!!fromError}
                  onChange={(e) => setFromText(e.target.value)}
                  onBlur={(e) => commitFromText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitFromText(fromText);
                    }
                  }}
                />
                {fromError && <p className="text-xs text-destructive">{fromError}</p>}
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <Label className="text-xs text-muted-foreground">Hasta</Label>
                <Input
                  value={toText}
                  placeholder="dd/mm/aaaa"
                  aria-invalid={!!toError}
                  onChange={(e) => setToText(e.target.value)}
                  onBlur={(e) => commitToText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitToText(toText);
                    }
                  }}
                />
                {toError && <p className="text-xs text-destructive">{toError}</p>}
              </div>
            </div>

            <Calendar
              mode="range"
              locale={es}
              numberOfMonths={calendarMonths}
              resetOnSelect
              defaultMonth={utcMidnightToLocalDate(draftFrom)}
              selected={{
                from: utcMidnightToLocalDate(draftFrom),
                to: draftTo ? utcMidnightToLocalDate(draftTo) : undefined,
              }}
              onSelect={handleCalendarSelect}
              className={cn('rdp-range')}
            />

            <div className="flex items-center justify-between gap-2 border-t pt-3">
              <p className="text-xs text-destructive">
                {rangeInvalid ? '"Hasta" no puede ser anterior a "Desde".' : ' '}
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="button" size="sm" disabled={!canConfirm} onClick={handleConfirm}>
                  Confirmar
                </Button>
              </div>
            </div>
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
