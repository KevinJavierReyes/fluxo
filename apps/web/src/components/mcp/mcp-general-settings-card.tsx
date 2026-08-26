'use client';

import { useState } from 'react';
import { useMe, useUpdateMe } from '@/hooks/use-mcp-settings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QueryError } from '@/components/query-error';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { COMMON_TIMEZONES } from '@/lib/timezones';
import type { Me } from '@/lib/types';

export function McpGeneralSettingsCard() {
  const { data: me, isLoading, isError } = useMe();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (isError || !me) {
    return <QueryError message="No se pudo cargar la configuración de MCP." />;
  }

  // Componente separado (montado solo cuando `me` ya existe) para poder
  // inicializar el estado del form directo desde props — evita el patrón
  // "cargar por query, sincronizar a estado local por efecto", que dispara
  // un render en cascada innecesario.
  return <McpGeneralSettingsForm me={me} />;
}

function McpGeneralSettingsForm({ me }: { me: Me }) {
  const updateMe = useUpdateMe();

  const [mcpEnabled, setMcpEnabled] = useState(me.mcpEnabled);
  const [timezone, setTimezone] = useState(me.timezone);
  const [maxAmount, setMaxAmount] = useState(
    me.mcpMaxTransactionAmount != null ? String(me.mcpMaxTransactionAmount) : '',
  );
  const [allowDelete, setAllowDelete] = useState(me.mcpAllowDelete);
  const [allowConfigWrite, setAllowConfigWrite] = useState(me.mcpAllowConfigWrite);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    const trimmed = maxAmount.trim();
    await updateMe.mutateAsync({
      mcpEnabled,
      timezone,
      mcpMaxTransactionAmount: trimmed === '' ? null : Number(trimmed),
      mcpAllowDelete: allowDelete,
      mcpAllowConfigWrite: allowConfigWrite,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Acceso MCP</CardTitle>
        <CardDescription>
          Controla si un agente (como Claude) puede conectarse a tu cuenta, y qué límites tiene al
          escribir datos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="mcp-enabled">Habilitar acceso MCP</Label>
              <p className="text-sm text-muted-foreground">
                Con esto apagado, ningún token (ni de apps conectadas ni personal) puede usarse,
                aunque siga existiendo.
              </p>
            </div>
            <Switch
              id="mcp-enabled"
              checked={mcpEnabled}
              onCheckedChange={setMcpEnabled}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mcp-timezone">Zona horaria</Label>
            <Select value={timezone} onValueChange={(value) => setTimezone(value ?? 'UTC')}>
              <SelectTrigger id="mcp-timezone" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMMON_TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
                {!COMMON_TIMEZONES.includes(timezone as (typeof COMMON_TIMEZONES)[number]) && (
                  <SelectItem value={timezone}>{timezone}</SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Se usa para interpretar &quot;hoy&quot; y los rangos de fecha en lo que consulta o
              registra un agente.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mcp-max-amount">Monto máximo por transacción vía agente</Label>
            <Input
              id="mcp-max-amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="Sin límite"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Vacío = sin límite. Un agente no puede registrar ni editar una transacción por más de
              este monto.
            </p>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="mcp-allow-delete">Permitir borrar transacciones</Label>
              <p className="text-sm text-muted-foreground">
                Deshabilitado por defecto — un agente puede editar pero no borrar movimientos.
              </p>
            </div>
            <Switch id="mcp-allow-delete" checked={allowDelete} onCheckedChange={setAllowDelete} />
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="mcp-allow-config">Permitir crear/editar configuración</Label>
              <p className="text-sm text-muted-foreground">
                Cuentas, categorías, presupuestos, metas y reglas recurrentes.
              </p>
            </div>
            <Switch
              id="mcp-allow-config"
              checked={allowConfigWrite}
              onCheckedChange={setAllowConfigWrite}
            />
          </div>

          {updateMe.isError && (
            <p className="text-sm text-destructive">{updateMe.error.message}</p>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={updateMe.isPending}>
              Guardar cambios
            </Button>
            {saved && <span className="text-sm text-success">Guardado.</span>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
