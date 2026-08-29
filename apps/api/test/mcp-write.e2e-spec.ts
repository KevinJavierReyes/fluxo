import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createHash, randomBytes, randomUUID } from 'crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: { code: number; message: string };
}

interface ToolsListResult {
  tools: { name: string }[];
}

interface ToolCallResult {
  content: { type: 'text'; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

const MCP_ACCEPT = 'application/json, text/event-stream';

// Cada test hace varios round-trips reales a la base (Supabase pooler);
// el default de Jest (5000ms) se queda corto para los que encadenan
// create + tools/call + verificación en DB.
jest.setTimeout(20000);

function mintToken() {
  return 'flx_at_' + randomBytes(32).toString('base64url');
}

/**
 * Recorre las 13 tools de escritura + fluxo_undo contra la base real. Un
 * segundo usuario cubre los casos que necesitan `mcpAllowDelete: true` y una
 * ocurrencia RECURRING, para no interferir con los límites del usuario
 * principal (mcpMaxTransactionAmount: 500, mcpAllowDelete: false).
 */
describe('MCP server — escritura y anti-desastre (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const userId = randomUUID();
  const email = `mcp-write-e2e-${Date.now()}@fluxo.internal`;
  let accessToken: string;
  let accountId: string;
  let expenseCategoryId: string;

  const userId2 = randomUUID();
  const email2 = `mcp-write-e2e-2-${Date.now()}@fluxo.internal`;
  let accessToken2: string;
  let accountId2: string;
  let expenseCategoryId2: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);

    // Usuario principal: límite de monto bajo, borrado deshabilitado (default).
    await prisma.user.create({
      data: {
        id: userId,
        email,
        mcpEnabled: true,
        mcpMaxTransactionAmount: 500,
      },
    });
    const account = await prisma.account.create({
      data: {
        userId,
        name: 'Cuenta Principal',
        type: 'BANK',
        openingBalance: 1000,
      },
    });
    accountId = account.id;
    await prisma.account.create({
      data: {
        userId,
        name: 'Cuenta Secundaria',
        type: 'CASH',
        openingBalance: 200,
      },
    });
    const incomeGroup = await prisma.categoryGroup.create({
      data: { userId, name: 'Ingresos', type: 'INCOME' },
    });
    await prisma.category.create({
      data: { userId, groupId: incomeGroup.id, name: 'Salario' },
    });
    const expenseGroup = await prisma.categoryGroup.create({
      data: { userId, name: 'Alimentación', type: 'EXPENSE' },
    });
    const expenseCategory = await prisma.category.create({
      data: { userId, groupId: expenseGroup.id, name: 'Mercado' },
    });
    expenseCategoryId = expenseCategory.id;
    const savingsGroup = await prisma.categoryGroup.create({
      data: { userId, name: 'Ahorro', type: 'EXPENSE' },
    });
    await prisma.category.create({
      data: { userId, groupId: savingsGroup.id, name: 'Aportes' },
    });
    await prisma.expenseTemplate.create({
      data: {
        userId,
        name: 'Netflix',
        accountId,
        categoryId: expenseCategoryId,
        type: 'EXPENSE',
        suggestedAmount: 15,
      },
    });
    await prisma.savingsGoal.create({
      data: { userId, name: 'Vacaciones', targetAmount: 5000 },
    });

    accessToken = mintToken();
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

    // Usuario secundario: borrado habilitado, sin límite de monto, con una
    // ocurrencia RECURRING sembrada para probar esa protección específica.
    await prisma.user.create({
      data: {
        id: userId2,
        email: email2,
        mcpEnabled: true,
        mcpAllowDelete: true,
      },
    });
    const account2 = await prisma.account.create({
      data: {
        userId: userId2,
        name: 'Cuenta 2',
        type: 'BANK',
        openingBalance: 1000,
      },
    });
    accountId2 = account2.id;
    const expenseGroup2 = await prisma.categoryGroup.create({
      data: { userId: userId2, name: 'Gastos', type: 'EXPENSE' },
    });
    const expenseCategory2 = await prisma.category.create({
      data: { userId: userId2, groupId: expenseGroup2.id, name: 'Varios' },
    });
    expenseCategoryId2 = expenseCategory2.id;

    accessToken2 = mintToken();
    await prisma.mcpToken.create({
      data: {
        userId: userId2,
        kind: 'OAUTH_ACCESS',
        tokenHash: createHash('sha256').update(accessToken2).digest('hex'),
        prefix: accessToken2.slice(0, 14),
        scopes: ['finances:read', 'finances:write', 'config:write'],
        resource: 'http://localhost:3001/mcp',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
  }, 30000);

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    await prisma.user.delete({ where: { id: userId2 } }).catch(() => {});
    await app.close();
  });

