import { useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GroupChip } from '@/components/group-chip';
import type { CategoryGroup } from '@/lib/types';

export function CategoryGroupSelect({
  groups,
  value,
  onValueChange,
  placeholder = 'Selecciona un grupo',
  triggerClassName = 'w-52',
  ariaInvalid,
  onCreateGroup,
}: {
  groups: CategoryGroup[] | undefined;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  triggerClassName?: string;
  ariaInvalid?: boolean;
  /** Si viene, muestra un "+ Crear grupo" al final de la lista para no quedar atrapado sin grupos. */
  onCreateGroup?: () => void;
}) {
  const groupById = new Map(groups?.map((group) => [group.id, group]) ?? []);
  const [open, setOpen] = useState(false);

  return (
    <Select open={open} onOpenChange={setOpen} value={value} onValueChange={(v) => onValueChange(v ?? '')}>
      <SelectTrigger className={triggerClassName} aria-invalid={ariaInvalid}>
        <SelectValue placeholder={placeholder}>
          {(v: string) => {
            const group = groupById.get(v);
            if (!group) return undefined;
            return (
              <span className="flex items-center gap-1.5">
                <GroupChip color={group.color} icon={group.icon} size="sm" />
                {group.name}
              </span>
            );
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        footer={
          onCreateGroup && (
            <button
              type="button"
              className="flex w-full items-center gap-1.5 border-t px-1.5 py-1.5 text-sm text-muted-foreground outline-hidden select-none hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                setOpen(false);
                onCreateGroup();
              }}
            >
              <PlusIcon className="size-4" />
              Crear grupo
            </button>
          )
        }
      >
        {groups?.map((group) => (
          <SelectItem key={group.id} value={group.id}>
            <GroupChip color={group.color} icon={group.icon} size="sm" />
            {group.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
