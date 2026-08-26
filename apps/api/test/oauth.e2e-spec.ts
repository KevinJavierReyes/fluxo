import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createHash, randomBytes, randomUUID } from 'crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { OAuthService } from '../src/modules/oauth/oauth.service';
import { PrismaService } from '../src/prisma/prisma.service';

// supertest tipa `response.body` como `any`; estas interfaces son solo para
// darle forma a las respuestas JSON que este spec necesita leer.
interface ProtectedResourceMetadataBody {
  resource: string;
  authorization_servers: string[];
  scopes_supported: string[];
}
interface AuthServerMetadataBody {
  authorization_endpoint: string;
  token_endpoint: string;
  code_challenge_methods_supported: string[];
  client_id_metadata_document_supported: boolean;
}
interface RegisterClientBody {
  client_id: string;
}
interface TokenResponseBody {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

/**
 * Recorre el flujo OAuth 2.1 completo contra la base real: DCR, /authorize,
 * consentimiento (invocado directo al service — la pantalla de
 * consentimiento en sí es de la Fase 4), intercambio de code por tokens,
 * rotación de refresh token, replay de code y de refresh token, y revoke.
 *
 * Usa un usuario descartable creado a mano (no Supabase Auth) que se borra
 * al final; el cascade de Prisma se lleva consigo los McpToken y
 * OAuthAuthorizationCode que haya generado.
 */
describe('OAuth 2.1 flow (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let oauthService: OAuthService;
  const testUserId = randomUUID();
  const testEmail = `oauth-e2e-${Date.now()}@fluxo.internal`;

  beforeAll(async () => {
    // El prefijo global "api" (con su exclude list) vive en main.ts, no en
    // AppModule — los controllers de oauth/.well-known no lo usan de todos
    // modos, así que para este spec alcanza con levantar la app tal cual.
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    oauthService = app.get(OAuthService);

    await prisma.user.create({ data: { id: testUserId, email: testEmail } });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    // Los clientes DCR que crea este spec no cuelgan de ningún usuario —
    // se limpian por nombre para no acumular filas en cada corrida.
    await prisma.oAuthClient
      .deleteMany({
        where: {
          clientName: {
            in: [
              'Cliente de prueba e2e',
              'Cliente resource inválido',
              'Cliente redirect inválido',
            ],
          },
        },
      })
      .catch(() => {});
    await app.close();
  });

  it('expone metadata pública válida en los dos .well-known', async () => {
    const prmRes = await request(app.getHttpServer())
      .get('/.well-known/oauth-protected-resource')
      .expect(200);
    const prm = prmRes.body as ProtectedResourceMetadataBody;
    expect(prm.resource).toBeDefined();
    expect(prm.authorization_servers).toEqual(
      expect.arrayContaining([expect.any(String)]),
    );
    expect(prm.scopes_supported).toEqual(
      expect.arrayContaining([
        'finances:read',
        'finances:write',
        'config:write',
      ]),
    );

    const asmRes = await request(app.getHttpServer())
      .get('/.well-known/oauth-authorization-server')
      .expect(200);
    const asm = asmRes.body as AuthServerMetadataBody;
    expect(asm.authorization_endpoint).toContain('/oauth/authorize');
    expect(asm.token_endpoint).toContain('/oauth/token');
    expect(asm.code_challenge_methods_supported).toEqual(['S256']);
    expect(asm.client_id_metadata_document_supported).toBe(true);
  });

  it('recorre el flujo completo: registro -> authorize -> consentimiento -> token -> uso -> refresh -> revoke', async () => {
    // 1) Dynamic Client Registration
    const registerRes = await request(app.getHttpServer())
      .post('/oauth/register')
      .send({
        client_name: 'Cliente de prueba e2e',
        redirect_uris: ['http://127.0.0.1:51000/callback'],
      })
      .expect(201);
    const clientId = (registerRes.body as RegisterClientBody).client_id;
    expect(clientId).toBeDefined();

    // 2) PKCE
    const codeVerifier = randomBytes(32).toString('base64url');
    const codeChallenge = createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    // 3) /authorize -> 302 a la pantalla de consentimiento con un request_id
    const prm = await request(app.getHttpServer()).get(
      '/.well-known/oauth-protected-resource',
    );
    const resource = (prm.body as ProtectedResourceMetadataBody).resource;

    const authorizeRes = await request(app.getHttpServer())
      .get('/oauth/authorize')
      .query({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: 'http://127.0.0.1:62345/callback', // puerto distinto: loopback lo permite
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        resource,
        state: 'estado-123',
      })
      .expect(302);

    const location = new URL(authorizeRes.headers.location);
    const requestId = location.searchParams.get('request_id');
    expect(requestId).toBeDefined();

    // 4) Consentimiento — se invoca el service directo (la UI es Fase 4)
    const { redirectTo } = await oauthService.resolveConsent(
      requestId!,
      testUserId,
      true,
    );
    const callbackUrl = new URL(redirectTo);
    expect(callbackUrl.searchParams.get('state')).toBe('estado-123');
    expect(callbackUrl.searchParams.get('iss')).toBeDefined();
    const code = callbackUrl.searchParams.get('code');
    expect(code).toBeDefined();

    // 5) Intercambio del code por tokens
    const tokenRes = await request(app.getHttpServer())
      .post('/oauth/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'http://127.0.0.1:62345/callback',
        code_verifier: codeVerifier,
        client_id: clientId,
      })
      .expect(200);
    const tokenBody = tokenRes.body as TokenResponseBody;

    expect(tokenBody.access_token).toMatch(/^flx_at_/);
    expect(tokenBody.refresh_token).toMatch(/^flx_rt_/);
    expect(tokenBody.token_type).toBe('Bearer');
    const firstAccessToken = tokenBody.access_token;
    const firstRefreshToken = tokenBody.refresh_token;

    // 6) Reusar el mismo code debe fallar (replay) y revocar lo emitido
    await request(app.getHttpServer())
      .post('/oauth/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'http://127.0.0.1:62345/callback',
        code_verifier: codeVerifier,
        client_id: clientId,
      })
      .expect(401);

    const revokedAccess = await prisma.mcpToken.findFirst({
      where: { userId: testUserId, clientId, kind: 'OAUTH_ACCESS' },
    });
    expect(revokedAccess?.revokedAt).not.toBeNull();

    // 7) Repetir todo el flujo limpio para probar refresh + revoke sin el
    //    ruido de los tokens ya revocados por el replay del paso anterior.
    const authorizeRes2 = await request(app.getHttpServer())
      .get('/oauth/authorize')
      .query({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: 'http://127.0.0.1:62345/callback',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        resource,
      })
      .expect(302);
    const requestId2 = new URL(authorizeRes2.headers.location).searchParams.get(
      'request_id',
    );
    const consent2 = await oauthService.resolveConsent(
      requestId2!,
      testUserId,
      true,
    );
    const code2 = new URL(consent2.redirectTo).searchParams.get('code');

    const tokenRes2 = await request(app.getHttpServer())
      .post('/oauth/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code: code2,
        redirect_uri: 'http://127.0.0.1:62345/callback',
        code_verifier: codeVerifier,
        client_id: clientId,
      })
      .expect(200);
    const refreshToken = (tokenRes2.body as TokenResponseBody).refresh_token;

