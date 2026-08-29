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

interface PromptsListResult {
  prompts: {
    name: string;
    arguments?: { name: string; required?: boolean }[];
  }[];
}

interface GetPromptResult {
  messages: { role: string; content: { type: 'text'; text: string } }[];
}

const MCP_ACCEPT = 'application/json, text/event-stream';

/**
 * Recorre el servidor MCP real (transporte + guard + las 9 tools de
 * lectura) contra la base real, con datos sembrados a mano para tener algo
 * concreto que las tools puedan devolver.
 */
describe('MCP server (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const userId = randomUUID();
  const email = `mcp-e2e-${Date.now()}@fluxo.internal`;
  let accessToken: string;
  let accountId: string;
  let categoryId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);

    await prisma.user.create({ data: { id: userId, email, mcpEnabled: true } });
    const account = await prisma.account.create({
      data: {
        userId,
        name: 'Cuenta Principal',
        type: 'BANK',
        openingBalance: 1000,
      },
    });
    accountId = account.id;
    const group = await prisma.categoryGroup.create({
      data: { userId, name: 'Alimentación', type: 'EXPENSE' },
    });
    const category = await prisma.category.create({
      data: { userId, groupId: group.id, name: 'Mercado' },
    });
    categoryId = category.id;
    await prisma.transaction.create({
      data: {
        userId,
        accountId,
        categoryId,
        type: 'EXPENSE',
        amount: 45.5,
        date: new Date(),
        description: 'Super',
      },
    });

    accessToken = 'flx_at_' + randomBytes(32).toString('base64url');
    await prisma.mcpToken.create({
      data: {
        userId,
        kind: 'OAUTH_ACCESS',
        tokenHash: createHash('sha256').update(accessToken).digest('hex'),
        prefix: accessToken.slice(0, 14),
        scopes: ['finances:read'],
        resource: 'http://localhost:3001/mcp',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
  }, 30000);

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    await app.close();
  });

  function call(body: Record<string, unknown>, token = accessToken) {
    return request(app.getHttpServer())
      .post('/mcp')
      .set('Content-Type', 'application/json')
      .set('Accept', MCP_ACCEPT)
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  }

  it('rechaza sin Authorization', async () => {
    const res = await request(app.getHttpServer())
      .post('/mcp')
      .set('Content-Type', 'application/json')
      .set('Accept', MCP_ACCEPT)
      .send({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    expect(res.status).toBe(401);
    expect(res.headers['www-authenticate']).toContain('resource_metadata');
  });

  it('rechaza con un token que no existe', async () => {
    const res = await call(
      { jsonrpc: '2.0', id: 1, method: 'tools/list' },
      'flx_at_no-existe',
    );
    expect(res.status).toBe(401);
  });

  it('GET y DELETE no están permitidos', async () => {
    await request(app.getHttpServer())
      .get('/mcp')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(405);
    await request(app.getHttpServer())
      .delete('/mcp')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(405);
  });

  it('tools/list devuelve las 9 tools de lectura sin necesitar initialize previo', async () => {
    const res = await call({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    expect(res.status).toBe(200);
    const body = res.body as JsonRpcResponse<ToolsListResult>;
    const names = body.result!.tools.map((t) => t.name).sort();
    expect(names).toEqual(
      [
        'fluxo_list',
        'fluxo_search',
        'get_budget_status',
        'get_cashflow_projection',
        'get_dashboard',
        'get_net_worth',
        'get_upcoming_bills',
        'list_recurring_expenses',
        'search_transactions',
      ].sort(),
    );
  });

  it('filtra las tools por scope: un token sin finances:write no ve tools de escritura futuras', async () => {
    // Hoy todas las tools de lectura piden finances:read, así que un token
    // con ese scope ve las 9. Esto fija el comportamiento de filtrado para
    // cuando la Fase 3 agregue tools de escritura.
    const res = await call({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    const body = res.body as JsonRpcResponse<ToolsListResult>;
    expect(body.result!.tools.length).toBe(9);
  });

  it('get_net_worth calcula correctamente a partir de los datos sembrados', async () => {
    const res = await call({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'get_net_worth', arguments: {} },
    });
    const body = res.body as JsonRpcResponse<ToolCallResult>;
    expect(body.result!.structuredContent!.netWorth).toBeCloseTo(954.5);
    expect(typeof body.result!.structuredContent!.netWorth).toBe('number');
  });

  it('search_transactions devuelve montos como number, no string (Decimal serializado)', async () => {
    const res = await call({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'search_transactions', arguments: {} },
    });
    const body = res.body as JsonRpcResponse<ToolCallResult>;
    const items = body.result!.structuredContent!.items as {
      amount: unknown;
    }[];
    expect(items).toHaveLength(1);
    expect(typeof items[0].amount).toBe('number');
    expect(items[0].amount).toBe(45.5);
  });

  // Regresión del bug reportado: el detalle (no solo el total) tiene que
  // llegar en content[0].text, porque es lo único que todo cliente MCP
  // garantiza que se inyecta al contexto del modelo — structuredContent
  // puede no llegarle nunca.
  it('search_transactions incluye el detalle de cada transacción en el texto, no solo el total', async () => {
    const res = await call({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'search_transactions', arguments: {} },
    });
    const body = res.body as JsonRpcResponse<ToolCallResult>;
    const text = body.result!.content[0].text;
    expect(text).toContain('45.50');
    expect(text).toContain('Mercado');
    expect(text).toContain('Cuenta Principal');
    expect(text).toContain('Super');
  });

  it('fluxo_list devuelve los datos sembrados y los nombra en el texto', async () => {
    const listRes = await call({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'fluxo_list', arguments: { resource: 'account' } },
    });
    const listBody = listRes.body as JsonRpcResponse<ToolCallResult>;
    const items = listBody.result!.structuredContent!.items as { id: string }[];
    expect(items.map((i) => i.id)).toContain(accountId);
    expect(listBody.result!.content[0].text).toContain('Cuenta Principal');
  });

  it('fluxo_search devuelve las coincidencias nombradas en el texto, no solo el conteo', async () => {
    const res = await call({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'fluxo_search',
        arguments: { resource: 'account', q: 'Principal' },
      },
    });
    const body = res.body as JsonRpcResponse<ToolCallResult>;
    expect(body.result!.isError).toBeFalsy();
    expect(body.result!.content[0].text).toContain('Cuenta Principal');
    expect(body.result!.content[0].text).toContain(accountId);
  });

  it('search_transactions con una categoría inexistente responde isError con candidatas, no un fallo crudo', async () => {
    const res = await call({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'search_transactions',
        arguments: { categoryName: 'Esta categoría no existe' },
      },
    });
    const body = res.body as JsonRpcResponse<ToolCallResult>;
    expect(body.result!.isError).toBe(true);
    expect(body.result!.content[0].text).toContain('No encontré');
  });

  it('search_transactions con accountName ambiguo devuelve las candidatas', async () => {
    // Crea una segunda cuenta con nombre parecido para forzar ambigüedad.
    // "Cuenta" no matchea exacto a ninguna (el match exacto tiene
    // prioridad), así que cae en la cascada de substring con las dos.
    await prisma.account.create({
      data: {
        userId,
        name: 'Cuenta Secundaria',
        type: 'CASH',
        openingBalance: 0,
      },
    });
    const res = await call({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'search_transactions',
        arguments: { accountName: 'Cuenta' },
      },
    });
    const body = res.body as JsonRpcResponse<ToolCallResult>;
    expect(body.result!.isError).toBe(true);
    expect(body.result!.content[0].text).toContain('Coincidencias posibles');
  });

  it('prompts/list devuelve los 3 prompts, cada uno con un arg "mes" opcional', async () => {
    const res = await call({ jsonrpc: '2.0', id: 1, method: 'prompts/list' });
    const body = res.body as JsonRpcResponse<PromptsListResult>;
    const names = body.result!.prompts.map((p) => p.name).sort();
    expect(names).toEqual(
      ['cierre_de_mes', 'donde_se_fue_mi_dinero', 'revision_mensual'].sort(),
    );
    for (const prompt of body.result!.prompts) {
      expect(prompt.arguments).toEqual([
        expect.objectContaining({ name: 'mes', required: false }),
      ]);
    }
  });

  it('prompts/get con mes explícito arma el mensaje con ese mes', async () => {
    const res = await call({
      jsonrpc: '2.0',
      id: 1,
      method: 'prompts/get',
      params: { name: 'revision_mensual', arguments: { mes: '2026-03' } },
    });
    const body = res.body as JsonRpcResponse<GetPromptResult>;
    expect(body.result!.messages[0].role).toBe('user');
    expect(body.result!.messages[0].content.text).toContain('2026-03');
  });

  it('prompts/get sin mes (arguments: {}) usa el mes actual', async () => {
    const res = await call({
      jsonrpc: '2.0',
      id: 1,
      method: 'prompts/get',
      params: { name: 'cierre_de_mes', arguments: {} },
    });
    const body = res.body as JsonRpcResponse<GetPromptResult>;
    expect(body.result!.messages[0].content.text).toMatch(/\d{4}-\d{2}/);
  });
});
