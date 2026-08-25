'use client';

import { useState } from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { GroupChip } from '@/components/group-chip';
import { CATEGORY_GROUP_COLORS, CATEGORY_GROUP_ICONS } from '@/lib/category-group-visuals';
import { cn } from '@/lib/utils';

export function GroupVisualPicker({
  color,
  icon,
  onColorChange,
  onIconChange,
}: {
  color: string;
  icon: string;
  onColorChange: (color: string) => void;
  onIconChange: (icon: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
          <GroupChip color={color} icon={icon} />
          Color e ícono
        </span>
        <ChevronDownIcon className="text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        <div className="flex flex-col gap-3">
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">Color</p>
            <div className="grid grid-cols-6 gap-1.5">
              {CATEGORY_GROUP_COLORS.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  aria-label={`Color ${swatch}`}
                  onClick={() => onColorChange(swatch)}
                  className={cn(
                    'size-7 rounded-full ring-offset-2 ring-offset-popover transition-transform hover:scale-110',
                    swatch === color && 'ring-2 ring-foreground',
                  )}
                  style={{ backgroundColor: swatch }}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">Ícono</p>
            <div className="grid grid-cols-6 gap-1.5">
              {Object.entries(CATEGORY_GROUP_ICONS).map(([key, Icon]) => (
                <button
                  key={key}
                  type="button"
                  aria-label={`Ícono ${key}`}
                  onClick={() => onIconChange(key)}
                  className={cn(
                    'flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&_svg]:size-4',
                    key === icon && 'bg-muted text-foreground ring-1 ring-foreground/20',
                  )}
                >
                  <Icon />
                </button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
