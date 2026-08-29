import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GroupChip } from '@/components/group-chip';
import type { CategoryGroup } from '@/lib/types';

export function CategorySelect({
  groups,
  value,
  onValueChange,
  placeholder = 'Selecciona',
  triggerClassName = 'w-52',
  ariaInvalid,
  allowAll = false,
  allLabel = 'Todas',
}: {
  groups: CategoryGroup[] | undefined;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  triggerClassName?: string;
  ariaInvalid?: boolean;
  /** Agrega una opción "Todas" al inicio, para usar como filtro. */
  allowAll?: boolean;
  allLabel?: string;
}) {
  const entryById = new Map(
    groups?.flatMap((group) =>
      group.categories.map((category) => [category.id, { category, group }] as const),
    ) ?? [],
  );

  return (
    <Select value={value} onValueChange={(v) => onValueChange(v ?? '')}>
      <SelectTrigger className={triggerClassName} aria-invalid={ariaInvalid}>
        <SelectValue placeholder={placeholder}>
          {(v: string) => {
            if (v === 'all') return allLabel;
            const entry = entryById.get(v);
            if (!entry) return undefined;
            return (
              <span className="flex items-center gap-1.5">
                <GroupChip color={entry.group.color} icon={entry.group.icon} size="sm" />
                {entry.group.name} / {entry.category.name}
              </span>
            );
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {allowAll && <SelectItem value="all">{allLabel}</SelectItem>}
        {groups?.map((group) => (
          <SelectGroup key={group.id}>
            <SelectLabel className="flex items-center gap-1.5">
              <GroupChip color={group.color} icon={group.icon} size="sm" />
              {group.name}
            </SelectLabel>
            {group.categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                <GroupChip color={group.color} icon={group.icon} size="sm" />
                {category.name}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
