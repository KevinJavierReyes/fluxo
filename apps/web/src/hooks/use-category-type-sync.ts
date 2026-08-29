import { useEffect } from 'react';
import type { UseFormSetValue } from 'react-hook-form';
import type { TransactionType } from '@fluxo/shared';
import { findCategoryGroupType } from '@/lib/category-type';
import type { CategoryGroup } from '@/lib/types';

/**
 * Sincroniza los campos `type` y `categoryId` de un formulario: si cambia el
 * tipo y la categoría seleccionada ya no pertenece a ese tipo, la limpia; y
 * al elegir una categoría, infiere el tipo desde su grupo si no coincide.
 */
export function useCategoryTypeSync<T extends { type: TransactionType; categoryId: string }>({
  type,
  categoryId,
  groups,
  setValue,
}: {
  type: TransactionType;
  categoryId: string;
  groups: CategoryGroup[] | undefined;
  setValue: UseFormSetValue<T>;
}) {
  useEffect(() => {
    if (!categoryId) return;
    const currentCategoryType = findCategoryGroupType(groups, categoryId);
    if (currentCategoryType && currentCategoryType !== type) {
      setValue('categoryId' as never, '' as never, { shouldValidate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  return function onCategoryChange(newCategoryId: string, onFieldChange: (value: string) => void) {
    onFieldChange(newCategoryId);
    const matchedType = findCategoryGroupType(groups, newCategoryId);
    if (matchedType && matchedType !== type) {
      setValue('type' as never, matchedType as never, { shouldDirty: true });
    }
  };
}
