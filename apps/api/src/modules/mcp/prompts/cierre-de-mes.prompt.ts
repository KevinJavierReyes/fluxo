import { z } from 'zod';
import { resolveMonthArg } from './month.util';
import { userMessage, type PromptDefinition } from './types';

const argsSchema = {
  mes: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional()
    .describe('Mes a cerrar, YYYY-MM. Si se omite, usa el mes actual.'),
};

export function cierreDeMesPrompt(): PromptDefinition<typeof argsSchema> {
  return {
    name: 'cierre_de_mes',
    requiredScope: 'finances:read',
    config: {
      title: 'Cierre de mes',
      description:
        'Checklist antes de pasar al siguiente mes: presupuestos sobregirados, reglas recurrentes a revisar, transacciones sin categorizar.',
      argsSchema,
    },
    handler: (args, ctx) => {
      const mes = resolveMonthArg(args.mes, ctx);
      return userMessage(
        `Ayudame a cerrar ${mes} antes de pasar al siguiente mes. Verificá, en este orden:

1. Con get_budget_status (month="${mes}"): ¿algún presupuesto quedó sobregirado o muy cerca del límite?
2. Con fluxo_list (resource: "recurring_rule"): ¿hay alguna regla recurrente activa que debería desactivarse, pausarse, o cuyo monto ya no es realista para el próximo mes?
3. Con search_transactions (from/to cubriendo ${mes}): ¿hay transacciones con descripción vacía o en una categoría genérica ("Otros") que valga la pena revisar antes de dar el mes por cerrado?

Devolvé una lista corta de pendientes accionables si encontrás algo, o confirmá explícitamente que no hay nada pendiente. No hace falta narrar cada tool que usás — solo el resultado.`,
      );
    },
  };
}
