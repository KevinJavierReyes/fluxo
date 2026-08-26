import { z } from 'zod';
import { resolveMonthArg } from './month.util';
import { userMessage, type PromptDefinition } from './types';

const argsSchema = {
  mes: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional()
    .describe('Mes a revisar, YYYY-MM. Si se omite, usa el mes actual.'),
};

export function revisionMensualPrompt(): PromptDefinition<typeof argsSchema> {
  return {
    name: 'revision_mensual',
    requiredScope: 'finances:read',
    config: {
      title: 'Revisión mensual',
      description:
        'Resumen del mes: balance, presupuestos, y patrones de gasto a destacar.',
      argsSchema,
    },
    handler: (args, ctx) => {
      const mes = resolveMonthArg(args.mes, ctx);
      return userMessage(
        `Hacé una revisión financiera de ${mes}. Usá get_dashboard con from/to cubriendo ese mes completo para el resumen (balance, ingresos vs. gastos, desglose por categoría), y get_budget_status con month="${mes}" para el estado de los presupuestos.

Presentá:
1. Balance del mes: ingresos, gastos, y el neto.
2. Presupuestos que se pasaron o están cerca de pasarse (con el monto por el que se excedieron o el porcentaje usado).
3. 2-3 observaciones concretas sobre patrones de gasto — qué categoría creció, qué fue inusual, etc.

Sé breve y directo, con números concretos. No hace falta un preámbulo largo — andá directo al resumen.`,
      );
    },
  };
}
