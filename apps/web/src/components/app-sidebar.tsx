'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ChevronsLeftIcon, ChevronsRightIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_VERSION } from '@/lib/version';
import { NavList } from '@/components/nav-list';
import { ThemeToggle } from '@/components/theme-toggle';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { LogoutButton } from '@/app/(app)/logout-button';

export function AppSidebar({
  userEmail,
  collapsed,
  onToggleCollapsed,
}: {
  userEmail: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      <div className={cn('flex h-14 items-center gap-2 px-4', collapsed && 'justify-center px-0')}>
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Image src="/logo.png" alt="Fluxo" width={45} height={50} className="h-5 w-auto shrink-0" priority />
          {!collapsed && <span>Fluxo</span>}
        </Link>
      </div>
      <Separator />
      <div className="flex-1 overflow-y-auto px-2 py-3">
        <NavList collapsed={collapsed} />
      </div>
      <Separator />
      <div className={cn('flex flex-col gap-2 p-2', collapsed && 'items-center')}>
        <div className={cn('flex items-center gap-1', collapsed && 'flex-col')}>
          <ThemeToggle />
          <LogoutButton collapsed={collapsed} />
        </div>
        {!collapsed && (
          <div className="flex items-center justify-between gap-2 px-1">
            <p className="truncate text-xs text-muted-foreground" title={userEmail}>
              {userEmail}
            </p>
            <p className="shrink-0 text-xs text-muted-foreground">v{APP_VERSION}</p>
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn('self-end text-muted-foreground', collapsed && 'self-center')}
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          onClick={onToggleCollapsed}
        >
          {collapsed ? <ChevronsRightIcon /> : <ChevronsLeftIcon />}
        </Button>
      </div>
    </aside>
  );
}
