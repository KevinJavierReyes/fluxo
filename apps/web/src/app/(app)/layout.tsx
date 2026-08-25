import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LogoutButton } from './logout-button';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/accounts', label: 'Cuentas' },
  { href: '/categories', label: 'Categorías' },
  { href: '/transactions', label: 'Transacciones' },
  { href: '/recurring-rules', label: 'Gastos programados' },
  { href: '/expense-templates', label: 'Gastos frecuentes' },
  { href: '/savings-goals', label: 'Ahorros' },
  { href: '/budgets', label: 'Presupuestos' },
  { href: '/obligations', label: 'Obligaciones' },
  { href: '/assets', label: 'Activos' },
];

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

  return (
    <div className="min-h-screen">
      <header className="flex flex-col gap-3 border-b px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
          <span className="font-semibold">Fluxo</span>
          <nav className="flex gap-4 overflow-x-auto whitespace-nowrap text-sm">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="text-gray-700 hover:underline">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className="truncate">{user.email}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="p-4 md:p-6">{children}</main>
    </div>
  );
}
