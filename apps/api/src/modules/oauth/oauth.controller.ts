import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ConfigService } from '@nestjs/config';
import {
  AuthorizeQueryDto,
  ConsentBodyDto,
  RegisterClientDto,
  RevokeBodyDto,
  TokenBodyDto,
} from './dto';
import { OAuthClientService } from './oauth-client.service';
import { OAuthService } from './oauth.service';

@ApiExcludeController()
@Controller('oauth')
export class OAuthController {
  constructor(
    private readonly oauthService: OAuthService,
    private readonly clientService: OAuthClientService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterClientDto) {
    const client = await this.clientService.registerDynamicClient({
      clientName: dto.client_name,
      redirectUris: dto.redirect_uris,
      clientUri: dto.client_uri,
      logoUri: dto.logo_uri,
      grantTypes: dto.grant_types,
      responseTypes: dto.response_types,
      tokenEndpointAuthMethod: dto.token_endpoint_auth_method,
    });
    return {
      client_id: client.clientId,
      client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
      client_name: client.clientName,
      redirect_uris: client.redirectUris,
      grant_types: client.grantTypes,
      response_types: client.responseTypes,
      token_endpoint_auth_method: client.tokenEndpointAuthMethod,
    };
  }

  @Public()
  @Get('authorize')
  async authorize(@Query() query: AuthorizeQueryDto, @Res() res: Response) {
    // Cualquier fallo de validación responde con un error directo (nunca
    // redirige) — redirigir a un redirect_uri que todavía no se validó como
    // legítimo del cliente es la puerta de un open-redirect.
    const request = await this.oauthService.createAuthorizationRequest(query);
    const consentUrl = new URL(
      this.config.getOrThrow<string>('MCP_CONSENT_URL'),
    );
    consentUrl.searchParams.set('request_id', request.id);
    res.redirect(302, consentUrl.toString());
  }

  /** Detalles para renderizar la pantalla de consentimiento (protegido: requiere sesión). */
  @Get('authorize-request/:id')
  getAuthorizeRequest(@Param('id') id: string) {
    return this.oauthService.getAuthorizationRequestForConsent(id);
  }

  /**
   * Recibe la aprobación o el rechazo desde la pantalla de consentimiento.
   * Protegido por el guard global (Supabase): el usuario ya tiene sesión en
   * el navegador, y es la forma en que el authorization server nunca ve ni
   * maneja contraseñas.
   */
  @Post('consent')
  async consent(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ConsentBodyDto,
  ) {
    return this.oauthService.resolveConsent(
      dto.requestId,
      user.id,
      dto.approve,
    );
  }

  @Public()
  @Post('token')
  @HttpCode(200)
  exchangeToken(@Body() dto: TokenBodyDto) {
    return this.oauthService.exchangeToken(dto);
  }

  @Public()
  @Post('revoke')
  @HttpCode(200)
  async revoke(@Body() dto: RevokeBodyDto) {
    await this.oauthService.revokeToken(dto);
    return {};
  }
}
