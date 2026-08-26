import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { OAuthService } from './oauth.service';

/**
 * Metadata pública de OAuth (RFC 9728 y RFC 8414). Fuera del prefijo `/api`
 * y del guard global a propósito: cualquier cliente MCP los pide antes de
 * tener ningún token, y la spec exige rutas fijas bajo `/.well-known/`.
 */
@ApiExcludeController()
@Public()
@Controller('.well-known')
export class WellKnownController {
  constructor(private readonly oauthService: OAuthService) {}

  @Get('oauth-protected-resource')
  protectedResource() {
    return this.oauthService.protectedResourceMetadata();
  }

  @Get('oauth-authorization-server')
  authorizationServer() {
    return this.oauthService.authorizationServerMetadata();
  }
}
