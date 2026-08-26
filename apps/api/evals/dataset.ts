/**
 * ~30 prompts reales que un usuario podría escribirle a un agente conectado
 * a Fluxo por MCP. Cada caso fija qué tool debería elegir el modelo en su
 * PRIMER turno (no se evalúa la conversación completa) — para prompts que
 * necesitan una tool de lectura antes de poder actuar (ej. "borra la
 * transacción de ayer"), lo correcto en el primer turno es buscarla, no
 * adivinar un id.
 *
 * `expectedTools`: cualquiera de estos nombres cuenta como acierto.
 * `expectNoWriteToolCall`: lo correcto es NO escribir nada — llamar tools de
 * *lectura* para investigar antes de aclarar está bien (verificado en vivo:
 * ante "mover dinero entre cuentas" un modelo real llamó fluxo_list para ver
 * qué cuentas existían antes de explicar que no hay operación de
 * transferencia y proponer un plan, sin tocar la base — ese es el
 * comportamiento correcto, no "no llamar nada").
 */
export interface EvalCase {
  id: string;
  prompt: string;
  expectedTools?: string[];
  expectNoWriteToolCall?: boolean;
  notes?: string;
}

export const EVAL_DATASET: EvalCase[] = [
  // --- Registrar transacciones ---
  {
    id: 'record-01',
    prompt: 'Gasté 45 en el súper',
    expectedTools: ['record_transaction'],
  },
  {
    id: 'record-02',
    prompt: 'Recibí 1500 de sueldo hoy',
    expectedTools: ['record_transaction'],
  },
  {
    id: 'record-03',
    prompt: 'Pagué 20 de Uber ayer',
    expectedTools: ['record_transaction'],
  },
  {
    id: 'record-04',
    prompt:
      'Registrá un gasto de 45.50 en el súper con el id "super-2026-08-26" para no duplicarlo si lo repito',
    expectedTools: ['record_transaction'],
    notes:
      'Debería mapear el id explícito a clientRequestId, no inventar uno propio.',
  },
  {
    id: 'record-05',
    prompt: 'Gasté 15 en Netflix hoy',
    expectedTools: ['record_transaction', 'apply_expense_template'],
    notes:
      'Ambiguo a propósito: existe una plantilla "Netflix" pero también es válido registrarlo como gasto suelto.',
  },

  // --- Consultar / buscar ---
  {
    id: 'search-01',
    prompt: '¿Cuánto gasté en Mercado este mes?',
    expectedTools: ['search_transactions', 'get_dashboard'],
  },
  {
    id: 'search-02',
    prompt: 'Mostrame mis últimas 5 transacciones',
    expectedTools: ['search_transactions'],
  },
  {
    id: 'search-03',
    prompt: 'Busca transacciones de más de 100 soles',
    expectedTools: ['search_transactions'],
  },
  {
    id: 'search-04',
    prompt: '¿Qué gasté ayer en Uber?',
    expectedTools: ['search_transactions'],
  },

  // --- Dashboard / proyección / presupuestos / patrimonio ---
  {
    id: 'dashboard-01',
    prompt: '¿Cómo está mi saldo?',
    expectedTools: ['get_dashboard'],
  },
  {
    id: 'dashboard-02',
    prompt: 'Dame un resumen de este mes',
    expectedTools: ['get_dashboard'],
  },
  {
    id: 'budget-01',
    prompt: '¿Cómo van mis presupuestos?',
    expectedTools: ['get_budget_status'],
  },
  {
    id: 'budget-02',
    prompt: '¿Cuánto tengo presupuestado para comida?',
    expectedTools: ['get_budget_status'],
  },
  {
    id: 'cashflow-01',
    prompt: '¿Me voy a quedar sin plata este mes?',
    expectedTools: ['get_cashflow_projection'],
  },
  {
    id: 'cashflow-02',
    prompt: 'Proyectá mi flujo de caja a 30 días',
    expectedTools: ['get_cashflow_projection'],
  },
  {
    id: 'networth-01',
    prompt: '¿Cuál es mi patrimonio neto?',
    expectedTools: ['get_net_worth'],
  },

  // --- Editar / borrar (primer turno: encontrar antes de actuar) ---
  {
    id: 'update-01',
    prompt: 'Cambiá el monto de mi último gasto en Mercado a 50',
    expectedTools: ['search_transactions'],
    notes:
      'No hay id todavía — el primer paso correcto es buscar la transacción, no adivinar.',
  },
  {
    id: 'delete-01',
    prompt: 'Borrá la transacción de ayer en Uber',
    expectedTools: ['search_transactions'],
    notes: 'Igual que update-01: hay que resolver el id antes de poder borrar.',
  },

  // --- Plantillas / metas de ahorro ---
  {
    id: 'template-01',
    prompt: 'Aplicá mi plantilla de Netflix',
    expectedTools: ['apply_expense_template'],
  },
  {
    id: 'savings-01',
    prompt: 'Aporté 100 a mi meta de vacaciones desde mi cuenta principal',
    expectedTools: ['contribute_to_savings_goal'],
  },
  {
    id: 'savings-02',
    prompt: '¿Cuánto llevo ahorrado para mis vacaciones?',
    expectedTools: ['fluxo_get', 'fluxo_list', 'fluxo_search'],
  },

  // --- Recursos de configuración (genéricas) ---
  {
    id: 'generic-01',
    prompt: '¿Qué cuentas tengo?',
    expectedTools: ['fluxo_list'],
  },
  {
    id: 'generic-02',
    prompt: 'Buscá la categoría de streaming',
    expectedTools: ['fluxo_search'],
  },
  {
    id: 'generic-03',
    prompt: '¿Qué campos necesita una obligación nueva?',
    expectedTools: ['fluxo_describe'],
  },
  {
    id: 'generic-04',
    prompt: 'Creá una cuenta nueva llamada "Ahorros BCP"',
    expectedTools: ['fluxo_create'],
  },
  {
    id: 'generic-05',
    prompt: 'Actualizá el monto objetivo de mi meta de vacaciones a 5000',
    expectedTools: ['fluxo_search', 'fluxo_update'],
    notes:
      'Necesita el id de la meta primero, salvo que ya lo sepa por contexto previo.',
  },
  {
    id: 'generic-06',
    prompt: 'Archivá mi cuenta de efectivo',
    expectedTools: ['fluxo_search', 'fluxo_archive'],
  },
  {
    id: 'generic-07',
    prompt: '¿Tengo alguna obligación pendiente?',
    expectedTools: ['fluxo_list'],
  },

  // --- Deshacer ---
  {
    id: 'undo-01',
    prompt: 'Deshacé lo último que hice',
    expectedTools: ['fluxo_undo'],
  },

  // --- Casos límite: no hay tool para eso ---
  {
    id: 'edge-01',
    prompt: 'Moví 200 de mi cuenta principal a mi cuenta de efectivo',
    expectNoWriteToolCall: true,
    notes:
      'Fluxo no tiene una operación de transferencia entre cuentas. Verificado en vivo: un modelo real llamó fluxo_list para revisar las cuentas existentes antes de explicar el límite y proponer un plan (gasto + ingreso) sin ejecutarlo — investigar con tools de lectura está bien, lo que no debe pasar es escribir sin confirmación.',
  },
  {
    id: 'edge-02',
    prompt: 'Cancelá mi suscripción de Netflix',
    expectNoWriteToolCall: true,
    notes:
      'Fluxo no gestiona suscripciones externas, solo el registro financiero — lo correcto es aclarar el límite (investigando antes si hace falta), no escribir nada.',
  },
];
