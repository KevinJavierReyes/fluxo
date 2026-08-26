import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OAuthClient, OAuthClientSource } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { isSchemeAllowed } from './redirect-uri.util';

const MIN_CACHE_MS = 5 * 60 * 1000;
const MAX_CACHE_MS = 24 * 60 * 60 * 1000;
const DEFAULT_CACHE_MS = 60 * 60 * 1000;

interface CimdDocument {
  client_id: string;
  client_name: string;
  client_uri?: string;
  logo_uri?: string;
  redirect_uris: string[];
  grant_types?: string[];
  response_types?: string[];
  token_endpoint_auth_method?: string;
}

function isCimdClientId(clientId: string): boolean {
  try {
    const url = new URL(clientId);
    return url.protocol === 'https:' && url.pathname.length > 1;
  } catch {
    return false;
  }
}

function parseMaxAgeMs(cacheControl: string | null): number {
  const match = cacheControl?.match(/max-age=(\d+)/i);
  if (!match) {
    return DEFAULT_CACHE_MS;
  }
  const ms = Number(match[1]) * 1000;
  return Math.min(Math.max(ms, MIN_CACHE_MS), MAX_CACHE_MS);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateCimdDocument(doc: unknown, clientId: string): CimdDocument {
  if (!isPlainObject(doc)) {
    throw new BadRequestException(
      'El documento de metadata del cliente no es un objeto JSON válido',
    );
  }
  const {
    client_id: docClientId,
    client_name: clientName,
    redirect_uris: redirectUris,
  } = doc;
  if (typeof docClientId !== 'string' || docClientId !== clientId) {
    throw new BadRequestException(
      'El client_id del documento no coincide con la URL desde la que se sirvió',
    );
  }
  if (typeof clientName !== 'string' || clientName.length === 0) {
    throw new BadRequestException(
      'El documento de metadata no tiene client_name',
    );
  }
  if (
    !Array.isArray(redirectUris) ||
    redirectUris.length === 0 ||
    !redirectUris.every((u) => typeof u === 'string')
  ) {
    throw new BadRequestException(
      'El documento de metadata no tiene redirect_uris válidos',
    );
  }
  return doc as unknown as CimdDocument;
}

/**
 * Resuelve clientes OAuth por las tres vías que admite MCP: Client ID
 * Metadata Documents (URL https:// autodescriptiva, sin registro previo —
 * el camino recomendado hoy), Dynamic Client Registration (compatibilidad
 * hacia atrás) y clientes preregistrados a mano.
 */
@Injectable()
export class OAuthClientService {
  private readonly logger = new Logger(OAuthClientService.name);

  constructor(private readonly prisma: PrismaService) {}

  async resolveClient(clientId: string): Promise<OAuthClient> {
    if (isCimdClientId(clientId)) {
      return this.resolveCimdClient(clientId);
    }

    const client = await this.prisma.oAuthClient.findUnique({
      where: { clientId },
    });
    if (!client) {
      throw new NotFoundException('Cliente OAuth no encontrado');
    }
    return client;
  }

  private async resolveCimdClient(clientId: string): Promise<OAuthClient> {
    const cached = await this.prisma.oAuthClient.findUnique({
      where: { clientId },
    });
    if (cached && cached.cimdExpiresAt && cached.cimdExpiresAt > new Date()) {
      return cached;
    }

    if (!isSchemeAllowed(clientId)) {
      throw new BadRequestException('client_id debe ser una URL https://');
    }

    let response: Response;
    try {
      response = await fetch(clientId, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
    } catch (error) {
      this.logger.warn(
        `No se pudo obtener el CIMD de ${clientId}: ${(error as Error).message}`,
      );
      if (cached) {
        // Documento no disponible temporalmente: se sigue confiando en la
        // copia cacheada aunque esté vencida, en vez de romper el flujo.
        return cached;
      }
      throw new BadRequestException(
        'No se pudo obtener el documento de metadata del cliente (Client ID Metadata Document)',
      );
    }

    if (!response.ok) {
      if (cached) {
        return cached;
      }
      throw new BadRequestException(
        `El client_id respondió ${response.status} al pedir su metadata`,
      );
    }

    const doc = validateCimdDocument(await response.json(), clientId);
    const now = Date.now();
    const cimdExpiresAt = new Date(
      now + parseMaxAgeMs(response.headers.get('cache-control')),
    );

    return this.prisma.oAuthClient.upsert({
      where: { clientId },
      create: {
        clientId,
        clientName: doc.client_name,
        clientUri: doc.client_uri,
        logoUri: doc.logo_uri,
        redirectUris: doc.redirect_uris,
        grantTypes: doc.grant_types ?? ['authorization_code', 'refresh_token'],
        responseTypes: doc.response_types ?? ['code'],
        tokenEndpointAuthMethod: doc.token_endpoint_auth_method ?? 'none',
        source: OAuthClientSource.CIMD,
        cimdFetchedAt: new Date(now),
        cimdExpiresAt,
      },
      update: {
        clientName: doc.client_name,
        clientUri: doc.client_uri,
        logoUri: doc.logo_uri,
        redirectUris: doc.redirect_uris,
        grantTypes: doc.grant_types ?? ['authorization_code', 'refresh_token'],
        responseTypes: doc.response_types ?? ['code'],
        tokenEndpointAuthMethod: doc.token_endpoint_auth_method ?? 'none',
        cimdFetchedAt: new Date(now),
        cimdExpiresAt,
      },
    });
  }

  async registerDynamicClient(dto: {
    clientName: string;
    redirectUris: string[];
    clientUri?: string;
    logoUri?: string;
    grantTypes?: string[];
    responseTypes?: string[];
    tokenEndpointAuthMethod?: string;
  }): Promise<OAuthClient> {
    if (dto.redirectUris.length === 0) {
      throw new BadRequestException('redirect_uris no puede estar vacío');
    }
    for (const uri of dto.redirectUris) {
      if (!isSchemeAllowed(uri)) {
        throw new BadRequestException(
          `redirect_uri "${uri}" inválido: http:// solo se permite en loopback (127.0.0.1/localhost)`,
        );
      }
    }

    return this.prisma.oAuthClient.create({
      data: {
        clientId: `dcr_${randomUUID().replace(/-/g, '')}`,
        clientName: dto.clientName,
        clientUri: dto.clientUri,
        logoUri: dto.logoUri,
        redirectUris: dto.redirectUris,
        grantTypes: dto.grantTypes ?? ['authorization_code', 'refresh_token'],
        responseTypes: dto.responseTypes ?? ['code'],
        tokenEndpointAuthMethod: dto.tokenEndpointAuthMethod ?? 'none',
        source: OAuthClientSource.DCR,
      },
    });
  }
}
