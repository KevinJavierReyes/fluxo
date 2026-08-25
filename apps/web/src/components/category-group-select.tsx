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
}: {
  groups: CategoryGroup[] | undefined;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  triggerClassName?: string;
  ariaInvalid?: boolean;
}) {
  const groupById = new Map(groups?.map((group) => [group.id, group]) ?? []);

  return (
    <Select value={value} onValueChange={(v) => onValueChange(v ?? '')}>
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
      <SelectContent>
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
