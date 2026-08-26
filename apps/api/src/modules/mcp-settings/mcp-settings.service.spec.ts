import { BadRequestException, NotFoundException } from '@nestjs/common';
import { McpSettingsService } from './mcp-settings.service';
import { McpToolError } from '../mcp/errors/mcp-error';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../../prisma/prisma.service';
import type { McpUndoService } from '../mcp/undo/mcp-undo.service';

interface MockPrisma {
  mcpToken: {
    findMany: jest.Mock;
    updateMany: jest.Mock;
    create: jest.Mock;
  };
  oAuthClient: { findMany: jest.Mock };
  mcpAuditLog: { findMany: jest.Mock };
}

function makePrismaMock(): MockPrisma {
  return {
    mcpToken: {
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      create: jest.fn(),
    },
    oAuthClient: { findMany: jest.fn().mockResolvedValue([]) },
    mcpAuditLog: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

function makeConfigMock(): ConfigService {
  return {
    getOrThrow: jest.fn().mockReturnValue('http://localhost:3001/mcp'),
  } as unknown as ConfigService;
}

function makeUndoServiceMock() {
  return { undo: jest.fn() };
}

function makeService(
  prisma: MockPrisma,
  undoService: ReturnType<typeof makeUndoServiceMock>,
): McpSettingsService {
  return new McpSettingsService(
    prisma as unknown as PrismaService,
    makeConfigMock(),
    undoService as unknown as McpUndoService,
  );
}

describe('McpSettingsService.listConnections', () => {
  const userId = 'user-1';

  it('agrupa tokens por clientId y resuelve el nombre desde OAuthClient', async () => {
    const prisma = makePrismaMock();
    prisma.mcpToken.findMany.mockResolvedValue([
      {
        clientId: 'client-1',
        scopes: ['finances:read'],
        createdAt: new Date('2026-01-01'),
        lastUsedAt: new Date('2026-01-02'),
      },
      {
        clientId: 'client-1',
        scopes: ['finances:write'],
        createdAt: new Date('2026-01-01T01:00:00'),
        lastUsedAt: new Date('2026-01-03'),
      },
    ]);
    prisma.oAuthClient.findMany.mockResolvedValue([
      {
        clientId: 'client-1',
        clientName: 'Claude Desktop',
        clientUri: null,
        logoUri: null,
      },
    ]);

    const service = makeService(prisma, makeUndoServiceMock());
    const result = await service.listConnections(userId);

    expect(result).toHaveLength(1);
    expect(result[0].clientName).toBe('Claude Desktop');
    expect(result[0].scopes.sort()).toEqual([
      'finances:read',
      'finances:write',
    ]);
    expect(result[0].lastUsedAt).toEqual(new Date('2026-01-03'));
  });

  it('usa el clientId como nombre si no hay OAuthClient (cliente CIMD no cacheado)', async () => {
    const prisma = makePrismaMock();
    prisma.mcpToken.findMany.mockResolvedValue([
      {
        clientId: 'https://example.com/client',
        scopes: [],
        createdAt: new Date(),
        lastUsedAt: null,
      },
    ]);
    prisma.oAuthClient.findMany.mockResolvedValue([]);

    const service = makeService(prisma, makeUndoServiceMock());
    const result = await service.listConnections(userId);

    expect(result[0].clientName).toBe('https://example.com/client');
  });
});

describe('McpSettingsService.createPat', () => {
  it('crea un PAT y devuelve el token en claro solo esta vez', async () => {
    const prisma = makePrismaMock();
    prisma.mcpToken.create.mockResolvedValue({
      id: 'pat-1',
      name: 'Mi token',
      prefix: 'flx_pat_abc123',
      scopes: ['finances:read'],
      createdAt: new Date('2026-01-01'),
      expiresAt: null,
      lastUsedAt: null,
    });

    const service = makeService(prisma, makeUndoServiceMock());
    const result = await service.createPat('user-1', {
      name: 'Mi token',
      scopes: ['finances:read'],
    });

    expect(result.token).toMatch(/^flx_pat_/);
    expect(prisma.mcpToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          kind: 'PAT',
          name: 'Mi token',
          expiresAt: null,
        }) as unknown,
      }),
    );
  });

  it('calcula expiresAt a partir de expiresInDays', async () => {
    const prisma = makePrismaMock();
    prisma.mcpToken.create.mockResolvedValue({
      id: 'pat-1',
      name: null,
      prefix: 'flx_pat_abc123',
      scopes: ['finances:read'],
      createdAt: new Date(),
      expiresAt: new Date(),
      lastUsedAt: null,
    });

    const service = makeService(prisma, makeUndoServiceMock());
    await service.createPat('user-1', {
      name: 'Temp',
      scopes: ['finances:read'],
      expiresInDays: 30,
    });

    const calls = prisma.mcpToken.create.mock.calls as {
      data: { expiresAt: Date };
    }[][];
    const expiresAt = calls[0][0].data.expiresAt;
    const daysDiff = (expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(daysDiff).toBeGreaterThan(29.9);
    expect(daysDiff).toBeLessThan(30.1);
  });
});

