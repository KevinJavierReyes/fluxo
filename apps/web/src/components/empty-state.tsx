import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { InboxIcon } from 'lucide-react';

export function EmptyState({
  message,
  icon: Icon = InboxIcon,
  action,
}: {
  message: string;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-10 text-center">
      <div className="flex flex-col items-center gap-2">
        <Icon className="size-8 text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      {action}
    </div>
  );
}
