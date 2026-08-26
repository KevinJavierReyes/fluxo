import type { McpScope } from '@fluxo/shared';

export const MCP_SCOPE_META: Record<McpScope, { label: string; description: string }> = {
  'finances:read': {
    label: 'Leer finanzas',
    description: 'Consultar transacciones, presupuestos, patrimonio y proyecciones.',
  },
  'finances:write': {
    label: 'Escribir transacciones',
    description: 'Registrar, editar o borrar transacciones y aportes a metas.',
  },
  'config:write': {
    label: 'Escribir configuración',
    description: 'Crear o editar cuentas, categorías, presupuestos, metas y reglas.',
  },
};
