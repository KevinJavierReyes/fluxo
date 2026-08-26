import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { McpTokenKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  MCP_SCOPES,
  OAUTH_ACCESS_TOKEN_TTL_MS,
  OAUTH_AUTHORIZATION_REQUEST_TTL_MS,
  OAUTH_CODE_TTL_MS,
  OAUTH_REFRESH_TOKEN_TTL_MS,
  TOKEN_PREFIX,
  isMcpScope,
} from './oauth.constants';
import { OAuthClientService } from './oauth-client.service';
import { isValidCodeChallenge, verifyPkce } from './pkce.util';
import { isRedirectUriAllowed } from './redirect-uri.util';
import {
  generateAuthorizationCode,
  generateOpaqueToken,
  hashToken,
} from './token.util';
import type { AuthorizeQueryDto, RevokeBodyDto, TokenBodyDto } from './dto';

export interface TokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly clientService: OAuthClientService,
  ) {}

  private get issuer(): string {
    return this.config.getOrThrow<string>('OAUTH_ISSUER');
  }

  private get resourceId(): string {
    return this.config.getOrThrow<string>('MCP_PUBLIC_URL');
  }

  private get consentUrl(): string {
    return this.config.getOrThrow<string>('MCP_CONSENT_URL');
  }

  protectedResourceMetadata() {
    return {
      resource: this.resourceId,
      authorization_servers: [this.issuer],
      scopes_supported: MCP_SCOPES,
      bearer_methods_supported: ['header'],
    };
  }

  authorizationServerMetadata() {
    return {
      issuer: this.issuer,
      authorization_endpoint: `${this.issuer}/oauth/authorize`,
      token_endpoint: `${this.issuer}/oauth/token`,
      registration_endpoint: `${this.issuer}/oauth/register`,
      revocation_endpoint: `${this.issuer}/oauth/revoke`,
      scopes_supported: MCP_SCOPES,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
      client_id_metadata_document_supported: true,
      authorization_response_iss_parameter_supported: true,
    };
  }

  async createAuthorizationRequest(query: AuthorizeQueryDto) {
    const client = await this.clientService.resolveClient(query.client_id);

    if (!isRedirectUriAllowed(query.redirect_uri, client.redirectUris)) {
      throw new BadRequestException(
        'redirect_uri no está registrado para este cliente',
      );
    }
    if (query.resource !== this.resourceId) {
      throw new BadRequestException(
        `resource debe ser exactamente "${this.resourceId}"`,
      );
    }
    if (!isValidCodeChallenge(query.code_challenge)) {
      throw new BadRequestException('code_challenge inválido');
    }

    const requestedScopes = (query.scope ?? MCP_SCOPES.join(' '))
      .split(' ')
      .filter(Boolean);
    const invalidScope = requestedScopes.find((s) => !isMcpScope(s));
    if (invalidScope) {
      throw new BadRequestException(`Scope desconocido: ${invalidScope}`);
    }

    return this.prisma.oAuthAuthorizationRequest.create({
      data: {
        clientId: client.clientId,
        redirectUri: query.redirect_uri,
        scopes: requestedScopes,
        resource: query.resource,
        state: query.state,
        codeChallenge: query.code_challenge,
        codeChallengeMethod: query.code_challenge_method,
        expiresAt: new Date(Date.now() + OAUTH_AUTHORIZATION_REQUEST_TTL_MS),
      },
    });
  }

  async getAuthorizationRequestForConsent(requestId: string) {
    const request = await this.prisma.oAuthAuthorizationRequest.findUnique({
      where: { id: requestId },
    });
    if (!request || request.expiresAt < new Date() || request.approvedAt) {
      throw new NotFoundException(
        'La solicitud de autorización no existe o ya expiró',
      );
    }
    const client = await this.clientService.resolveClient(request.clientId);
    return {
      requestId: request.id,
      clientName: client.clientName,
      clientUri: client.clientUri,
      logoUri: client.logoUri,
      redirectHost: new URL(request.redirectUri).host,
      scopes: request.scopes,
      isDynamic: client.source !== 'PREREGISTERED',
      expiresAt: request.expiresAt,
    };
  }

  async resolveConsent(
    requestId: string,
    userId: string,
    approve: boolean,
  ): Promise<{ redirectTo: string }> {
    const request = await this.prisma.oAuthAuthorizationRequest.findUnique({
      where: { id: requestId },
    });
    if (!request || request.expiresAt < new Date() || request.approvedAt) {
      throw new NotFoundException(
        'La solicitud de autorización no existe o ya expiró',
      );
    }

    const redirect = new URL(request.redirectUri);
    if (request.state) {
      redirect.searchParams.set('state', request.state);
    }

    if (!approve) {
      await this.prisma.oAuthAuthorizationRequest.delete({
        where: { id: requestId },
      });
      redirect.searchParams.set('error', 'access_denied');
      return { redirectTo: redirect.toString() };
    }

    const { raw, hash } = generateAuthorizationCode();

    await this.prisma.$transaction([
      this.prisma.oAuthAuthorizationCode.create({
        data: {
          codeHash: hash,
          userId,
          clientId: request.clientId,
          redirectUri: request.redirectUri,
          scopes: request.scopes,
          resource: request.resource,
          codeChallenge: request.codeChallenge,
          codeChallengeMethod: request.codeChallengeMethod,
          expiresAt: new Date(Date.now() + OAUTH_CODE_TTL_MS),
        },
      }),
      this.prisma.oAuthAuthorizationRequest.delete({
        where: { id: requestId },
      }),
    ]);

    redirect.searchParams.set('code', raw);
    redirect.searchParams.set('iss', this.issuer);
    return { redirectTo: redirect.toString() };
  }

  async exchangeToken(dto: TokenBodyDto): Promise<TokenResponse> {
    if (dto.grant_type === 'authorization_code') {
      return this.exchangeAuthorizationCode(dto);
    }
    return this.exchangeRefreshToken(dto);
  }

  private async exchangeAuthorizationCode(
    dto: TokenBodyDto,
  ): Promise<TokenResponse> {
    if (!dto.code || !dto.redirect_uri) {
      throw new BadRequestException('code y redirect_uri son requeridos');
    }
    const codeHash = hashToken(dto.code);

    // Consumo atómico: si el code ya estaba consumido o no existe, count será 0.
    const claimed = await this.prisma.oAuthAuthorizationCode.updateMany({
      where: { codeHash, consumedAt: null, expiresAt: { gt: new Date() } },
      data: { consumedAt: new Date() },
    });

    const record = await this.prisma.oAuthAuthorizationCode.findUnique({
      where: { codeHash },
    });

    if (claimed.count !== 1) {
      if (record?.consumedAt) {
        // Replay de un code ya usado: es la señal de que el code se filtró.
        // Se revoca todo el acceso de ese cliente para ese usuario.
        this.logger.warn(
          `Replay de authorization code detectado (userId=${record.userId}, clientId=${record.clientId}) — revocando tokens`,
        );
        await this.prisma.mcpToken.updateMany({
          where: {
            userId: record.userId,
            clientId: record.clientId,
            revokedAt: null,
          },
          data: { revokedAt: new Date() },
        });
      }
      throw new UnauthorizedException(
        'invalid_grant: code inválido, expirado o ya usado',
      );
    }
    if (!record) {
      throw new UnauthorizedException('invalid_grant');
    }

    if (record.clientId !== dto.client_id) {
      throw new UnauthorizedException(
        'invalid_grant: client_id no coincide con el del code',
      );
    }
    if (record.redirectUri !== dto.redirect_uri) {
      throw new UnauthorizedException(
        'invalid_grant: redirect_uri no coincide con el del code',
      );
    }
    if (dto.resource && dto.resource !== record.resource) {
      throw new UnauthorizedException(
        'invalid_target: resource no coincide con el del code',
      );
    }
    if (
      !dto.code_verifier ||
      !verifyPkce(
        dto.code_verifier,
        record.codeChallenge,
        record.codeChallengeMethod,
      )
    ) {
      throw new UnauthorizedException(
        'invalid_grant: code_verifier no coincide (PKCE)',
      );
    }

    return this.issueTokenPair({
      userId: record.userId,
      clientId: record.clientId,
      scopes: record.scopes,
      resource: record.resource,
    });
  }

  private async exchangeRefreshToken(
    dto: TokenBodyDto,
  ): Promise<TokenResponse> {
    if (!dto.refresh_token) {
      throw new BadRequestException('refresh_token es requerido');
    }
    const tokenHash = hashToken(dto.refresh_token);
    const existing = await this.prisma.mcpToken.findUnique({
      where: { tokenHash },
    });

    if (!existing || existing.kind !== McpTokenKind.OAUTH_REFRESH) {
      throw new UnauthorizedException('invalid_grant');
    }
    if (existing.revokedAt) {
      // Reuso de un refresh token ya rotado/revocado: señal de robo. Se
      // revoca todo el acceso de ese cliente para ese usuario, no solo este
      // token — es el algoritmo estándar de detección de replay.
      this.logger.warn(
        `Replay de refresh token detectado (userId=${existing.userId}, clientId=${existing.clientId}) — revocando tokens`,
      );
      await this.prisma.mcpToken.updateMany({
        where: {
          userId: existing.userId,
          clientId: existing.clientId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('invalid_grant: refresh token ya usado');
    }
    if (existing.expiresAt && existing.expiresAt < new Date()) {
      throw new UnauthorizedException('invalid_grant: refresh token expirado');
    }
    if (existing.clientId !== dto.client_id) {
      throw new UnauthorizedException('invalid_grant: client_id no coincide');
    }

    await this.prisma.mcpToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokenPair(
      {
        userId: existing.userId,
        clientId: existing.clientId ?? dto.client_id,
        scopes: existing.scopes,
        resource: existing.resource ?? this.resourceId,
      },
      existing.id,
    );
  }

  private async issueTokenPair(
    params: {
      userId: string;
      clientId: string;
      scopes: string[];
      resource: string;
    },
    rotatedFromId?: string,
  ): Promise<TokenResponse> {
    const access = generateOpaqueToken(TOKEN_PREFIX.ACCESS);
    const refresh = generateOpaqueToken(TOKEN_PREFIX.REFRESH);
    const now = Date.now();

    const [accessToken] = await this.prisma.$transaction([
      this.prisma.mcpToken.create({
        data: {
          userId: params.userId,
          kind: McpTokenKind.OAUTH_ACCESS,
          tokenHash: access.hash,
          prefix: access.displayPrefix,
          clientId: params.clientId,
          scopes: params.scopes,
          resource: params.resource,
          expiresAt: new Date(now + OAUTH_ACCESS_TOKEN_TTL_MS),
        },
      }),
      this.prisma.mcpToken.create({
        data: {
          userId: params.userId,
          kind: McpTokenKind.OAUTH_REFRESH,
          tokenHash: refresh.hash,
          prefix: refresh.displayPrefix,
          clientId: params.clientId,
          scopes: params.scopes,
          resource: params.resource,
          expiresAt: new Date(now + OAUTH_REFRESH_TOKEN_TTL_MS),
          ...(rotatedFromId ? { parentTokenId: rotatedFromId } : {}),
        },
      }),
    ]);
    void accessToken;

    return {
      access_token: access.raw,
      token_type: 'Bearer',
      expires_in: OAUTH_ACCESS_TOKEN_TTL_MS / 1000,
      refresh_token: refresh.raw,
      scope: params.scopes.join(' '),
    };
  }

  async revokeToken(dto: RevokeBodyDto): Promise<void> {
    const tokenHash = hashToken(dto.token);
    // RFC 7009: se responde 200 exista o no el token, para no filtrar información.
    await this.prisma.mcpToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
