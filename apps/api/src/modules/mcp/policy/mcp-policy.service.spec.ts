import { McpPolicyService, type McpPolicy } from './mcp-policy.service';
import { McpToolError } from '../errors/mcp-error';
import type { PrismaService } from '../../../prisma/prisma.service';

interface MockPrisma {
  user: { findUniqueOrThrow: jest.Mock };
}

function makePrismaMock(): MockPrisma {
  return { user: { findUniqueOrThrow: jest.fn() } };
}

function makeService(prisma: MockPrisma): McpPolicyService {
  return new McpPolicyService(prisma as unknown as PrismaService);
}

describe('McpPolicyService.getPolicy', () => {
  const userId = 'user-1';

  it('convierte el Decimal de maxTransactionAmount a number', async () => {
    const prisma = makePrismaMock();
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      mcpMaxTransactionAmount: { toString: () => '500' } as unknown,
      mcpAllowDelete: false,
      mcpAllowConfigWrite: true,
    });
    const service = makeService(prisma);

    const policy = await service.getPolicy(userId);

    expect(policy.maxTransactionAmount).toBe(500);
  });

  it('deja maxTransactionAmount en null cuando no hay límite configurado', async () => {
    const prisma = makePrismaMock();
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      mcpMaxTransactionAmount: null,
      mcpAllowDelete: false,
      mcpAllowConfigWrite: true,
    });
    const service = makeService(prisma);

    const policy = await service.getPolicy(userId);

    expect(policy.maxTransactionAmount).toBeNull();
  });
});

describe('McpPolicyService.assertAmountWithinLimit', () => {
  const service = makeService(makePrismaMock());

  it('no lanza cuando no hay límite configurado', () => {
    const policy: McpPolicy = {
      maxTransactionAmount: null,
      allowDelete: false,
      allowConfigWrite: true,
    };
    expect(() => service.assertAmountWithinLimit(policy, 999999)).not.toThrow();
  });

  it('no lanza cuando el monto está dentro del límite', () => {
    const policy: McpPolicy = {
      maxTransactionAmount: 500,
      allowDelete: false,
      allowConfigWrite: true,
    };
    expect(() => service.assertAmountWithinLimit(policy, 500)).not.toThrow();
  });

  it('lanza McpToolError cuando el monto supera el límite', () => {
    const policy: McpPolicy = {
      maxTransactionAmount: 500,
      allowDelete: false,
      allowConfigWrite: true,
    };
    expect(() => service.assertAmountWithinLimit(policy, 500.01)).toThrow(
      McpToolError,
    );
  });
});

describe('McpPolicyService.assertDeleteAllowed', () => {
  const service = makeService(makePrismaMock());

  it('lanza cuando allowDelete es false', () => {
    const policy: McpPolicy = {
      maxTransactionAmount: null,
      allowDelete: false,
      allowConfigWrite: true,
    };
    expect(() => service.assertDeleteAllowed(policy)).toThrow(McpToolError);
  });

  it('no lanza cuando allowDelete es true', () => {
    const policy: McpPolicy = {
      maxTransactionAmount: null,
      allowDelete: true,
      allowConfigWrite: true,
    };
    expect(() => service.assertDeleteAllowed(policy)).not.toThrow();
  });
});

describe('McpPolicyService.assertConfigWriteAllowed', () => {
  const service = makeService(makePrismaMock());

  it('lanza cuando allowConfigWrite es false', () => {
    const policy: McpPolicy = {
      maxTransactionAmount: null,
      allowDelete: false,
      allowConfigWrite: false,
    };
    expect(() => service.assertConfigWriteAllowed(policy)).toThrow(
      McpToolError,
    );
  });

  it('no lanza cuando allowConfigWrite es true', () => {
    const policy: McpPolicy = {
      maxTransactionAmount: null,
      allowDelete: false,
      allowConfigWrite: true,
    };
    expect(() => service.assertConfigWriteAllowed(policy)).not.toThrow();
  });
});
