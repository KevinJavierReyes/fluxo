'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import type { RecurringRule } from '@/lib/types';

export function RecurringRuleActiveToggle({
  rule,
  onConfirm,
}: {
  rule: RecurringRule;
  onConfirm: (nextActive: boolean) => void;
}) {
  const [pendingActive, setPendingActive] = useState<boolean | null>(null);

  return (
    <>
      <label className="flex items-center gap-1.5 text-sm">
        <Checkbox checked={rule.isActive} onCheckedChange={(checked) => setPendingActive(checked === true)} />
        <Badge variant={rule.isActive ? 'default' : 'secondary'}>{rule.isActive ? 'Activa' : 'Inactiva'}</Badge>
      </label>

      <AlertDialog open={pendingActive !== null} onOpenChange={(open) => !open && setPendingActive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingActive ? '¿Activar este gasto programado?' : '¿Desactivar este gasto programado?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingActive
                ? 'Se reanudará la generación automática de transacciones hacia adelante. Las transacciones que ya existen no se modifican ni se regeneran.'
                : 'No se generarán nuevas transacciones hasta que vuelvas a activarlo. Las transacciones que ya se crearon se mantienen sin cambios — no se eliminan.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingActive !== null) onConfirm(pendingActive);
                setPendingActive(null);
              }}
            >
              {pendingActive ? 'Activar' : 'Desactivar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
