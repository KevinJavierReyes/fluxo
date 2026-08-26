'use client';

import { useState } from 'react';
import { AlertCircleIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getApiOrigin } from '@/lib/api-origin';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export function ConsentActions({ requestId }: { requestId: string }) {
  const [pending, setPending] = useState<'approve' | 'deny' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resolve = async (approve: boolean) => {
    setError(null);
    setPending(approve ? 'approve' : 'deny');
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError('Tu sesión expiró. Recargá la página e iniciá sesión de nuevo.');
        return;
      }

      const res = await fetch(`${getApiOrigin()}/oauth/consent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ requestId, approve }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText }));
        setError(body.message ?? 'No se pudo procesar la solicitud.');
        return;
      }

      const { redirectTo } = (await res.json()) as { redirectTo: string };
      // Navegación real, no router.push: redirectTo apunta de vuelta al
      // cliente MCP (otra app/origen), no a una ruta de esta web.
      window.location.href = redirectTo;
    } catch {
      setError('No se pudo conectar con el servidor. Intenta de nuevo.');
      setPending(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={pending !== null}
          onClick={() => resolve(false)}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          className="flex-1"
          disabled={pending !== null}
          onClick={() => resolve(true)}
        >
          {pending === 'approve' ? 'Autorizando…' : 'Autorizar'}
        </Button>
      </div>
    </div>
  );
}
