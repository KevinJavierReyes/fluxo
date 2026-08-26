import { Module } from '@nestjs/common';
import { OAuthClientService } from './oauth-client.service';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';
import { WellKnownController } from './well-known.controller';

@Module({
  controllers: [OAuthController, WellKnownController],
  providers: [OAuthService, OAuthClientService],
  exports: [OAuthClientService],
})
export class OAuthModule {}
