import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

export function InlineActionRow({
  children,
  onSubmit,
  submitLabel,
  disabled,
  pending,
  error,
}: {
  children: ReactNode;
  onSubmit: () => void;
  submitLabel: string;
  disabled?: boolean;
  pending?: boolean;
  error?: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {children}
      <Button type="button" size="sm" disabled={disabled || pending} onClick={onSubmit}>
        {submitLabel}
      </Button>
      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </div>
  );
}