  function call(body: Record<string, unknown>, token: string = accessToken) {
    return request(app.getHttpServer())
      .post('/mcp')
      .set('Content-Type', 'application/json')
      .set('Accept', MCP_ACCEPT)
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  }

  function callTool(
    name: string,
    args: Record<string, unknown>,
    token?: string,
  ) {
    return call(
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name, arguments: args },
      },
      token,
    );
  }

  it('tools/list devuelve las 23 tools (9 lectura + 14 escritura) con los 3 scopes', async () => {
    const res = await call({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    const body = res.body as JsonRpcResponse<ToolsListResult>;
    expect(body.result!.tools).toHaveLength(23);
    const names = body.result!.tools.map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'record_transaction',
        'record_transactions_batch',
        'update_transaction',
        'delete_transaction',
        'apply_expense_template',
        'contribute_to_savings_goal',
        'create_recurring_expense',
        'update_recurring_expense',
        'delete_recurring_expense',
        'transfer_between_accounts',
        'fluxo_create',
        'fluxo_update',
        'fluxo_archive',
        'fluxo_undo',
      ]),
    );
  });

  it('record_transaction crea con source MCP y clientRequestId es idempotente', async () => {
    const res1 = await callTool('record_transaction', {
      type: 'EXPENSE',
      amount: 45.5,
      date: '2026-08-26',
      accountName: 'Principal',
      categoryName: 'Mercado',
      clientRequestId: 'e2e-idem-1',
    });
    const body1 = res1.body as JsonRpcResponse<ToolCallResult>;
    expect(body1.result!.isError).toBeFalsy();
    const tx1 = body1.result!.structuredContent!.transaction as {
      id: string;
      source: string;
      amount: number;
    };
    expect(tx1.source).toBe('MCP');
    expect(tx1.amount).toBe(45.5);
    expect(body1.result!.structuredContent!.alreadyExisted).toBe(false);

    const res2 = await callTool('record_transaction', {
      type: 'EXPENSE',
      amount: 45.5,
      date: '2026-08-26',
      accountName: 'Principal',
      categoryName: 'Mercado',
      clientRequestId: 'e2e-idem-1',
    });
    const body2 = res2.body as JsonRpcResponse<ToolCallResult>;
    const tx2 = body2.result!.structuredContent!.transaction as { id: string };
    expect(tx2.id).toBe(tx1.id);
    expect(body2.result!.structuredContent!.alreadyExisted).toBe(true);

    const count = await prisma.transaction.count({
      where: { userId, clientRequestId: 'e2e-idem-1' },
    });
    expect(count).toBe(1);
  });

  it('record_transaction rechaza montos por encima del límite configurado', async () => {
    const res = await callTool('record_transaction', {
      type: 'EXPENSE',
      amount: 9999,
      date: '2026-08-26',
      accountName: 'Principal',
      categoryName: 'Mercado',
    });
    const body = res.body as JsonRpcResponse<ToolCallResult>;
    expect(body.result!.isError).toBe(true);
    expect(body.result!.content[0].text).toContain('supera tu límite');
  });

  it('record_transaction rechaza cuando la categoría no coincide con el tipo', async () => {
    const res = await callTool('record_transaction', {
      type: 'EXPENSE',
      amount: 10,
      date: '2026-08-26',
      accountName: 'Principal',
      categoryName: 'Salario', // categoría de INCOME, transacción EXPENSE
    });
    const body = res.body as JsonRpcResponse<ToolCallResult>;
    expect(body.result!.isError).toBe(true);
    expect(body.result!.content[0].text).toContain('No encontré');
  });

  it('record_transactions_batch registra lo que puede y reporta lo que falla, sin abortar todo el batch', async () => {
    const res = await callTool('record_transactions_batch', {
      items: [
        {
          type: 'EXPENSE',
          amount: 15,
          date: '2026-08-26',
          accountName: 'Principal',
          categoryName: 'Mercado',
        },
        {
          type: 'EXPENSE',
          amount: 10,
          date: '2026-08-26',
          accountName: 'Principal',
          categoryName: 'Esta categoría no existe',
        },
      ],
    });
    const body = res.body as JsonRpcResponse<ToolCallResult>;
    expect(body.result!.isError).toBeFalsy();
    const results = body.result!.structuredContent!.results as {
      ok: boolean;
      transactionId?: string;
    }[];
    expect(results[0].ok).toBe(true);
    expect(results[1].ok).toBe(false);
    expect(body.result!.content[0].text).toContain('1 de 2');

    const tx = await prisma.transaction.findUnique({
      where: { id: results[0].transactionId },
    });
    expect(tx).not.toBeNull();
  });

  it('transfer_between_accounts mueve saldo entre cuentas sin contar como ingreso/gasto', async () => {
    const beforeRes = await callTool('get_dashboard', {});
    const beforeBody = beforeRes.body as JsonRpcResponse<ToolCallResult>;
    const before = beforeBody.result!.structuredContent as {
      totalBalance: number;
      accounts: { name: string; balance: number }[];
    };
    const principalBefore = before.accounts.find((a) =>
      a.name.includes('Principal'),
    )!.balance;
    const secundariaBefore = before.accounts.find((a) =>
      a.name.includes('Secundaria'),
    )!.balance;

    const transferRes = await callTool('transfer_between_accounts', {
      fromAccountName: 'Principal',
      toAccountName: 'Secundaria',
      amount: 100,
      date: '2026-08-26',
    });
    const transferBody = transferRes.body as JsonRpcResponse<ToolCallResult>;
    expect(transferBody.result!.isError).toBeFalsy();
    expect(transferBody.result!.content[0].text).toContain('Principal');
    expect(transferBody.result!.content[0].text).toContain('Secundaria');

    const afterRes = await callTool('get_dashboard', {});
    const afterBody = afterRes.body as JsonRpcResponse<ToolCallResult>;
    const after = afterBody.result!.structuredContent as {
      totalBalance: number;
      accounts: { name: string; balance: number }[];
    };
    const principalAfter = after.accounts.find((a) =>
      a.name.includes('Principal'),
    )!.balance;
    const secundariaAfter = after.accounts.find((a) =>
      a.name.includes('Secundaria'),
    )!.balance;

    expect(principalAfter).toBeCloseTo(principalBefore - 100);
    expect(secundariaAfter).toBeCloseTo(secundariaBefore + 100);
    expect(after.totalBalance).toBeCloseTo(before.totalBalance);

    // Una transferencia no es un gasto real: search_transactions no debe verla.
    const searchRes = await callTool('search_transactions', {
      accountName: 'Secundaria',
    });
    const searchBody = searchRes.body as JsonRpcResponse<ToolCallResult>;
    const items = searchBody.result!.structuredContent!.items as unknown[];
    expect(items).toHaveLength(0);
  }, 40000);

  it('transfer_between_accounts rechaza la misma cuenta como origen y destino', async () => {
    const res = await callTool('transfer_between_accounts', {
      fromAccountName: 'Principal',
      toAccountName: 'Principal',
      amount: 10,
      date: '2026-08-26',
    });
    const body = res.body as JsonRpcResponse<ToolCallResult>;
    expect(body.result!.isError).toBe(true);
  });

  it('update_transaction actualiza los campos indicados', async () => {
    const createRes = await callTool('record_transaction', {
      type: 'EXPENSE',
      amount: 20,
      date: '2026-08-26',
      accountName: 'Principal',
      categoryName: 'Mercado',
    });
    const createBody = createRes.body as JsonRpcResponse<ToolCallResult>;
    const txId = (
      createBody.result!.structuredContent!.transaction as { id: string }
    ).id;

    const res = await callTool('update_transaction', {
      id: txId,
      amount: 30,
      description: 'Actualizado por e2e',
    });
    const body = res.body as JsonRpcResponse<ToolCallResult>;
    expect(body.result!.isError).toBeFalsy();
    const updated = body.result!.structuredContent!.transaction as {
      amount: number;
      description: string;
    };
    expect(updated.amount).toBe(30);
    expect(updated.description).toBe('Actualizado por e2e');
  });

  it('delete_transaction exige confirm:true (error de validación del SDK)', async () => {
    const res = await callTool('delete_transaction', { id: 'cualquiera' });
    const body = res.body as JsonRpcResponse<ToolCallResult>;
    expect(body.result!.isError).toBe(true);
    expect(body.result!.content[0].text).toContain('Invalid arguments');
  });

  it('delete_transaction respeta mcpAllowDelete=false', async () => {
    const createRes = await callTool('record_transaction', {
      type: 'EXPENSE',
      amount: 5,
      date: '2026-08-26',
      accountName: 'Principal',
      categoryName: 'Mercado',
    });
    const createBody = createRes.body as JsonRpcResponse<ToolCallResult>;
    const txId = (
      createBody.result!.structuredContent!.transaction as { id: string }
    ).id;

    const res = await callTool('delete_transaction', {
      id: txId,
      confirm: true,
    });
    const body = res.body as JsonRpcResponse<ToolCallResult>;
    expect(body.result!.isError).toBe(true);
    expect(body.result!.content[0].text).toContain('deshabilitado');

    const stillExists = await prisma.transaction.findUnique({
      where: { id: txId },
    });
    expect(stillExists).not.toBeNull();
  });

  it('delete_transaction borra cuando mcpAllowDelete=true, pero protege ocurrencias RECURRING', async () => {
    const normalTx = await prisma.transaction.create({
      data: {
        userId: userId2,
        accountId: accountId2,
        categoryId: expenseCategoryId2,
        type: 'EXPENSE',
        amount: 10,
        date: new Date('2026-08-26'),
        source: 'MANUAL',
      },
    });
    const recurringTx = await prisma.transaction.create({
      data: {
        userId: userId2,
        accountId: accountId2,
        categoryId: expenseCategoryId2,
        type: 'EXPENSE',
        amount: 10,
        date: new Date('2026-08-26'),
        source: 'RECURRING',
      },
    });

    const okRes = await callTool(
      'delete_transaction',
      { id: normalTx.id, confirm: true },
      accessToken2,
    );
    const okBody = okRes.body as JsonRpcResponse<ToolCallResult>;
    expect(okBody.result!.isError).toBeFalsy();
    expect(
      await prisma.transaction.findUnique({ where: { id: normalTx.id } }),
    ).toBeNull();

    const blockedRes = await callTool(
      'delete_transaction',
      { id: recurringTx.id, confirm: true },
      accessToken2,
    );
    const blockedBody = blockedRes.body as JsonRpcResponse<ToolCallResult>;
    expect(blockedBody.result!.isError).toBe(true);
    expect(blockedBody.result!.content[0].text).toContain('regla recurrente');
    expect(
      await prisma.transaction.findUnique({ where: { id: recurringTx.id } }),
    ).not.toBeNull();
  });

  it('apply_expense_template crea una transacción con source TEMPLATE', async () => {
    const res = await callTool('apply_expense_template', {
      templateName: 'Netflix',
      date: '2026-08-26',
      amount: 15,
      clientRequestId: 'e2e-template-1',
    });
    const body = res.body as JsonRpcResponse<ToolCallResult>;
    expect(body.result!.isError).toBeFalsy();
    const tx = body.result!.structuredContent!.transaction as {
      source: string;
      expenseTemplateId: string | null;
    };
    expect(tx.source).toBe('TEMPLATE');
    expect(tx.expenseTemplateId).not.toBeNull();
  });

  it('apply_expense_template con nombre inexistente devuelve candidatas', async () => {
    const res = await callTool('apply_expense_template', {
      templateName: 'No existe esta plantilla',
      date: '2026-08-26',
    });
    const body = res.body as JsonRpcResponse<ToolCallResult>;
    expect(body.result!.isError).toBe(true);
    expect(body.result!.content[0].text).toContain('No encontré');
  });

  it('contribute_to_savings_goal registra el aporte y actualiza el progreso, sin duplicar la meta', async () => {
    const res = await callTool('contribute_to_savings_goal', {
      goalName: 'Vacaciones',
      accountName: 'Principal',
      amount: 100,
      date: '2026-08-26',
      clientRequestId: 'e2e-goal-1',
    });
    const body = res.body as JsonRpcResponse<ToolCallResult>;
    expect(body.result!.isError).toBeFalsy();
    const goal = body.result!.structuredContent!.goal as {
      progress: number;
      name: string;
    };
    expect(goal.progress).toBeGreaterThanOrEqual(100);

    const goalsCount = await prisma.savingsGoal.count({
      where: { userId, name: 'Vacaciones' },
    });
    expect(goalsCount).toBe(1);
  });

  it('create/list/update/delete_recurring_expense: ciclo completo, y get_upcoming_bills ve la ocurrencia', async () => {
    // DAILY genera ~365 filas de una (horizonte fijo de RecurringRulesService)
    // más varios round-trips encadenados — más lento que el resto de los
    // tests de este archivo, necesita más margen que el default de 20s.
    const createRes = await callTool('create_recurring_expense', {
      name: 'e2e-recurrente',
      amount: 20,
      accountName: 'Principal',
      categoryName: 'Mercado',
      type: 'EXPENSE',
      frequency: 'DAILY',
      startDate: '2026-08-01',
    });
    const createBody = createRes.body as JsonRpcResponse<ToolCallResult>;
    expect(createBody.result!.isError).toBeFalsy();
    expect(createBody.result!.content[0].text).toContain('e2e-recurrente');

    const listRes = await callTool('list_recurring_expenses', {});
    const listBody = listRes.body as JsonRpcResponse<ToolCallResult>;
    expect(listBody.result!.content[0].text).toContain('e2e-recurrente');

    const upcomingRes = await callTool('get_upcoming_bills', { days: 14 });
    const upcomingBody = upcomingRes.body as JsonRpcResponse<ToolCallResult>;
    expect(upcomingBody.result!.content[0].text).toContain('e2e-recurrente');

    const updateRes = await callTool('update_recurring_expense', {
      ruleName: 'e2e-recurrente',
      amount: 30,
    });
    const updateBody = updateRes.body as JsonRpcResponse<ToolCallResult>;
    expect(updateBody.result!.isError).toBeFalsy();
    expect(
      (updateBody.result!.structuredContent!.rule as { amount: number }).amount,
    ).toBe(30);

    const deleteNoConfirmRes = await callTool('delete_recurring_expense', {
      ruleName: 'e2e-recurrente',
    });
    const deleteNoConfirmBody =
      deleteNoConfirmRes.body as JsonRpcResponse<ToolCallResult>;
    expect(deleteNoConfirmBody.result!.isError).toBe(true);

    const deleteRes = await callTool('delete_recurring_expense', {
      ruleName: 'e2e-recurrente',
      confirm: true,
    });
    const deleteBody = deleteRes.body as JsonRpcResponse<ToolCallResult>;
    expect(deleteBody.result!.isError).toBeFalsy();

    const stillListedRes = await callTool('list_recurring_expenses', {});
    const stillListedBody =
      stillListedRes.body as JsonRpcResponse<ToolCallResult>;
    expect(stillListedBody.result!.content[0].text).not.toContain(
      'e2e-recurrente',
    );
  }, 40000);

  it('create_recurring_expense rechaza MONTHLY sin dayOfMonth (validación del schema compartido)', async () => {
    const res = await callTool('create_recurring_expense', {
      name: 'e2e-monthly-invalido',
      amount: 20,
      accountName: 'Principal',
      categoryName: 'Mercado',
      type: 'EXPENSE',
      frequency: 'MONTHLY',
      startDate: '2026-08-01',
    });
    const body = res.body as JsonRpcResponse<ToolCallResult>;
    expect(body.result!.isError).toBe(true);
  });

  it('fluxo_create/update/archive: ciclo completo sobre un asset', async () => {
    const createRes = await callTool('fluxo_create', {
      resource: 'asset',
      data: { name: 'e2e-asset', estimatedValue: 1000 },
    });
    const createBody = createRes.body as JsonRpcResponse<ToolCallResult>;
    expect(createBody.result!.isError).toBeFalsy();
    const assetId = (
      createBody.result!.structuredContent!.item as { id: string }
    ).id;

    const updateRes = await callTool('fluxo_update', {
      resource: 'asset',
      id: assetId,
      data: { estimatedValue: 2000 },
    });
    const updateBody = updateRes.body as JsonRpcResponse<ToolCallResult>;
    expect(
      (updateBody.result!.structuredContent!.item as { estimatedValue: number })
        .estimatedValue,
    ).toBe(2000);

    const archiveNoConfirmRes = await callTool('fluxo_archive', {
      resource: 'asset',
      id: assetId,
    });
    const archiveNoConfirmBody =
      archiveNoConfirmRes.body as JsonRpcResponse<ToolCallResult>;
    expect(archiveNoConfirmBody.result!.isError).toBe(true);

    const archiveRes = await callTool('fluxo_archive', {
      resource: 'asset',
      id: assetId,
      confirm: true,
    });
    const archiveBody = archiveRes.body as JsonRpcResponse<ToolCallResult>;
    expect(archiveBody.result!.structuredContent!.action).toBe('archived');
  });

  it('fluxo_create ya no ofrece recurring_rule (tiene tools dedicados)', async () => {
    const res = await callTool('fluxo_create', {
      resource: 'recurring_rule',
      data: { name: 'x' },
    });
    const body = res.body as JsonRpcResponse<ToolCallResult>;
    expect(body.result!.isError).toBe(true);
    expect(body.result!.content[0].text).toContain('Invalid arguments');
  });

  it('fluxo_create con datos inválidos devuelve un error accionable, no un 500', async () => {
    const res = await callTool('fluxo_create', {
      resource: 'asset',
      data: { estimatedValue: 1000 }, // falta "name"
    });
    expect(res.status).toBe(200);
    const body = res.body as JsonRpcResponse<ToolCallResult>;
    expect(body.result!.isError).toBe(true);
    expect(body.result!.content[0].text).toContain('Datos inválidos');
  });

  it('fluxo_undo deshace una creación reciente sin tocar', async () => {
    const createRes = await callTool('fluxo_create', {
      resource: 'asset',
      data: { name: 'e2e-undo-asset', estimatedValue: 500 },
    });
    const createBody = createRes.body as JsonRpcResponse<ToolCallResult>;
    const assetId = (
      createBody.result!.structuredContent!.item as { id: string }
    ).id;

    const undoRes = await callTool('fluxo_undo', {});
    const undoBody = undoRes.body as JsonRpcResponse<ToolCallResult>;
    expect(undoBody.result!.isError).toBeFalsy();
    expect(undoBody.result!.content[0].text).toContain(assetId);

    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    expect(asset!.isArchived).toBe(true);
  });

  it('fluxo_undo deshace una creación reciente de create_recurring_expense', async () => {
    // MONTHLY genera muchas menos filas que DAILY (~12 vs ~365 en el
    // horizonte de un año) — acá no hace falta más que eso exista.
    const createRes = await callTool('create_recurring_expense', {
      name: 'e2e-undo-recurrente',
      amount: 10,
      accountName: 'Principal',
      categoryName: 'Mercado',
      type: 'EXPENSE',
      frequency: 'MONTHLY',
      startDate: '2026-08-01',
      dayOfMonth: 1,
    });
    const createBody = createRes.body as JsonRpcResponse<ToolCallResult>;
    const ruleId = (
      createBody.result!.structuredContent!.rule as { id: string }
    ).id;

    const undoRes = await callTool('fluxo_undo', {});
    const undoBody = undoRes.body as JsonRpcResponse<ToolCallResult>;
    expect(undoBody.result!.isError).toBeFalsy();
    expect(undoBody.result!.content[0].text).toContain(ruleId);

    const rule = await prisma.recurringRule.findUnique({
      where: { id: ruleId },
    });
    expect(rule).toBeNull();
  });

  it('fluxo_undo deshace una creación reciente de transfer_between_accounts', async () => {
    const createRes = await callTool('transfer_between_accounts', {
      fromAccountName: 'Principal',
      toAccountName: 'Secundaria',
      amount: 5,
      date: '2026-08-26',
    });
    const createBody = createRes.body as JsonRpcResponse<ToolCallResult>;
    const transferId = (
      createBody.result!.structuredContent!.transfer as { id: string }
    ).id;

    const undoRes = await callTool('fluxo_undo', {});
    const undoBody = undoRes.body as JsonRpcResponse<ToolCallResult>;
    expect(undoBody.result!.isError).toBeFalsy();
    expect(undoBody.result!.content[0].text).toContain(transferId);

    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
    });
    expect(transfer).toBeNull();
  });

  it('fluxo_undo rechaza deshacer algo ya tocado después de crearse (no pisa cambios posteriores)', async () => {
    const createRes = await callTool('fluxo_create', {
      resource: 'asset',
      data: { name: 'e2e-touched-asset', estimatedValue: 500 },
    });
    const createBody = createRes.body as JsonRpcResponse<ToolCallResult>;
    const assetId = (
      createBody.result!.structuredContent!.item as { id: string }
    ).id;

    // Se toca manualmente (como si el usuario hubiera editado el activo
    // desde la app entre el create y el intento de undo).
    await callTool('fluxo_update', {
      resource: 'asset',
      id: assetId,
      data: { estimatedValue: 999 },
    });

    const undoRes = await callTool('fluxo_undo', {});
    const undoBody = undoRes.body as JsonRpcResponse<ToolCallResult>;
    expect(undoBody.result!.isError).toBe(true);
    expect(undoBody.result!.content[0].text).toContain(
      'modificó después de crearse',
    );

    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    expect(asset!.isArchived).toBe(false);
    expect(Number(asset!.estimatedValue)).toBe(999);
  });

  it('fluxo_undo con un auditId inexistente responde NOT_FOUND, no un 500', async () => {
    const res = await callTool('fluxo_undo', { auditId: 'no-existe-este-id' });
    const body = res.body as JsonRpcResponse<ToolCallResult>;
    expect(body.result!.isError).toBe(true);
    expect(body.result!.content[0].text).toContain('No encontré');
  });
});