    // 8) Rotación de refresh token
    const refreshRes = await request(app.getHttpServer())
      .post('/oauth/token')
      .type('form')
      .send({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
      })
      .expect(200);
    const rotatedRefreshToken = (refreshRes.body as TokenResponseBody)
      .refresh_token;
    expect(rotatedRefreshToken).not.toBe(refreshToken);

    // 9) Reusar el refresh token viejo (ya rotado) debe fallar y revocar todo
    await request(app.getHttpServer())
      .post('/oauth/token')
      .type('form')
      .send({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
      })
      .expect(401);

    const stillValidNewRefresh = await prisma.mcpToken.findFirst({
      where: {
        userId: testUserId,
        clientId,
        kind: 'OAUTH_REFRESH',
        revokedAt: null,
      },
    });
    // El replay debe haber revocado también el refresh token nuevo emitido en la rotación.
    expect(stillValidNewRefresh).toBeNull();
    void rotatedRefreshToken;

    // 10) Revoke responde 200 sin filtrar si el token existía o no
    await request(app.getHttpServer())
      .post('/oauth/revoke')
      .type('form')
      .send({ token: firstAccessToken })
      .expect(200);
    await request(app.getHttpServer())
      .post('/oauth/revoke')
      .type('form')
      .send({ token: 'un-token-que-nunca-existio' })
      .expect(200);

    void firstRefreshToken;
  }, 30000);

  it('rechaza /authorize con un resource que no coincide con el del servidor', async () => {
    const registerRes = await request(app.getHttpServer())
      .post('/oauth/register')
      .send({
        client_name: 'Cliente resource inválido',
        redirect_uris: ['http://127.0.0.1:51000/callback'],
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/oauth/authorize')
      .query({
        response_type: 'code',
        client_id: (registerRes.body as RegisterClientBody).client_id,
        redirect_uri: 'http://127.0.0.1:51000/callback',
        code_challenge: 'a'.repeat(43),
        code_challenge_method: 'S256',
        resource: 'https://recurso-que-no-es-este-servidor.test',
      })
      .expect(400);
  });

  it('rechaza /authorize con un redirect_uri no registrado', async () => {
    const registerRes = await request(app.getHttpServer())
      .post('/oauth/register')
      .send({
        client_name: 'Cliente redirect inválido',
        redirect_uris: ['http://127.0.0.1:51000/callback'],
      })
      .expect(201);
    const prm = await request(app.getHttpServer()).get(
      '/.well-known/oauth-protected-resource',
    );

    await request(app.getHttpServer())
      .get('/oauth/authorize')
      .query({
        response_type: 'code',
        client_id: (registerRes.body as RegisterClientBody).client_id,
        redirect_uri: 'https://sitio-no-registrado.test/callback',
        code_challenge: 'a'.repeat(43),
        code_challenge_method: 'S256',
        resource: (prm.body as ProtectedResourceMetadataBody).resource,
      })
      .expect(400);
  });
});
