import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { McpToolError } from '../errors/mcp-error';

export interface McpPolicy {
  maxTransactionAmount: number | null;
  allowDelete: boolean;
  allowConfigWrite: boolean;
}

/**
 * Límites duros configurables por el usuario para lo que un agente puede
 * escribir. Todo aquí es "negar", nunca "permitir de más" — si el usuario
 * no configuró nada, los defaults (sin límite de monto, sin borrado, con
 * escritura de configuración) son los que ya trae la tabla `User`.
 */
@Injectable()
export class McpPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async getPolicy(userId: string): Promise<McpPolicy> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        mcpMaxTransactionAmount: true,
        mcpAllowDelete: true,
        mcpAllowConfigWrite: true,
      },
    });
    return {
      maxTransactionAmount:
        user.mcpMaxTransactionAmount != null
          ? Number(user.mcpMaxTransactionAmount)
          : null,
      allowDelete: user.mcpAllowDelete,
      allowConfigWrite: user.mcpAllowConfigWrite,
    };
  }

  assertAmountWithinLimit(policy: McpPolicy, amount: number): void {
    if (
      policy.maxTransactionAmount != null &&
      amount > policy.maxTransactionAmount
    ) {
      throw new McpToolError(
        'VALIDATION',
        `El monto ${amount.toFixed(2)} supera tu límite configurado de ${policy.maxTransactionAmount.toFixed(2)} por operación vía agente. Regístralo desde la app, o subí el límite en Ajustes > Integraciones.`,
      );
    }
  }

  assertDeleteAllowed(policy: McpPolicy): void {
    if (!policy.allowDelete) {
      throw new McpToolError(
        'VALIDATION',
        'Borrar transacciones vía agente está deshabilitado. Activalo en Ajustes > Integraciones si querés permitirlo, o borrala desde la app.',
      );
    }
  }

  assertConfigWriteAllowed(policy: McpPolicy): void {
    if (!policy.allowConfigWrite) {
      throw new McpToolError(
        'VALIDATION',
        'Crear o editar configuración (cuentas, categorías, reglas, etc.) vía agente está deshabilitado. Activalo en Ajustes > Integraciones si querés permitirlo.',
      );
    }
  }
}
