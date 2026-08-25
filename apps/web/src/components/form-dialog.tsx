'use client';

import { useState, type FormEventHandler, type ReactElement, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/** Razones de cierre "por accidente": click fuera, Esc, o el botón Cancelar/X. */
const DISMISS_REASONS = new Set(['outside-press', 'escape-key', 'close-press']);

/**
 * Cáscara reutilizable para meter cualquier formulario en un modal.
 * El estado `open` lo controla el llamador para poder cerrarlo al resolver el submit.
 *
 * Si `isDirty` es true, cerrar por click fuera / Esc / botón Cancelar pide confirmación
 * en vez de descartar los cambios directamente. El cierre programático (setOpen(false)
 * tras un submit exitoso) no pasa por esta guardia.
 *
 * En pantallas angostas el modal se comporta como una hoja inferior (bottom sheet).
 */
export function FormDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  onSubmit,
  submitLabel = 'Guardar',
  isSubmitting,
  isDirty,
  size = 'default',
  error,
  className,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se le pasa a `render` de Base UI: debe ser un elemento, no un componente. */
  trigger?: ReactElement;
  title: string;
  description?: string;
  onSubmit: FormEventHandler<HTMLFormElement>;
  submitLabel?: string;
  isSubmitting?: boolean;
  /** Si hay cambios sin guardar, confirma antes de cerrar por fuera/Esc/Cancelar. */
  isDirty?: boolean;
  /** 'lg' para formularios con muchos campos (obligaciones, gastos programados). */
  size?: 'default' | 'lg';
  error?: string | null;
  className?: string;
  children: ReactNode;
}) {
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next, eventDetails) => {
          if (!next && isDirty && DISMISS_REASONS.has(eventDetails.reason)) {
            eventDetails.cancel();
            setConfirmDiscardOpen(true);
            return;
          }
          onOpenChange(next);
        }}
      >
        {trigger && <DialogTrigger render={trigger} />}
        <DialogContent
          className={cn(
            size === 'lg' && 'sm:max-w-2xl',
            // El orden del CSS generado no garantiza que max-sm: gane sobre las clases
            // base (w-[calc(...)], top-1/2, etc.) aunque tengan la misma especificidad;
            // se marcan !important para que la hoja inferior en móvil no quede a medias.
            'max-sm:top-auto! max-sm:left-0! max-sm:w-full! max-sm:max-w-none! max-sm:translate-x-0! max-sm:translate-y-0! max-sm:rounded-b-none max-sm:inset-x-0! max-sm:bottom-0! max-sm:max-h-[92dvh]!',
            className,
          )}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4">
            {children}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter className="sticky bottom-0 -mx-5 -mb-5 bg-popover px-5 py-4">
              <DialogClose
                render={
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                }
              />
              <Button type="submit" disabled={isSubmitting}>
                {submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDiscardOpen} onOpenChange={setConfirmDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Descartar cambios?</AlertDialogTitle>
            <AlertDialogDescription>
              Tienes cambios sin guardar en este formulario. Si cierras ahora se van a perder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Seguir editando</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDiscardOpen(false);
                onOpenChange(false);
              }}
            >
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
