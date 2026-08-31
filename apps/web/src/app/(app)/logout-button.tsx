'use client';

import { LogOutIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

export function LogoutButton({ collapsed = false }: { collapsed?: boolean }) {
  const router = useRouter();

  const onLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size={collapsed ? 'icon' : 'sm'}
      className={collapsed ? undefined : 'min-w-0 flex-1 justify-start gap-2'}
      onClick={onLogout}
    >
      <LogOutIcon />
      {!collapsed && 'Cerrar sesión'}
    </Button>
  );
}
