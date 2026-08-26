import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import type { CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { PrismaService } from '../../../prisma/prisma.service';
import { hashToken } from '../../oauth/token.util';
import { MCP_SCOPES_KEY } from '../decorators/mcp-scopes.decorator';
import type { McpScope } from '../../oauth/oauth.constants';

export interface McpAuthContext {
  tokenId: string;
  clientId: string | null;
  scopes: McpScope[];
}

declare module 'express' {
  interface Request {
    mcpAuth?: McpAuthContext;
  }
}

/**
 * Guard del endpoint MCP. Se usa junto a `@Public()` (que desarma el
 * `JwtAuthGuard` global) — este guard hace su propia validación de Bearer
 * contra `McpToken` y produce el mismo `CurrentUserPayload` que produce
 * Supabase, así que los services de dominio no necesitan saber cuál de los
 * dos guards los invocó.
 */
@Injectable()
export class McpAuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    const header = req.headers.authorization;
    const raw = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!raw) {
      this.challenge(res, 'invalid_request', 'Falta el header Authorization');
      throw new UnauthorizedException('Falta el token de acceso');
    }

    const token = await this.prisma.mcpToken.findUnique({
      where: { tokenHash: hashToken(raw) },
    });

    if (
      !token ||
      token.kind === 'OAUTH_REFRESH' ||
      token.revokedAt ||
      (token.expiresAt && token.expiresAt < new Date())
    ) {
      this.challenge(
        res,
        'invalid_token',
        'Token is invalid, expired or revoked',
      );
      throw new UnauthorizedException('Token inválido');
    }

    const resourceId = this.config.getOrThrow<string>('MCP_PUBLIC_URL');
    if (token.resource && token.resource !== resourceId) {
      // Confused-deputy: un token emitido para otro recurso no sirve acá.
      this.challenge(
        res,
        'invalid_token',
        'Token is not valid for this resource',
      );
      throw new UnauthorizedException('Token inválido para este recurso');
    }

    const requiredScopes = this.reflector.getAllAndOverride<McpScope[]>(
      MCP_SCOPES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (requiredScopes && requiredScopes.length > 0) {
      const missing = requiredScopes.filter((s) => !token.scopes.includes(s));
      if (missing.length > 0) {
        // RFC 6750 §3.1: falta de scope es 403, no 401 — el token es válido,
        // solo no alcanza para esta operación.
        res.setHeader(
          'WWW-Authenticate',
          `Bearer error="insufficient_scope", scope="${missing.join(' ')}", resource_metadata="${this.resourceMetadataUrl()}"`,
        );
        throw new ForbiddenException('insufficient_scope');
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: token.userId },
      select: { id: true, email: true, timezone: true, mcpEnabled: true },
    });
    if (!user) {
      this.challenge(res, 'invalid_token', 'El usuario del token ya no existe');
      throw new UnauthorizedException('Usuario no encontrado');
    }
    if (!user.mcpEnabled) {
      // Kill-switch: el usuario apagó el acceso MCP desde Ajustes >
      // Integraciones. Los tokens ya emitidos siguen existiendo pero dejan
      // de funcionar de inmediato — no hace falta revocarlos uno por uno.
      this.challenge(
        res,
        'invalid_token',
        'MCP access is disabled for this user',
      );
      throw new UnauthorizedException('Acceso MCP deshabilitado');
    }

    req.user = {
      id: user.id,
      email: user.email,
      timezone: user.timezone,
    } satisfies CurrentUserPayload;
    req.mcpAuth = {
      tokenId: token.id,
      clientId: token.clientId,
      scopes: token.scopes as McpScope[],
    };

    // Fire-and-forget: no bloquea la request por una actualización de auditoría menor.
    void this.prisma.mcpToken
      .update({ where: { id: token.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {});

    return true;
  }

  private resourceMetadataUrl(): string {
    return `${this.config.getOrThrow<string>('OAUTH_ISSUER')}/.well-known/oauth-protected-resource`;
  }

  private challenge(res: Response, error: string, description: string) {
    res.setHeader(
      'WWW-Authenticate',
      `Bearer realm="fluxo", error="${error}", error_description="${description}", resource_metadata="${this.resourceMetadataUrl()}"`,
    );
  }
}
