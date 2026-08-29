'use client';

import type { ReactNode } from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface MultiSelectItem {
  id: string;
  /** Texto plano, usado en el resumen del trigger ("a, b, c"). */
  label: string;
  /** Contenido de la fila en la lista; si no se pasa, se usa `label`. */
  content?: ReactNode;
}

export interface MultiSelectGroup {
  id: string;
  header?: ReactNode;
  items: MultiSelectItem[];
}

export function MultiSelectPopover({
  groups,
  selectedIds,
  onValueChange,
  allLabel,
  triggerClassName,
}: {
  groups: MultiSelectGroup[];
  selectedIds: string[];
  onValueChange: (ids: string[]) => void;
  allLabel: string;
  triggerClassName?: string;
}) {
  const allItems = groups.flatMap((group) => group.items);
  const selectedItems = allItems.filter((item) => selectedIds.includes(item.id));

  const toggle = (id: string) => {
    onValueChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  };

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn('justify-between font-normal', triggerClassName)}
          />
        }
      >
        <span className="flex min-w-0 items-center gap-2">
          <Badge variant="secondary">{selectedItems.length > 0 ? selectedItems.length : allItems.length}</Badge>
          <span className="truncate">
            {selectedItems.length === 0 ? allLabel : selectedItems.map((item) => item.label).join(', ')}
          </span>
        </span>
        <ChevronDownIcon className="text-muted-foreground shrink-0" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
          {groups.map((group) => (
            <div key={group.id}>
              {group.header && <div className="px-1.5 py-1 text-xs text-muted-foreground">{group.header}</div>}
              {group.items.map((item) => (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-sm hover:bg-muted"
                >
                  <Checkbox checked={selectedIds.includes(item.id)} onCheckedChange={() => toggle(item.id)} />
                  <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate">
                    {item.content ?? item.label}
                  </span>
                </label>
              ))}
            </div>
          ))}
        </div>
        {selectedIds.length > 0 && (
          <Button type="button" variant="ghost" size="xs" className="mt-2 w-full" onClick={() => onValueChange([])}>
            Limpiar selección
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
