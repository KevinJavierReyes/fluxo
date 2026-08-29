'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MenuIcon } from 'lucide-react';
import { AppSidebar } from '@/components/app-sidebar';
import { NavList } from '@/components/nav-list';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { LogoutButton } from '@/app/(app)/logout-button';

export function AppShell({ userEmail, children }: { userEmail: string; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <AppSidebar userEmail={userEmail} collapsed={collapsed} onToggleCollapsed={() => setCollapsed((v) => !v)} />

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm md:hidden">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <Image src="/logo.png" alt="Fluxo" width={45} height={50} className="h-5 w-auto shrink-0" />
            Fluxo
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                render={
                  <Button type="button" variant="ghost" size="icon" aria-label="Abrir menú">
                    <MenuIcon />
                  </Button>
                }
              />
              <SheetContent side="left" className="flex w-72 flex-col">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Image src="/logo.png" alt="Fluxo" width={45} height={50} className="h-5 w-auto shrink-0" />
                    Fluxo
                  </SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto px-2">
                  <NavList onNavigate={() => setMobileOpen(false)} />
                </div>
                <Separator />
                <div className="flex flex-col gap-2 p-4">
                  <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
                  <LogoutButton />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
