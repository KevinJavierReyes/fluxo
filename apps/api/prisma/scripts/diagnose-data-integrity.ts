/**
 * Diagnóstico de datos previo a activar validaciones y declarar FKs nuevas
 * (Fase 0 del plan MCP). Solo lee — no modifica nada.
 *
 * Uso: pnpm --filter api exec ts-node prisma/scripts/diagnose-data-integrity.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Diagnóstico de integridad de datos ===\n');

  // 1) Transacciones cuyo tipo no coincide con el tipo del grupo de su
  //    categoría (deuda que la Fase 0.1 empieza a validar en escrituras
  //    nuevas). Estas filas ya existentes NO se tocan; solo se reportan.
  const mismatched = await prisma.$queryRaw<
    { id: string; type: string; groupType: string; groupName: string }[]
  >`
    SELECT t.id, t.type::text AS "type", cg.type::text AS "groupType", cg.name AS "groupName"
    FROM "Transaction" t
    JOIN "Category" c ON c.id = t."categoryId"
    JOIN "CategoryGroup" cg ON cg.id = c."groupId"
    WHERE t.type::text <> cg.type::text
  `;
  console.log(
    `1) Transacciones con tipo incoherente con su categoría: ${mismatched.length}`,
  );
  if (mismatched.length > 0) {
    console.table(mismatched.slice(0, 20));
  }

  // 2) RecurringRule.accountId / categoryId huérfanos (antes de declarar FK)
  const orphanRuleAccounts = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT count(*) FROM "RecurringRule" r
    LEFT JOIN "Account" a ON a.id = r."accountId"
    WHERE a.id IS NULL
  `;
  const orphanRuleCategories = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT count(*) FROM "RecurringRule" r
    LEFT JOIN "Category" c ON c.id = r."categoryId"
    WHERE c.id IS NULL
  `;
  console.log(
    `2) RecurringRule.accountId huérfanos: ${orphanRuleAccounts[0].count}`,
  );
  console.log(
    `   RecurringRule.categoryId huérfanos: ${orphanRuleCategories[0].count}`,
  );

  // 3) ExpenseTemplate.accountId / categoryId huérfanos
  const orphanTemplateAccounts = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT count(*) FROM "ExpenseTemplate" e
    LEFT JOIN "Account" a ON a.id = e."accountId"
    WHERE e."accountId" IS NOT NULL AND a.id IS NULL
  `;
  const orphanTemplateCategories = await prisma.$queryRaw<
    { count: bigint }[]
  >`
    SELECT count(*) FROM "ExpenseTemplate" e
    LEFT JOIN "Category" c ON c.id = e."categoryId"
    WHERE c.id IS NULL
  `;
  console.log(
    `3) ExpenseTemplate.accountId huérfanos: ${orphanTemplateAccounts[0].count}`,
  );
  console.log(
    `   ExpenseTemplate.categoryId huérfanos: ${orphanTemplateCategories[0].count}`,
  );

  // 4) Obligation.linkedRecurringRuleId huérfanos
  const orphanObligationRules = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT count(*) FROM "Obligation" o
    LEFT JOIN "RecurringRule" r ON r.id = o."linkedRecurringRuleId"
    WHERE o."linkedRecurringRuleId" IS NOT NULL AND r.id IS NULL
  `;
  console.log(
    `4) Obligation.linkedRecurringRuleId huérfanos: ${orphanObligationRules[0].count}`,
  );

  // 5) Category.userId que no coincide con el userId del grupo (no debería
  //    poder pasar hoy, pero se verifica antes de declarar la FK)
  const mismatchedCategoryUser = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT count(*) FROM "Category" c
    JOIN "CategoryGroup" cg ON cg.id = c."groupId"
    WHERE c."userId" <> cg."userId"
  `;
  console.log(
    `5) Category.userId inconsistente con su grupo: ${mismatchedCategoryUser[0].count}`,
  );

  // 6) Cuántas cuentas archivadas afectan getProjection (informativo, deuda 0.9)
  const archivedAccounts = await prisma.account.count({
    where: { isArchived: true },
  });
  console.log(`\n6) Cuentas archivadas en el sistema: ${archivedAccounts}`);

  const anyIssue =
    mismatched.length > 0 ||
    Number(orphanRuleAccounts[0].count) > 0 ||
    Number(orphanRuleCategories[0].count) > 0 ||
    Number(orphanTemplateAccounts[0].count) > 0 ||
    Number(orphanTemplateCategories[0].count) > 0 ||
    Number(orphanObligationRules[0].count) > 0 ||
    Number(mismatchedCategoryUser[0].count) > 0;

  console.log(
    anyIssue
      ? '\n⚠ Hay filas que requieren limpieza antes de declarar las FKs (Fase 0.6) o antes de bloquear ediciones por coherencia de tipo (Fase 0.1).'
      : '\n✔ Sin inconsistencias. Seguro proceder con las migraciones de la Fase 0.',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
