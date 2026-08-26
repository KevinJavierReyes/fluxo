import { UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { OAuthService } from './oauth.service';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../../prisma/prisma.service';
import type { OAuthClientService } from './oauth-client.service';

function s256(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

interface MockPrisma {
  oAuthAuthorizationCode: {
    updateMany: jest.Mock;
    findUnique: jest.Mock;
  };
  mcpToken: {
    updateMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  $transaction: jest.Mock;
}

function makePrismaMock(): MockPrisma {
  return {
    oAuthAuthorizationCode: {
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
    mcpToken: {
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest
        .fn()
        .mockImplementation((args: { data: unknown }) =>
          Promise.resolve({ id: 'token-id', ...(args.data as object) }),
        ),
      update: jest.fn(),
    },
    $transaction: jest.fn((arg: unknown) =>
      Array.isArray(arg) ? Promise.all(arg) : (arg as () => unknown)(),
    ),
  };
}

const CONFIG_VALUES: Record<string, string> = {
  OAUTH_ISSUER: 'https://api.fluxo.test',
  MCP_PUBLIC_URL: 'https://api.fluxo.test/mcp',
  MCP_CONSENT_URL: 'https://fluxo.test/oauth/consent',
};

function makeConfigMock(): ConfigService {
  return {
    getOrThrow: jest.fn((key: string) => CONFIG_VALUES[key]),
  } as unknown as ConfigService;
}

function makeService(prisma: MockPrisma) {
  const clientService = {} as OAuthClientService;
  return new OAuthService(
    prisma as unknown as PrismaService,
    makeConfigMock(),
    clientService,
  );
}

describe('OAuthService.exchangeToken — authorization_code', () => {
  it('revoca todos los tokens del cliente cuando detecta un code ya consumido (replay)', async () => {
    const prisma = makePrismaMock();
    prisma.oAuthAuthorizationCode.updateMany.mockResolvedValue({ count: 0 });
    prisma.oAuthAuthorizationCode.findUnique.mockResolvedValue({
      userId: 'user-1',
      clientId: 'client-1',
      consumedAt: new Date(), // ya estaba consumido -> es un replay
    });
    const service = makeService(prisma);

    await expect(
      service.exchangeToken({
        grant_type: 'authorization_code',
        code: 'some-code',
        redirect_uri: 'https://client.test/cb',
        code_verifier: 'verifier',
        client_id: 'client-1',
      }),
    ).rejects.toThrow(UnauthorizedException);

    expect(prisma.mcpToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', clientId: 'client-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) as Date },
    });
  });

  it('rechaza sin revocar nada cuando el code simplemente no existe (no es replay)', async () => {
    const prisma = makePrismaMock();
    prisma.oAuthAuthorizationCode.updateMany.mockResolvedValue({ count: 0 });
    prisma.oAuthAuthorizationCode.findUnique.mockResolvedValue(null);
    const service = makeService(prisma);

    await expect(
      service.exchangeToken({
        grant_type: 'authorization_code',
        code: 'no-existe',
        redirect_uri: 'https://client.test/cb',
        code_verifier: 'verifier',
        client_id: 'client-1',
      }),
    ).rejects.toThrow(UnauthorizedException);

    expect(prisma.mcpToken.updateMany).not.toHaveBeenCalled();
  });

  it('rechaza cuando el code_verifier no coincide con el code_challenge (PKCE)', async () => {
    const prisma = makePrismaMock();
    const verifier = 'a'.repeat(43);
    prisma.oAuthAuthorizationCode.updateMany.mockResolvedValue({ count: 1 });
    prisma.oAuthAuthorizationCode.findUnique.mockResolvedValue({
      userId: 'user-1',
      clientId: 'client-1',
      redirectUri: 'https://client.test/cb',
      resource: 'https://api.fluxo.test/mcp',
      codeChallenge: s256(verifier),
      codeChallengeMethod: 'S256',
      consumedAt: new Date(),
      scopes: ['finances:read'],
    });
    const service = makeService(prisma);

    await expect(
      service.exchangeToken({
        grant_type: 'authorization_code',
        code: 'the-code',
        redirect_uri: 'https://client.test/cb',
        code_verifier: 'verifier-incorrecto-pero-largo-para-pasar-el-formato',
        client_id: 'client-1',
      }),
    ).rejects.toThrow(UnauthorizedException);

    expect(prisma.mcpToken.create).not.toHaveBeenCalled();
  });

  it('emite access + refresh token cuando todo es válido', async () => {
    const prisma = makePrismaMock();
    const verifier = 'a'.repeat(43);
    prisma.oAuthAuthorizationCode.updateMany.mockResolvedValue({ count: 1 });
    prisma.oAuthAuthorizationCode.findUnique.mockResolvedValue({
      userId: 'user-1',
      clientId: 'client-1',
      redirectUri: 'https://client.test/cb',
      resource: 'https://api.fluxo.test/mcp',
      codeChallenge: s256(verifier),
      codeChallengeMethod: 'S256',
      consumedAt: new Date(),
      scopes: ['finances:read'],
    });
    const service = makeService(prisma);

    const result = await service.exchangeToken({
      grant_type: 'authorization_code',
      code: 'the-code',
      redirect_uri: 'https://client.test/cb',
      code_verifier: verifier,
      client_id: 'client-1',
    });

    expect(result.token_type).toBe('Bearer');
    expect(result.access_token).toMatch(/^flx_at_/);
    expect(result.refresh_token).toMatch(/^flx_rt_/);
    expect(result.scope).toBe('finances:read');
    expect(prisma.mcpToken.create).toHaveBeenCalledTimes(2);
  });

  it('rechaza cuando el client_id no coincide con el del code (confused deputy)', async () => {
    const prisma = makePrismaMock();
    prisma.oAuthAuthorizationCode.updateMany.mockResolvedValue({ count: 1 });
    prisma.oAuthAuthorizationCode.findUnique.mockResolvedValue({
      userId: 'user-1',
      clientId: 'client-legitimo',
      redirectUri: 'https://client.test/cb',
      resource: 'https://api.fluxo.test/mcp',
      codeChallenge: s256('a'.repeat(43)),
      codeChallengeMethod: 'S256',
      consumedAt: new Date(),
      scopes: ['finances:read'],
    });
    const service = makeService(prisma);

    await expect(
      service.exchangeToken({
        grant_type: 'authorization_code',
        code: 'the-code',
        redirect_uri: 'https://client.test/cb',
        code_verifier: 'a'.repeat(43),
        client_id: 'client-atacante',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});

describe('OAuthService.exchangeToken — refresh_token', () => {
  it('revoca todos los tokens del cliente cuando reusa un refresh token ya revocado (replay)', async () => {
    const prisma = makePrismaMock();
    prisma.mcpToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      kind: 'OAUTH_REFRESH',
      revokedAt: new Date(), // ya estaba revocado -> reuso = robo
      userId: 'user-1',
      clientId: 'client-1',
      expiresAt: new Date(Date.now() + 1000 * 60),
      scopes: ['finances:read'],
      resource: 'https://api.fluxo.test/mcp',
    });
    const service = makeService(prisma);

    await expect(
      service.exchangeToken({
        grant_type: 'refresh_token',
        refresh_token: 'raw-refresh-token-value',
        client_id: 'client-1',
      }),
    ).rejects.toThrow(UnauthorizedException);

    expect(prisma.mcpToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', clientId: 'client-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) as Date },
    });
    expect(prisma.mcpToken.create).not.toHaveBeenCalled();
  });

  it('rota el refresh token: revoca el viejo y emite un par nuevo enlazado', async () => {
    const prisma = makePrismaMock();
    prisma.mcpToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      kind: 'OAUTH_REFRESH',
      revokedAt: null,
      userId: 'user-1',
      clientId: 'client-1',
      expiresAt: new Date(Date.now() + 1000 * 60),
      scopes: ['finances:read', 'finances:write'],
      resource: 'https://api.fluxo.test/mcp',
    });
    const service = makeService(prisma);

    const result = await service.exchangeToken({
      grant_type: 'refresh_token',
      refresh_token: 'raw-refresh-token-value',
      client_id: 'client-1',
    });

    expect(prisma.mcpToken.update).toHaveBeenCalledWith({
      where: { id: 'rt-1' },
      data: { revokedAt: expect.any(Date) as Date },
    });
    expect(result.access_token).toMatch(/^flx_at_/);
    expect(result.refresh_token).toMatch(/^flx_rt_/);

    const refreshCreateCall = prisma.mcpToken.create.mock.calls.find(
      (call: [{ data: { kind: string } }]) =>
        call[0].data.kind === 'OAUTH_REFRESH',
    ) as [{ data: { parentTokenId: string } }];
    expect(refreshCreateCall[0].data.parentTokenId).toBe('rt-1');
  });

  it('rechaza un refresh token expirado', async () => {
    const prisma = makePrismaMock();
    prisma.mcpToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      kind: 'OAUTH_REFRESH',
      revokedAt: null,
      userId: 'user-1',
      clientId: 'client-1',
      expiresAt: new Date(Date.now() - 1000), // ya expiró
      scopes: ['finances:read'],
      resource: 'https://api.fluxo.test/mcp',
    });
    const service = makeService(prisma);

    await expect(
      service.exchangeToken({
        grant_type: 'refresh_token',
        refresh_token: 'raw-refresh-token-value',
        client_id: 'client-1',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});

// El valor exacto del refresh token raw es irrelevante en estos tests: el
// mock de `mcpToken.findUnique` ignora el `where` y siempre devuelve el
// mismo registro fijado en cada test, así que no hace falta hacerlo
// coincidir con ningún hash real.
