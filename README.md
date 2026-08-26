# Fluxo

App de finanzas personales — cuentas, transacciones, presupuestos, metas de ahorro, obligaciones y proyección de flujo de caja. Expone además un **servidor MCP remoto** (con OAuth 2.1) para que agentes de IA como Claude puedan consultar y registrar movimientos por lenguaje natural.

## Estructura del monorepo

```
apps/
  api/      NestJS 11 + Prisma 6 + Postgres (Supabase) — REST + servidor MCP + Authorization Server OAuth 2.1
  web/      Next.js 16 — la app, y la pantalla de consentimiento OAuth (/oauth/consent)
packages/
  shared/   Schemas Zod + tipos compartidos entre api y web
```

## Desarrollo local

Requiere un proyecto de [Supabase](https://supabase.com) (Auth + Postgres) ya creado.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env      # completar con los datos del proyecto de Supabase
cp apps/web/.env.example apps/web/.env
pnpm --filter api exec prisma generate
pnpm --filter api exec prisma migrate dev   # ver la nota de migraciones más abajo
pnpm --filter @fluxo/shared build
pnpm --filter api dev                        # puerto 3001
pnpm --filter web dev                        # puerto 3002
```

### Nota sobre migraciones

En este proyecto, `prisma migrate dev`/`deploy` fallan intermitentemente con `P3005` contra el pooler de Supabase (parece congestión de conexiones cuando el CLI de Prisma hace varias llamadas seguidas). Si eso pasa, aplicá el SQL de la migración directamente:

```bash
pnpm --filter api exec prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --script > /tmp/migration.sql
# revisar el SQL, después aplicarlo con un script que use $executeRawUnsafe
# statement por statement (ver apps/api/prisma/scripts/_apply-migration-step.ts
# como referencia del patrón usado durante el desarrollo)
```

Los archivos de migración en `prisma/migrations/` quedan igual en el repo para que `migrate deploy` funcione en un ambiente sin ese problema (ej. CI, o Postgres sin pooler).

## Variables de entorno

Ver `apps/api/.env.example` y `apps/web/.env.example` — cada variable tiene un comentario explicando para qué es. Las relevantes para el servidor MCP:

| Variable | Dónde | Qué es |
|---|---|---|
| `OAUTH_ISSUER` | api | Issuer del Authorization Server OAuth 2.1. En producción tiene que ser una URL resoluble públicamente (no `localhost`) — los clientes MCP la usan para descubrir los endpoints vía `/.well-known/oauth-authorization-server`. |
| `MCP_PUBLIC_URL` | api | URI canónica del recurso MCP (RFC 8707) — a qué recurso queda "atado" cada access token emitido. Tiene que apuntar al endpoint real que sirve `POST /mcp` en producción. |
| `MCP_CONSENT_URL` | api | A dónde redirige `/oauth/authorize` para que el usuario apruebe la conexión — la URL pública de `apps/web/oauth/consent` en producción. |
| `SUPABASE_URL` | api | Se usa para construir la URL del JWKS con el que se verifican los JWT de Supabase Auth. |

Si `OAUTH_ISSUER`/`MCP_PUBLIC_URL`/`MCP_CONSENT_URL` quedan apuntando a `localhost` en producción, el flujo de autorización de un cliente MCP externo (Claude Desktop, claude.ai) no va a poder completarse — son las tres variables más fáciles de olvidar al desplegar.

## Despliegue

**`apps/api`** tiene un `Dockerfile` listo para Railway (`apps/api/Dockerfile`, build context = raíz del repo, no la carpeta de la app). Cumple tres roles a la vez: API REST, Authorization Server OAuth 2.1, y servidor MCP — no hace falta desplegar nada por separado para el MCP.

El `Dockerfile` **no corre migraciones al arrancar** — aplicalas antes del deploy (`prisma migrate deploy`, o el workaround de la sección anterior si falla contra el pooler).

**`apps/web`** es una app Next.js estándar (Vercel es la opción natural, sin configuración especial) — sirve la UI y también la pantalla de consentimiento OAuth (`/oauth/consent`), así que su URL pública es la que va en `MCP_CONSENT_URL`.

### Verificación post-deploy

```bash
curl https://tu-api.example.com/.well-known/oauth-protected-resource
curl https://tu-api.example.com/.well-known/oauth-authorization-server
```

Ambas tienen que devolver JSON válido con URLs apuntando al dominio de producción, no a `localhost`. Después, probar la conexión real desde un cliente:

```bash
claude mcp add --transport http fluxo https://tu-api.example.com/mcp
```

Eso dispara el flujo de autorización completo (redirect a `/oauth/authorize` → pantalla de consentimiento en `apps/web` → token). El eval suite en `apps/api/evals/` (ver su README) sirve para verificar que el modelo elige bien las tools una vez conectado.
