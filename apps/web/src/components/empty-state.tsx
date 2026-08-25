import type { LucideIcon } from 'lucide-react';
import { InboxIcon } from 'lucide-react';

export function EmptyState({
  message,
  icon: Icon = InboxIcon,
}: {
  message: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-10 text-center">
      <Icon className="size-8 text-muted-foreground/60" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
