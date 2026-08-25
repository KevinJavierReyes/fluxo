'use client';

import type { FormEventHandler, ReactElement, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
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

/**
 * Cáscara reutilizable para meter cualquier formulario en un modal.
 * El estado `open` lo controla el llamador para poder cerrarlo al resolver el submit.
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
  error?: string | null;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className={className}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4">
          {children}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
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
  );
}
