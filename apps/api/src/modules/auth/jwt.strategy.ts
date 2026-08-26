import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

interface SupabaseJwtPayload {
  sub: string;
  email?: string;
}

// Supabase Auth firma sus JWT con llaves asimétricas (ES256/ECC) publicadas en
// /auth/v1/.well-known/jwks.json — verificamos contra ese JWKS en vez de un
// secreto compartido estático.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
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

  async validate(payload: SupabaseJwtPayload): Promise<CurrentUserPayload> {
    // El usuario local (tabla `User`) se crea recién en /auth/bootstrap, así
    // que en ese primer request todavía puede no existir — se asume UTC en
    // ese caso en vez de fallar.
    const dbUser = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { timezone: true },
    });
    return {
      id: payload.sub,
      email: payload.email ?? '',
      timezone: dbUser?.timezone ?? 'UTC',
    };
  }
}
