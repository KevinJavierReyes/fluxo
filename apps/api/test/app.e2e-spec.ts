import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

// El boilerplate original de `nest new` probaba `GET /` esperando
// "Hello World!" — un endpoint y un AppService que nunca existieron en
// Fluxo (el health check real vive en `/api/health`, detrás del prefijo
// global). Este spec ejercita el bootstrap real de la app: el prefijo
// global, el endpoint público, y que el guard de auth global efectivamente
// bloquea rutas protegidas sin token.
describe('AppModule (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/health responde 200 sin autenticación (@Public)', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('GET /api/accounts sin Authorization responde 401', () => {
    return request(app.getHttpServer()).get('/api/accounts').expect(401);
  });

  it('GET /api/accounts con un Bearer inválido responde 401', () => {
    return request(app.getHttpServer())
      .get('/api/accounts')
      .set('Authorization', 'Bearer esto-no-es-un-jwt-valido')
      .expect(401);
  });

  it('GET /api/auth/me sin Authorization responde 401', () => {
    return request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('GET /api/mcp-settings/connections sin Authorization responde 401', () => {
    return request(app.getHttpServer())
      .get('/api/mcp-settings/connections')
      .expect(401);
  });

  it('POST /api/mcp-settings/tokens sin Authorization responde 401', () => {
    return request(app.getHttpServer())
      .post('/api/mcp-settings/tokens')
      .send({ name: 'x', scopes: ['finances:read'] })
      .expect(401);
  });
});
