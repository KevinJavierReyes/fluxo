import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/app-shell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/bootstrap`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: 'no-store',
    }).catch(() => {
      // Si el backend está caído, dejamos pasar al usuario igual; las
      // páginas que dependen de datos mostrarán su propio estado de error.
    });
  }

  return <AppShell userEmail={user.email ?? ''}>{children}</AppShell>;
}
