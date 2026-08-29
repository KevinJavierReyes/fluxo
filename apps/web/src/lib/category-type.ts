import type { TransactionType } from '@fluxo/shared';
import type { CategoryGroup } from '@/lib/types';

export function filterGroupsByType(
  groups: CategoryGroup[] | undefined,
  type: TransactionType | undefined,
): CategoryGroup[] | undefined {
  if (!type) return groups;
  return groups?.filter((g) => g.type === type);
}

export function findCategoryGroupType(
  groups: CategoryGroup[] | undefined,
  categoryId: string,
): TransactionType | undefined {
  for (const group of groups ?? []) {
    if (group.categories.some((c) => c.id === categoryId)) return group.type;
  }
  return undefined;
}
