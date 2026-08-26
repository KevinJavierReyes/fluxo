import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes, randomUUID } from 'crypto';

/**
 * Fixtures fijos para correr los evals: una cuenta, categorías, una
 * plantilla de gasto, una meta de ahorro, un presupuesto, y algunas
 * transacciones ya registradas — todo lo que el dataset (`dataset.ts`)
 * referencia por nombre ("Mercado", "Uber", "Netflix", "vacaciones", etc.).
 */
export interface EvalFixtures {
  userId: string;
  accessToken: string;
  accountId: string;
  cashAccountId: string;
}

export async function seedEvalFixtures(
  prisma: PrismaClient,
): Promise<EvalFixtures> {
  const userId = randomUUID();
  const email = `mcp-evals-${Date.now()}@fluxo.internal`;
  await prisma.user.create({
    data: { id: userId, email, mcpEnabled: true, timezone: 'America/Lima' },
  });

  const account = await prisma.account.create({
    data: {
      userId,
      name: 'Cuenta Principal',
      type: 'BANK',
      openingBalance: 2000,
    },
  });
  const cashAccount = await prisma.account.create({
    data: { userId, name: 'Efectivo', type: 'CASH', openingBalance: 100 },
  });

  const incomeGroup = await prisma.categoryGroup.create({
    data: { userId, name: 'Ingresos', type: 'INCOME' },
  });
  const salarioCategory = await prisma.category.create({
    data: { userId, groupId: incomeGroup.id, name: 'Salario' },
  });

  const foodGroup = await prisma.categoryGroup.create({
    data: { userId, name: 'Alimentación', type: 'EXPENSE' },
  });
  const mercadoCategory = await prisma.category.create({
    data: { userId, groupId: foodGroup.id, name: 'Mercado' },
  });

  const transportGroup = await prisma.categoryGroup.create({
    data: { userId, name: 'Transporte', type: 'EXPENSE' },
  });
  const uberCategory = await prisma.category.create({
    data: { userId, groupId: transportGroup.id, name: 'Uber' },
  });

  const subsGroup = await prisma.categoryGroup.create({
    data: { userId, name: 'Suscripciones', type: 'EXPENSE' },
  });
  const streamingCategory = await prisma.category.create({
    data: { userId, groupId: subsGroup.id, name: 'Streaming' },
  });

  const savingsGroup = await prisma.categoryGroup.create({
    data: { userId, name: 'Ahorro', type: 'EXPENSE' },
  });
  await prisma.category.create({
    data: { userId, groupId: savingsGroup.id, name: 'Aportes' },
  });

  const now = new Date();
  const startOfMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  await prisma.transaction.createMany({
    data: [
      {
        userId,
        accountId: account.id,
        categoryId: salarioCategory.id,
        type: 'INCOME',
        amount: 3500,
        date: startOfMonth,
        description: 'Sueldo',
      },
      {
        userId,
        accountId: account.id,
        categoryId: mercadoCategory.id,
        type: 'EXPENSE',
        amount: 120,
        date: startOfMonth,
        description: 'Compra semanal',
      },
      {
        userId,
        accountId: account.id,
        categoryId: uberCategory.id,
        type: 'EXPENSE',
        amount: 18,
        date: yesterday,
        description: 'Uber al trabajo',
      },
    ],
  });

  await prisma.expenseTemplate.create({
    data: {
      userId,
      name: 'Netflix',
      accountId: account.id,
      categoryId: streamingCategory.id,
      type: 'EXPENSE',
      suggestedAmount: 15,
    },
  });

  await prisma.savingsGoal.create({
    data: { userId, name: 'Vacaciones', targetAmount: 3000 },
  });

  await prisma.budget.create({
    data: {
      userId,
      categoryGroupId: foodGroup.id,
      amount: 500,
      effectiveFrom: startOfMonth,
    },
  });

  const accessToken = 'flx_at_' + randomBytes(32).toString('base64url');
  await prisma.mcpToken.create({
    data: {
      userId,
      kind: 'OAUTH_ACCESS',
      tokenHash: createHash('sha256').update(accessToken).digest('hex'),
      prefix: accessToken.slice(0, 14),
      scopes: ['finances:read', 'finances:write', 'config:write'],
      resource: 'http://localhost:3001/mcp',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  return {
    userId,
    accessToken,
    accountId: account.id,
    cashAccountId: cashAccount.id,
  };
}

export async function cleanupEvalFixtures(
  prisma: PrismaClient,
  userId: string,
): Promise<void> {
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
}
