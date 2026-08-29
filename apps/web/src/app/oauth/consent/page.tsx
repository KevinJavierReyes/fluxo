import { redirect } from 'next/navigation';
import { AlertCircleIcon } from 'lucide-react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { getApiOrigin } from '@/lib/api-origin';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MCP_SCOPE_META } from '@/lib/mcp-scopes';
import type { McpScope } from '@fluxo/shared';
import { ConsentActions } from './consent-actions';

interface AuthorizeRequestDetails {
  requestId: string;
  clientName: string;
  clientUri: string | null;
  logoUri: string | null;
  redirectHost: string;
  scopes: string[];
  isDynamic: boolean;
  expiresAt: string;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <Image src="/logo.png" alt="Fluxo" width={45} height={50} className="h-6 w-auto shrink-0" priority />
        Fluxo
      </div>
      <Card className="w-full max-w-sm">{children}</Card>
    </main>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <Shell>
      <CardContent>
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      </CardContent>
    </Shell>
  );
}

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ request_id?: string }>;
}) {
  const { request_id: requestId } = await searchParams;
  if (!requestId) {
    return <ErrorCard message="Falta el parámetro request_id en la URL." />;
  }

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

  const res = await fetch(`${getApiOrigin()}/oauth/authorize-request/${requestId}`, {
    headers: { Authorization: `Bearer ${session!.access_token}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    return (
      <ErrorCard message="Esta solicitud de conexión no existe o ya expiró. Volvé a intentar conectar desde el cliente MCP." />
    );
  }

  const details = (await res.json()) as AuthorizeRequestDetails;

  return (
    <Shell>
      <CardHeader>
        <CardTitle>Conectar {details.clientName}</CardTitle>
        <CardDescription>
          {details.clientName} quiere acceder a tu cuenta de Fluxo ({user.email}).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Va a poder:</p>
          <ul className="flex flex-col gap-2">
            {details.scopes.map((scope) => {
              const meta = MCP_SCOPE_META[scope as McpScope];
              return (
                <li key={scope} className="flex items-start gap-2">
                  <Badge variant="secondary" className="mt-0.5 shrink-0">
                    {meta?.label ?? scope}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {meta?.description ?? scope}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">
          Va a redirigir a <span className="font-medium">{details.redirectHost}</span> al
          terminar.
          {details.isDynamic &&
            ' Este cliente no está preregistrado — verificá que reconoces esta app antes de continuar.'}
        </p>

        <ConsentActions requestId={details.requestId} />
      </CardContent>
    </Shell>
  );
}
