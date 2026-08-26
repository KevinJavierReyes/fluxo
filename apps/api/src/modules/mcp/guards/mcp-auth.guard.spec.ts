import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { McpAuthGuard } from './mcp-auth.guard';
import { hashToken } from '../../oauth/token.util';
import type { ConfigService } from '@nestjs/config';
import type { Reflector } from '@nestjs/core';
import type { PrismaService } from '../../../prisma/prisma.service';

interface MockPrisma {
  mcpToken: { findUnique: jest.Mock; update: jest.Mock };
  user: { findUnique: jest.Mock };
}

function makePrismaMock(): MockPrisma {
  return {
    mcpToken: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    user: { findUnique: jest.fn() },
  };
}

const CONFIG_VALUES: Record<string, string> = {
  MCP_PUBLIC_URL: 'https://api.fluxo.test/mcp',
  OAUTH_ISSUER: 'https://api.fluxo.test',
};

function makeConfigMock(): ConfigService {
  return {
    getOrThrow: jest.fn((key: string) => CONFIG_VALUES[key]),
  } as unknown as ConfigService;
}

function makeReflectorMock(requiredScopes: string[] | undefined): Reflector {
  return {
    getAllAndOverride: jest.fn().mockReturnValue(requiredScopes),
  } as unknown as Reflector;
}

