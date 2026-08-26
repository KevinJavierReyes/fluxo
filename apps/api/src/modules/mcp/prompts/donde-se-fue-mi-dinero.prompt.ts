import { z } from 'zod';
import { resolveMonthArg } from './month.util';
import { userMessage, type PromptDefinition } from './types';

const argsSchema = {
  mes: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional()
    .describe('Mes a analizar, YYYY-MM. Si se omite, usa el mes actual.'),
};

export function dondeSeFueMiDineroPrompt(): PromptDefinition<
  typeof argsSchema
> {
  return {
    name: 'donde_se_fue_mi_dinero',
    requiredScope: 'finances:read',
    config: {
      title: '¿Dónde se fue mi dinero?',
      description:
        'Las categorías donde más se gastó este mes, con las transacciones concretas detrás de las que más pesan.',
      argsSchema,
    },
    handler: (args, ctx) => {
      const mes = resolveMonthArg(args.mes, ctx);
      return userMessage(
        `Quiero entender en qué se fue mi dinero en ${mes}. Usá get_dashboard con from/to cubriendo ese mes para el desglose de gasto por categoría, e identificá las 3-5 categorías con mayor gasto.

Para la categoría (o categorías) que más pesen o te parezcan sorprendentemente altas, usá search_transactions filtrando por esa categoría y ese rango de fechas para encontrar las transacciones concretas detrás del número.

Presentá la respuesta como una explicación breve y concreta, no como una tabla — qué se llevó la mayor parte del dinero y por qué, con un par de frases por categoría relevante y algún ejemplo de transacción cuando ayude a explicar el número.`,
      );
    },
  };
}
