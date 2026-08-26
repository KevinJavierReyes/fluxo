import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { McpTokenKind } from '@prisma/client';
import type { CreatePatInput } from '@fluxo/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { generateOpaqueToken } from '../oauth/token.util';
import { TOKEN_PREFIX } from '../oauth/oauth.constants';
import { McpToolError } from '../mcp/errors/mcp-error';
import { McpUndoService, UNDOABLE_TOOLS } from '../mcp/undo/mcp-undo.service';

const UNDO_WINDOW_MS = 24 * 60 * 60 * 1000;
// La web todavía no tiene "cargar más" para este log — un límite generoso
// cubre el uso típico sin necesitar paginación real por ahora.
const ACTIVITY_PAGE_SIZE = 100;

export interface ConnectionSummary {
  clientId: string;
  clientName: string;
  clientUri: string | null;
  logoUri: string | null;
  scopes: string[];
  connectedAt: Date;
  lastUsedAt: Date | null;
}

export interface PatSummary {
  id: string;
  name: string | null;
  prefix: string;
  scopes: string[];
  createdAt: Date;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
}

export interface ActivityEntry {
  id: string;
  tool: string;
  status: string;
  errorCode: string | null;
  entityType: string | null;
  entityId: string | null;
  clientName: string | null;
  durationMs: number | null;
  undoneAt: Date | null;
  canUndo: boolean;
  createdAt: Date;
}

/**
 * Datos para la vista de administración de MCP (Ajustes > Integraciones):
 * conexiones OAuth activas, tokens personales (PAT), y el log de actividad
 * con su botón Deshacer. Todo protegido por el guard global de Supabase —
 * es el propio dueño de los datos gestionando su acceso, no un agente.
 */
