'use client';

import { useState } from 'react';
import { Trash2Icon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export function DeleteRecurringRuleButton({
  onConfirm,
}: {
  onConfirm: (options: { deleteConfirmed: boolean }) => void;
}) {
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);

  return (
    <AlertDialog onOpenChange={(open) => open && setDeleteConfirmed(false)}>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            aria-label="Eliminar regla"
          />
        }
      >
        <Trash2Icon />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar este gasto programado?</AlertDialogTitle>
          <AlertDialogDescription>
            La regla se eliminará de forma permanente junto con sus transacciones proyectadas (pendientes u omitidas).
            Las confirmadas se conservan como movimientos sueltos, salvo que marques la opción de abajo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex items-start gap-2">
          <Checkbox
            id="delete-rule-confirmed"
            className="mt-0.5"
            checked={deleteConfirmed}
            onCheckedChange={(next) => setDeleteConfirmed(next === true)}
          />
          <div className="flex flex-col gap-0.5">
            <Label htmlFor="delete-rule-confirmed">Eliminar también las transacciones confirmadas</Label>
            <p className="text-xs text-muted-foreground">
              Se borran del historial y cambian tus saldos reales. No se puede deshacer.
            </p>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm({ deleteConfirmed })}>Eliminar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
