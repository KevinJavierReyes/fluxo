'use client';

import { useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { MCP_SCOPES, type McpScope } from '@fluxo/shared';
import { useCreateMcpPat } from '@/hooks/use-mcp-settings';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CopyButton } from '@/components/copy-button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MCP_SCOPE_META } from '@/lib/mcp-scopes';
import type { CreatedMcpPat } from '@/lib/types';
import { cn } from '@/lib/utils';

const EXPIRY_OPTIONS = [
  { label: '30 días', value: '30' },
  { label: '90 días', value: '90' },
  { label: '1 año', value: '365' },
  { label: 'Sin expiración', value: 'never' },
];

function initialState() {
  return {
    name: '',
    scopes: new Set<McpScope>(['finances:read']),
    expiresInDays: '90',
  };
}

export function CreatePatDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialState());
  const [created, setCreated] = useState<CreatedMcpPat | null>(null);
  const createPat = useCreateMcpPat();

  const toggleScope = (scope: McpScope) => {
    setForm((prev) => {
      const scopes = new Set(prev.scopes);
      if (scopes.has(scope)) scopes.delete(scope);
      else scopes.add(scope);
      return { ...prev, scopes };
    });
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      // Al cerrar (por cualquier vía) se resetea todo, incluido el token
      // revelado — ya cumplió su propósito de mostrarse una vez.
      setForm(initialState());
      setCreated(null);
      createPat.reset();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await createPat.mutateAsync({
      name: form.name,
      scopes: [...form.scopes],
      expiresInDays: form.expiresInDays === 'never' ? undefined : Number(form.expiresInDays),
    });
    setCreated(result);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button type="button">
            <PlusIcon />
            Crear token
          </Button>
        }
      />
      <DialogContent
        className={cn(
          // Igual que form-dialog.tsx: en móvil se comporta como hoja inferior en vez de
          // modal centrado; !important porque el orden del CSS generado no garantiza que
          // max-sm: gane sobre las clases base (w-[calc(...)], top-1/2, etc.).
          'max-sm:top-auto! max-sm:left-0! max-sm:w-full! max-sm:max-w-none! max-sm:translate-x-0! max-sm:translate-y-0! max-sm:rounded-b-none max-sm:inset-x-0! max-sm:bottom-0! max-sm:max-h-[92dvh]!',
        )}
      >
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Token creado</DialogTitle>
              <DialogDescription>
                Copialo ahora — no vas a poder volver a verlo. Si lo perdés, hay que crear uno
                nuevo.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2.5">
                <code className="flex-1 overflow-x-auto text-xs whitespace-nowrap">
                  {created.token}
                </code>
                <CopyButton value={created.token} />
              </div>
              <p className="text-xs text-muted-foreground">
                Usalo como el Bearer token al conectar un cliente MCP manualmente (ej. `claude mcp
                add --transport http`).
              </p>
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Listo, ya lo copié
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Crear token personal</DialogTitle>
              <DialogDescription>
                Para conectar un cliente MCP manualmente, sin pasar por el flujo de autorización.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pat-name">Nombre</Label>
                <Input
                  id="pat-name"
                  placeholder="Ej. Claude Code en mi laptop"
                  required
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pat-expiry">Expiración</Label>
                <Select
                  value={form.expiresInDays}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, expiresInDays: value ?? '90' }))
                  }
                >
                  <SelectTrigger id="pat-expiry" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Permisos</Label>
                {MCP_SCOPES.map((scope) => (
                  <label key={scope} className="group/field flex items-start gap-2.5">
                    <Checkbox
                      checked={form.scopes.has(scope)}
                      onCheckedChange={() => toggleScope(scope)}
                      className="mt-0.5"
                    />
                    <span className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">{MCP_SCOPE_META[scope].label}</span>
                      <span className="text-xs text-muted-foreground">
                        {MCP_SCOPE_META[scope].description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              {createPat.isError && (
                <p className="text-sm text-destructive">{createPat.error.message}</p>
              )}

              <DialogFooter>
                <DialogClose
                  render={
                    <Button type="button" variant="outline">
                      Cancelar
                    </Button>
                  }
                />
                <Button type="submit" disabled={createPat.isPending || form.scopes.size === 0}>
                  Crear token
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
