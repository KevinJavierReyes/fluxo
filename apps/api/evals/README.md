# Evals del servidor MCP de Fluxo

Batería de ~30 prompts reales ("gasté 45 en el súper", "cómo van mis presupuestos") que verifica que Claude elige la tool correcta en su primer turno al hablar con el servidor MCP de Fluxo — no evalúa la conversación completa, solo la decisión inicial (qué tool llamar, o si corresponde no llamar ninguna).

## Cómo correrlo

Necesita el servidor de la API corriendo localmente y una API key de Anthropic:

```bash
# 1. Levantar la API (en otra terminal)
pnpm --filter api dev

# 2. Correr los evals
cd apps/api
ANTHROPIC_API_KEY=sk-ant-... pnpm eval
```

Variables opcionales:

- `EVAL_API_URL` — default `http://localhost:3001`. Apuntá a un ambiente de staging si hace falta.
- `EVAL_MODEL` — default `claude-sonnet-5`. **Verificá que sea un id de modelo válido para la Messages API de Anthropic antes de correrlo** — este default no se probó contra la API real (ver "Qué no se verificó" abajo).

Para revisar el harness sin gastar tokens ni necesitar una key (sembra los fixtures, mintea un token, hace el handshake MCP real, lista las tools, y las imprime — sin llamar a Anthropic):

```bash
pnpm exec ts-node evals/run-evals.ts --dry-run
```

## Qué hace

1. Siembra un usuario de prueba con cuentas, categorías, una plantilla de gasto ("Netflix"), una meta de ahorro ("Vacaciones"), un presupuesto, y algunas transacciones — todo lo que el dataset referencia por nombre (`seed.ts`).
2. Mintea un token MCP con los 3 scopes y hace el handshake real (`initialize` + `tools/list`) contra el servidor corriendo en `EVAL_API_URL`, así los evals corren contra las tools *reales*, no una copia mantenida a mano.
3. Para cada caso de `dataset.ts`, le manda el prompt a Claude (Messages API, con las tools cargadas del servidor) y mira qué tool(s) llamó en su primera respuesta.
4. Compara contra `expectedTools` (una lista — cualquiera de esos nombres cuenta como acierto) o `expectNoWriteToolCall` (para los 2 casos límite donde Fluxo no tiene esa operación — investigar con tools de *lectura* antes de aclarar está bien, lo que cuenta como falla es escribir sin confirmación).
5. Imprime un resumen pass/fail por caso y el score agregado, y borra el usuario de prueba al final.

## Agregar un caso nuevo

Un objeto más en el array de `dataset.ts`:

```ts
{
  id: 'mi-caso-01',
  prompt: 'Un prompt realista en español',
  expectedTools: ['record_transaction'], // o expectNoWriteToolCall: true
  notes: 'Por qué se espera esa tool (opcional, pero ayuda a releer el caso después)',
}
```

Si el prompt referencia una cuenta, categoría, plantilla o meta por nombre, agregala en `seed.ts` primero — el dataset asume que "Mercado", "Uber", "Netflix", "Vacaciones", etc. ya existen.

## Qué se verificó en vivo (fuera de este harness) y qué no

Esta sesión no tenía una `ANTHROPIC_API_KEY`, así que **el harness (`run-evals.ts` con la Messages API directa) nunca se corrió tal cual** — se verificó con `--dry-run` que todo lo no-LLM funciona: sembrado de fixtures, minteo de token, el handshake MCP real, y la carga de las 18 tools desde el servidor corriendo.

Pero sí se validó con un **modelo real** por otra vía: el CLI de `claude` ya estaba disponible en la máquina, así que se registró el servidor local como MCP server (`claude mcp add --transport http`) y se corrieron algunos de estos mismos prompts con `claude -p` de verdad, verificando el resultado contra la base de datos (no solo lo que dijo el modelo). Resultados:

- **"Gasté 45 en el súper, anótalo en Fluxo"**: no adivinó la categoría — preguntó "¿Uso la categoría 'Mercado' (Alimentación)?", y al confirmar, llamó `record_transaction` con un `clientRequestId` generado espontáneamente (sin que se le pidiera). Transacción verificada en la base.
- **"¿Cómo está mi saldo en Fluxo?"**: llamó `get_dashboard` y devolvió el saldo correcto.
- **"Moví 200 de mi cuenta principal a mi cuenta de efectivo"** (edge-01): llamó `fluxo_list` para revisar qué cuentas existían, encontró que falta la cuenta de efectivo, y propuso un plan (crear la cuenta + registrar gasto/ingreso) **sin ejecutar nada**, pidiendo confirmación primero. Esto es MEJOR que la expectativa original del dataset (que pedía cero tool calls) — investigar con lectura antes de aclarar es el comportamiento correcto, no una falla. El dataset y el grading de `run-evals.ts` ya se ajustaron (`expectNoWriteToolCall`) a partir de este hallazgo.

Lo que sigue sin probarse es la corrida formal de los 31 casos vía la Messages API directa:

- **`EVAL_MODEL` es un valor por defecto sin verificar** contra la Messages API directa — confirmá el id de modelo correcto antes de la primera corrida real (`claude -p` internamente resuelve el alias `claude-sonnet-5` por su cuenta, así que esa prueba en vivo no confirma el id correcto para `run-evals.ts`).
- El resto de `expectedTools` (los 29 casos que no se probaron en vivo) siguen siendo mi mejor juicio, no resultados observados.
