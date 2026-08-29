import { z } from 'zod';
import type { McpPolicyService } from '../../policy/mcp-policy.service';
import { entityResult, type ToolDefinition } from '../types';
import {
  GENERIC_RESOURCE_KEYS,
  type GenericResourceKey,
  type ResourceDescriptor,
  type ResourceKey,
} from './resource-registry';

const RESOURCE_FIELD_HINTS: Record<GenericResourceKey, string> = {
  account:
    'name, type?(BANK|CASH|CREDIT_CARD|OTHER, default BANK), openingBalance?(default 0), openingBalanceDate?',
  category: 'groupId, name, sortOrder?',
  category_group: 'name, type(INCOME|EXPENSE), color?, icon?, sortOrder?',
  asset: 'name, estimatedValue, maxSaleTimeDays?, notes?',
  obligation:
    'creditorName, totalAmount, monthlyPayment, remainingMonths?, interestRate?, description?',
  budget: 'categoryGroupId, amount, effectiveFrom, effectiveTo?',
  savings_goal: 'name, targetAmount, targetDate?',
  expense_template:
    'name, suggestedAmount?, accountId?, categoryId, type?(INCOME|EXPENSE, default EXPENSE)',
};

const inputSchema = {
  resource: z.enum(GENERIC_RESOURCE_KEYS),
  data: z
    .record(z.unknown())
    .describe(
      'Campos del recurso a crear — ver la lista de campos por recurso arriba.',
    ),
};

export function fluxoCreateTool(
  registry: Record<ResourceKey, ResourceDescriptor>,
  policyService: McpPolicyService,
): ToolDefinition<typeof inputSchema> {
  const fieldsSummary = GENERIC_RESOURCE_KEYS.map(
    (k) => `  - ${k}: ${RESOURCE_FIELD_HINTS[k]}`,
  ).join('\n');
  return {
    name: 'fluxo_create',
    requiredScope: 'config:write',
    config: {
      title: 'Crear un recurso de configuración',
      description:
        `Crea un elemento de un recurso de configuración (no transacciones — para eso usa record_transaction; no reglas recurrentes — para eso usa create_recurring_expense). Campos por recurso:\n${fieldsSummary}\n` +
        'Si un campo referencia otro recurso (groupId, accountId, categoryId, categoryGroupId), tiene que ser un id real: resolvelo antes con fluxo_search o fluxo_list.',
      inputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    handler: async (args, ctx) => {
      const policy = await policyService.getPolicy(ctx.userId);
      policyService.assertConfigWriteAllowed(policy);

      const descriptor = registry[args.resource as ResourceKey];
      const parsed = descriptor.createSchema.parse(args.data) as Record<
        string,
        unknown
      >;
      const created = await descriptor.create(ctx.userId, parsed);
      const label = descriptor.nameOf
        ? descriptor.nameOf(created)
        : (created.id as string);

      return entityResult(
        `${descriptor.label} "${label}" creado.`,
        descriptor.key,
        created.id as string,
        { item: created },
      );
    },
  };
}