describe('McpSettingsService.revokePat', () => {
  it('lanza NotFoundException si no revocó ninguna fila', async () => {
    const prisma = makePrismaMock();
    prisma.mcpToken.updateMany.mockResolvedValue({ count: 0 });
    const service = makeService(prisma, makeUndoServiceMock());

    await expect(service.revokePat('user-1', 'pat-x')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('no lanza cuando revoca una fila existente', async () => {
    const prisma = makePrismaMock();
    prisma.mcpToken.updateMany.mockResolvedValue({ count: 1 });
    const service = makeService(prisma, makeUndoServiceMock());

    await expect(service.revokePat('user-1', 'pat-1')).resolves.toBeUndefined();
  });
});

describe('McpSettingsService.listActivity', () => {
  const userId = 'user-1';
  const now = new Date();

  it('resuelve clientName desde OAuthClient para tokens de apps conectadas', async () => {
    const prisma = makePrismaMock();
    prisma.mcpAuditLog.findMany.mockResolvedValue([
      {
        id: 'audit-1',
        tool: 'record_transaction',
        status: 'OK',
        errorCode: null,
        entityType: 'transaction',
        entityId: 'tx-1',
        tokenId: 'token-1',
        durationMs: 12,
        undoneAt: null,
        createdAt: now,
      },
    ]);
    prisma.mcpToken.findMany.mockResolvedValue([
      { id: 'token-1', clientId: 'client-1', name: null, kind: 'OAUTH_ACCESS' },
    ]);
    prisma.oAuthClient.findMany.mockResolvedValue([
      { clientId: 'client-1', clientName: 'Claude Desktop' },
    ]);

    const service = makeService(prisma, makeUndoServiceMock());
    const { items } = await service.listActivity(userId);

    expect(items[0].clientName).toBe('Claude Desktop');
    expect(items[0].canUndo).toBe(true);
  });

  it('usa el nombre del PAT como clientName cuando el token no tiene clientId', async () => {
    const prisma = makePrismaMock();
    prisma.mcpAuditLog.findMany.mockResolvedValue([
      {
        id: 'audit-1',
        tool: 'fluxo_list',
        status: 'OK',
        errorCode: null,
        entityType: null,
        entityId: null,
        tokenId: 'token-1',
        durationMs: 5,
        undoneAt: null,
        createdAt: now,
      },
    ]);
    prisma.mcpToken.findMany.mockResolvedValue([
      { id: 'token-1', clientId: null, name: 'Mi laptop', kind: 'PAT' },
    ]);

    const service = makeService(prisma, makeUndoServiceMock());
    const { items } = await service.listActivity(userId);

    expect(items[0].clientName).toBe('Mi laptop');
    // fluxo_list no está en UNDOABLE_TOOLS y no dejó entidad — no se puede deshacer.
    expect(items[0].canUndo).toBe(false);
  });

  it('canUndo es false si ya fue deshecho, si el status no es OK, o si pasaron más de 24h', async () => {
    const prisma = makePrismaMock();
    const stale = new Date(now.getTime() - 25 * 60 * 60 * 1000);
    prisma.mcpAuditLog.findMany.mockResolvedValue([
      {
        id: 'audit-undone',
        tool: 'record_transaction',
        status: 'OK',
        errorCode: null,
        entityType: 'transaction',
        entityId: 'tx-1',
        tokenId: null,
        durationMs: 1,
        undoneAt: now,
        createdAt: now,
      },
      {
        id: 'audit-error',
        tool: 'record_transaction',
        status: 'ERROR',
        errorCode: 'VALIDATION',
        entityType: null,
        entityId: null,
        tokenId: null,
        durationMs: 1,
        undoneAt: null,
        createdAt: now,
      },
      {
        id: 'audit-stale',
        tool: 'record_transaction',
        status: 'OK',
        errorCode: null,
        entityType: 'transaction',
        entityId: 'tx-2',
        tokenId: null,
        durationMs: 1,
        undoneAt: null,
        createdAt: stale,
      },
    ]);

    const service = makeService(prisma, makeUndoServiceMock());
    const { items } = await service.listActivity(userId);

    expect(items.every((i) => i.canUndo === false)).toBe(true);
  });
});

describe('McpSettingsService.undo', () => {
  it('traduce NOT_FOUND de McpToolError a NotFoundException', async () => {
    const prisma = makePrismaMock();
    const undoService = makeUndoServiceMock();
    undoService.undo.mockRejectedValue(
      new McpToolError('NOT_FOUND', 'no existe'),
    );
    const service = makeService(prisma, undoService);

    await expect(service.undo('user-1', 'audit-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('traduce VALIDATION de McpToolError a BadRequestException', async () => {
    const prisma = makePrismaMock();
    const undoService = makeUndoServiceMock();
    undoService.undo.mockRejectedValue(
      new McpToolError('VALIDATION', 'ya se deshizo'),
    );
    const service = makeService(prisma, undoService);

    await expect(service.undo('user-1', 'audit-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('deja pasar errores que no son McpToolError tal cual', async () => {
    const prisma = makePrismaMock();
    const undoService = makeUndoServiceMock();
    const genericError = new Error('boom');
    undoService.undo.mockRejectedValue(genericError);
    const service = makeService(prisma, undoService);

    await expect(service.undo('user-1', 'audit-1')).rejects.toThrow('boom');
  });
});
