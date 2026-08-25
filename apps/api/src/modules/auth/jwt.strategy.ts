import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

interface SupabaseJwtPayload {
  sub: string;
  email?: string;
}

// Supabase Auth firma sus JWT con llaves asimétricas (ES256/ECC) publicadas en
// /auth/v1/.well-known/jwks.json — verificamos contra ese JWKS en vez de un
// secreto compartido estático.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const supabaseUrl = configService.getOrThrow<string>('SUPABASE_URL');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['ES256'],
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
      }),
    });
  }

  validate(payload: SupabaseJwtPayload): CurrentUserPayload {
    return { id: payload.sub, email: payload.email ?? '' };
  }
}