function makeContext(headers: Record<string, string>) {
  const req: {
    headers: Record<string, string>;
    user?: unknown;
    mcpAuth?: unknown;
  } = {
    headers,
  };
  const setHeader = jest.fn();
  const res = { setHeader };
  const context = {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
  return { context, req, res };
}

function makeGuard(prisma: MockPrisma, requiredScopes?: string[]) {
  return new McpAuthGuard(
    prisma as unknown as PrismaService,
    makeConfigMock(),
    makeReflectorMock(requiredScopes),
  );
}

describe('McpAuthGuard', () => {
  it('rechaza sin header Authorization, con WWW-Authenticate error="invalid_request"', async () => {
    const prisma = makePrismaMock();
    const guard = makeGuard(prisma);
    const { context, res } = makeContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'WWW-Authenticate',
      expect.stringContaining('error="invalid_request"'),
    );
  });

  it('rechaza un token que no existe en la base', async () => {
    const prisma = makePrismaMock();
    prisma.mcpToken.findUnique.mockResolvedValue(null);
    const guard = makeGuard(prisma);
    const { context, res } = makeContext({
      authorization: 'Bearer flx_at_algo',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'WWW-Authenticate',
      expect.stringContaining('error="invalid_token"'),
    );
  });

  it('rechaza un token revocado', async () => {
    const prisma = makePrismaMock();
    prisma.mcpToken.findUnique.mockResolvedValue({
      kind: 'OAUTH_ACCESS',
      revokedAt: new Date(),
      resource: 'https://api.fluxo.test/mcp',
      scopes: [],
    });
    const guard = makeGuard(prisma);
    const { context } = makeContext({ authorization: 'Bearer flx_at_algo' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rechaza un token expirado', async () => {
    const prisma = makePrismaMock();
    prisma.mcpToken.findUnique.mockResolvedValue({
      kind: 'OAUTH_ACCESS',
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000),
      resource: 'https://api.fluxo.test/mcp',
      scopes: [],
    });
    const guard = makeGuard(prisma);
    const { context } = makeContext({ authorization: 'Bearer flx_at_algo' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rechaza un refresh token usado como token de acceso', async () => {
    const prisma = makePrismaMock();
    prisma.mcpToken.findUnique.mockResolvedValue({
      kind: 'OAUTH_REFRESH',
      revokedAt: null,
      resource: 'https://api.fluxo.test/mcp',
      scopes: [],
    });
    const guard = makeGuard(prisma);
    const { context } = makeContext({ authorization: 'Bearer flx_rt_algo' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rechaza un token emitido para otro recurso (confused deputy)', async () => {
    const prisma = makePrismaMock();
    prisma.mcpToken.findUnique.mockResolvedValue({
      kind: 'OAUTH_ACCESS',
      revokedAt: null,
      expiresAt: null,
      resource: 'https://otro-servidor-mcp.test/mcp',
      scopes: [],
    });
    const guard = makeGuard(prisma);
    const { context } = makeContext({ authorization: 'Bearer flx_at_algo' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rechaza con 403 (no 401) cuando el token es válido pero le falta un scope', async () => {
    const prisma = makePrismaMock();
    prisma.mcpToken.findUnique.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      kind: 'OAUTH_ACCESS',
      revokedAt: null,
      expiresAt: null,
      resource: 'https://api.fluxo.test/mcp',
      clientId: 'client-1',
      scopes: ['finances:read'],
    });
    const guard = makeGuard(prisma, ['finances:write']);
    const { context, res } = makeContext({
      authorization: 'Bearer flx_at_algo',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'WWW-Authenticate',
      expect.stringContaining('error="insufficient_scope"'),
    );
  });

  it('rechaza cuando el usuario del token ya no existe', async () => {
    const prisma = makePrismaMock();
    prisma.mcpToken.findUnique.mockResolvedValue({
      id: 'token-1',
      userId: 'user-borrado',
      kind: 'OAUTH_ACCESS',
      revokedAt: null,
      expiresAt: null,
      resource: 'https://api.fluxo.test/mcp',
      clientId: 'client-1',
      scopes: [],
    });
    prisma.user.findUnique.mockResolvedValue(null);
    const guard = makeGuard(prisma);
    const { context } = makeContext({ authorization: 'Bearer flx_at_algo' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rechaza cuando el usuario deshabilitó el acceso MCP (kill-switch)', async () => {
    const prisma = makePrismaMock();
    prisma.mcpToken.findUnique.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      kind: 'OAUTH_ACCESS',
      revokedAt: null,
      expiresAt: null,
      resource: 'https://api.fluxo.test/mcp',
      clientId: 'client-1',
      scopes: [],
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'a@b.com',
      timezone: 'UTC',
      mcpEnabled: false,
    });
    const guard = makeGuard(prisma);
    const { context } = makeContext({ authorization: 'Bearer flx_at_algo' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('acepta un token válido con el scope requerido y adjunta user + mcpAuth a la request', async () => {
    const prisma = makePrismaMock();
    prisma.mcpToken.findUnique.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      kind: 'OAUTH_ACCESS',
      revokedAt: null,
      expiresAt: null,
      resource: 'https://api.fluxo.test/mcp',
      clientId: 'client-1',
      scopes: ['finances:read', 'finances:write'],
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'a@b.com',
      timezone: 'America/Lima',
      mcpEnabled: true,
    });
    const guard = makeGuard(prisma, ['finances:write']);
    const { context, req } = makeContext({
      authorization: 'Bearer flx_at_algo',
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(req.user).toEqual({
      id: 'user-1',
      email: 'a@b.com',
      timezone: 'America/Lima',
    });
    expect(req.mcpAuth).toEqual({
      tokenId: 'token-1',
      clientId: 'client-1',
      scopes: ['finances:read', 'finances:write'],
    });
  });

  it('busca el token por su hash, nunca por el valor en claro', async () => {
    const prisma = makePrismaMock();
    prisma.mcpToken.findUnique.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      kind: 'OAUTH_ACCESS',
      revokedAt: null,
      expiresAt: null,
      resource: 'https://api.fluxo.test/mcp',
      clientId: null,
      scopes: [],
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'a@b.com',
      timezone: 'UTC',
      mcpEnabled: true,
    });
    const guard = makeGuard(prisma);
    const raw = 'flx_pat_secreto-en-claro';
    const { context } = makeContext({ authorization: `Bearer ${raw}` });

    await guard.canActivate(context);

    expect(prisma.mcpToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: hashToken(raw) },
    });
  });
});
