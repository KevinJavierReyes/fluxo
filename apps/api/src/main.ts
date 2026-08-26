import { NestFactory } from '@nestjs/core';
import { RequestMethod } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { patchNestJsSwagger } from 'nestjs-zod';
import { AppModule } from './app.module';

// Rutas públicas de OAuth/MCP: fuera de /api (la spec exige rutas fijas
// bajo /.well-known/, y un cliente MCP arbitrario no conoce ni debería
// necesitar el prefijo interno de esta API) y con CORS permisivo (a
// diferencia de la web de Fluxo, cualquier origen puede ser un cliente MCP
// legítimo). `Access-Control-Expose-Headers` es obligatorio aquí: sin él,
// un cliente en el navegador recibe el 401 pero no puede leer el header
// `WWW-Authenticate` que le dice dónde arrancar el flujo OAuth.
const PUBLIC_MCP_PATH_PREFIXES = ['/.well-known/', '/oauth/', '/mcp'];

function isPublicMcpPath(path: string): boolean {
  return PUBLIC_MCP_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

// Reemplaza a `app.enableCors()`: ambas políticas (la restringida de la web
// de Fluxo y la permisiva de MCP/OAuth) se deciden en un solo middleware
// para que no compitan por los mismos headers de respuesta — `enableCors()`
// es igual de global y pisaría lo que este middleware ya haya puesto.
function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  if (isPublicMcpPath(req.path)) {
    res.header('Access-Control-Allow-Origin', req.headers.origin ?? '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID',
    );
    res.header(
      'Access-Control-Expose-Headers',
      'Mcp-Session-Id, WWW-Authenticate',
    );
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
    return;
  }

  const allowedOrigin = process.env.FRONTEND_URL ?? 'http://localhost:3002';
  if (req.headers.origin === allowedOrigin) {
    res.header('Access-Control-Allow-Origin', allowedOrigin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.sendStatus(204);
    return;
  }
  next();
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.use(corsMiddleware);
  app.setGlobalPrefix('api', {
    exclude: [
      {
        path: '.well-known/oauth-protected-resource',
        method: RequestMethod.GET,
      },
      {
        path: '.well-known/oauth-authorization-server',
        method: RequestMethod.GET,
      },
      { path: 'oauth/register', method: RequestMethod.POST },
      { path: 'oauth/authorize', method: RequestMethod.GET },
      { path: 'oauth/authorize-request/:id', method: RequestMethod.GET },
      { path: 'oauth/consent', method: RequestMethod.POST },
      { path: 'oauth/token', method: RequestMethod.POST },
      { path: 'oauth/revoke', method: RequestMethod.POST },
      { path: 'mcp', method: RequestMethod.POST },
      { path: 'mcp', method: RequestMethod.GET },
      { path: 'mcp', method: RequestMethod.DELETE },
    ],
  });

  patchNestJsSwagger();
  const config = new DocumentBuilder()
    .setTitle('Fluxo API')
    .setDescription('API de finanzas personales de Fluxo')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