@Injectable()
export class McpSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly undoService: McpUndoService,
  ) {}

  async listConnections(userId: string): Promise<ConnectionSummary[]> {
    const tokens = await this.prisma.mcpToken.findMany({
      where: { userId, clientId: { not: null }, revokedAt: null },
      orderBy: { createdAt: 'asc' },
    });

    const byClient = new Map<string, typeof tokens>();
    for (const token of tokens) {
      const clientId = token.clientId!;
      const group = byClient.get(clientId) ?? [];
      group.push(token);
      byClient.set(clientId, group);
    }

    const clientIds = [...byClient.keys()];
    const clients = clientIds.length
      ? await this.prisma.oAuthClient.findMany({
          where: { clientId: { in: clientIds } },
        })
      : [];
    const clientById = new Map(clients.map((c) => [c.clientId, c]));

    return clientIds.map((clientId) => {
      const group = byClient.get(clientId)!;
      const client = clientById.get(clientId);
      const scopes = [...new Set(group.flatMap((t) => t.scopes))];
      const lastUsedAt = group.reduce<Date | null>(
        (max, t) =>
          t.lastUsedAt && (!max || t.lastUsedAt > max) ? t.lastUsedAt : max,
        null,
      );
      return {
        clientId,
        clientName: client?.clientName ?? clientId,
        clientUri: client?.clientUri ?? null,
        logoUri: client?.logoUri ?? null,
        scopes,
        connectedAt: group[0].createdAt,
        lastUsedAt,
      };
    });
  }

  async disconnect(userId: string, clientId: string): Promise<void> {
    await this.prisma.mcpToken.updateMany({
      where: { userId, clientId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async listPats(userId: string): Promise<PatSummary[]> {
    return this.prisma.mcpToken.findMany({
      where: { userId, kind: McpTokenKind.PAT, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        prefix: true,
        scopes: true,
        createdAt: true,
        expiresAt: true,
        lastUsedAt: true,
      },
    });
  }

  async createPat(
    userId: string,
    dto: CreatePatInput,
  ): Promise<PatSummary & { token: string }> {
    const { raw, hash, displayPrefix } = generateOpaqueToken(TOKEN_PREFIX.PAT);
    const token = await this.prisma.mcpToken.create({
      data: {
        userId,
        kind: McpTokenKind.PAT,
        tokenHash: hash,
        prefix: displayPrefix,
        name: dto.name,
        scopes: dto.scopes,
        resource: this.config.getOrThrow<string>('MCP_PUBLIC_URL'),
        expiresAt: dto.expiresInDays
          ? new Date(Date.now() + dto.expiresInDays * 24 * 60 * 60 * 1000)
          : null,
      },
    });
    return {
      id: token.id,
      // Única vez que el valor en claro sale de la base — nunca se puede
      // volver a consultar después de esta respuesta.
      token: raw,
      name: token.name,
      prefix: token.prefix,
      scopes: token.scopes,
      createdAt: token.createdAt,
      expiresAt: token.expiresAt,
      lastUsedAt: token.lastUsedAt,
    };
  }

  async revokePat(userId: string, id: string): Promise<void> {
    const result = await this.prisma.mcpToken.updateMany({
      where: { id, userId, kind: McpTokenKind.PAT, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (result.count === 0) {
      throw new NotFoundException('Token no encontrado');
    }
  }

  async listActivity(
    userId: string,
    cursor?: string,
  ): Promise<{
    items: ActivityEntry[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    const rows = await this.prisma.mcpAuditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: ACTIVITY_PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > ACTIVITY_PAGE_SIZE;
    const rowsPage = hasMore ? rows.slice(0, ACTIVITY_PAGE_SIZE) : rows;

    const tokenIds = [
      ...new Set(
        rowsPage
          .map((r) => r.tokenId)
          .filter((id): id is string => id !== null),
      ),
    ];
    const tokens = tokenIds.length
      ? await this.prisma.mcpToken.findMany({
          where: { id: { in: tokenIds } },
          select: { id: true, clientId: true, name: true, kind: true },
        })
      : [];
    const tokenById = new Map(tokens.map((t) => [t.id, t]));

    const clientIds = [
      ...new Set(
        tokens.map((t) => t.clientId).filter((id): id is string => id !== null),
      ),
    ];
    const clients = clientIds.length
      ? await this.prisma.oAuthClient.findMany({
          where: { clientId: { in: clientIds } },
          select: { clientId: true, clientName: true },
        })
      : [];
    const clientNameByClientId = new Map(
      clients.map((c) => [c.clientId, c.clientName]),
    );

    const now = Date.now();
    const items: ActivityEntry[] = rowsPage.map((row) => {
      const token = row.tokenId ? tokenById.get(row.tokenId) : undefined;
      const clientName = token
        ? ((token.clientId
            ? clientNameByClientId.get(token.clientId)
            : undefined) ??
          (token.kind === McpTokenKind.PAT
            ? (token.name ?? 'Token personal')
            : null))
        : null;

      const canUndo =
        row.status === 'OK' &&
        !row.undoneAt &&
        UNDOABLE_TOOLS.includes(row.tool) &&
        Boolean(row.entityType && row.entityId) &&
        now - row.createdAt.getTime() < UNDO_WINDOW_MS;

      return {
        id: row.id,
        tool: row.tool,
        status: row.status,
        errorCode: row.errorCode,
        entityType: row.entityType,
        entityId: row.entityId,
        clientName: clientName ?? null,
        durationMs: row.durationMs,
        undoneAt: row.undoneAt,
        canUndo,
        createdAt: row.createdAt,
      };
    });

    return {
      items,
      nextCursor: hasMore ? rowsPage[rowsPage.length - 1].id : null,
      hasMore,
    };
  }

  async undo(userId: string, auditId: string) {
    try {
      return await this.undoService.undo(userId, auditId);
    } catch (error) {
      // McpUndoService lanza McpToolError (pensado para el transporte MCP,
      // un simple Error) — acá hace falta el status HTTP correcto para que
      // el botón Deshacer de la web pueda mostrar el mensaje en vez de un
      // 500 genérico.
      if (error instanceof McpToolError) {
        if (error.code === 'NOT_FOUND') {
          throw new NotFoundException(error.message);
        }
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
