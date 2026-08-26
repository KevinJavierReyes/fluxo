import { PrismaClient } from '@prisma/client';
import { EVAL_DATASET, type EvalCase } from './dataset';
import { cleanupEvalFixtures, seedEvalFixtures } from './seed';

const API_URL = process.env.EVAL_API_URL ?? 'http://localhost:3001';
// No hay forma de verificar el id de modelo correcto sin una API key a
// mano (ver README) — cambialo si Anthropic ya movió el alias por defecto.
const MODEL = process.env.EVAL_MODEL ?? 'claude-sonnet-5';
const DRY_RUN = process.argv.includes('--dry-run');

interface McpTool {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

let requestId = 1;

async function mcpCall(
  accessToken: string,
  method: string,
  params?: unknown,
): Promise<unknown> {
  const res = await fetch(`${API_URL}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: requestId++, method, params }),
  });
  const body = (await res.json()) as {
    result?: unknown;
    error?: { message: string };
  };
  if (body.error) {
    throw new Error(`MCP ${method} falló: ${body.error.message}`);
  }
  return body.result;
}

// Las 9 tools de escritura del servidor (ver tool-registry.service.ts) — las
// de lectura no aparecen acá porque investigar antes de aclarar es un
// comportamiento correcto, no una falla.
const WRITE_TOOLS = new Set([
  'record_transaction',
  'update_transaction',
  'delete_transaction',
  'apply_expense_template',
  'contribute_to_savings_goal',
  'fluxo_create',
  'fluxo_update',
  'fluxo_archive',
  'fluxo_undo',
]);

interface AnthropicToolUseBlock {
  type: 'tool_use';
  name: string;
  input: Record<string, unknown>;
}
interface AnthropicTextBlock {
  type: 'text';
  text: string;
}

async function callClaude(
  apiKey: string,
  system: string,
  tools: {
    name: string;
    description?: string;
    input_schema: Record<string, unknown>;
  }[],
  prompt: string,
): Promise<{ toolUses: AnthropicToolUseBlock[]; textBlocks: string[] }> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system,
      tools,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    throw new Error(
      `Anthropic API respondió ${res.status}: ${await res.text()}`,
    );
  }
  const body = (await res.json()) as {
    content: (AnthropicTextBlock | AnthropicToolUseBlock)[];
  };
  return {
    toolUses: body.content.filter(
      (b): b is AnthropicToolUseBlock => b.type === 'tool_use',
    ),
    textBlocks: body.content
      .filter((b): b is AnthropicTextBlock => b.type === 'text')
      .map((b) => b.text),
  };
}

function gradeCase(
  evalCase: EvalCase,
  toolUses: AnthropicToolUseBlock[],
): { pass: boolean; reason: string } {
  const calledNames = toolUses.map((t) => t.name);

  if (evalCase.expectNoWriteToolCall) {
    const writeCalls = calledNames.filter((name) => WRITE_TOOLS.has(name));
    return writeCalls.length === 0
      ? {
          pass: true,
          reason:
            calledNames.length === 0
              ? 'No llamó ninguna tool, como se esperaba.'
              : `Solo investigó con tools de lectura (${calledNames.join(', ')}), sin escribir nada — correcto.`,
        }
      : {
          pass: false,
          reason: `Llamó ${writeCalls.join(', ')} (escritura) cuando lo correcto era no escribir sin confirmación.`,
        };
  }

  if (!evalCase.expectedTools) {
    return { pass: false, reason: 'Caso mal definido en el dataset.' };
  }
  if (calledNames.length === 0) {
    return { pass: false, reason: 'No llamó ninguna tool.' };
  }
  const pass = evalCase.expectedTools.some((name) =>
    calledNames.includes(name),
  );
  return {
    pass,
    reason: pass
      ? `Llamó ${calledNames.join(', ')} — dentro de lo esperado (${evalCase.expectedTools.join(' | ')}).`
      : `Llamó ${calledNames.join(', ')}; se esperaba una de: ${evalCase.expectedTools.join(' | ')}.`,
  };
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey && !DRY_RUN) {
    console.error(
      'Falta ANTHROPIC_API_KEY. Corré con --dry-run para verificar el harness sin llamar a la API, o seteá la variable de entorno con una key real.',
    );
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const fixtures = await seedEvalFixtures(prisma);
  console.log(`Usuario de eval sembrado: ${fixtures.userId}`);

  try {
    const initResult = (await mcpCall(fixtures.accessToken, 'initialize', {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'fluxo-eval-harness', version: '0.0.1' },
    })) as { instructions?: string };

    const toolsResult = (await mcpCall(
      fixtures.accessToken,
      'tools/list',
      {},
    )) as {
      tools: McpTool[];
    };
    const tools = toolsResult.tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema,
    }));
    console.log(
      `${tools.length} tools cargadas desde el servidor MCP real (${API_URL}/mcp).\n`,
    );

    if (DRY_RUN) {
      console.log(
        `[dry-run] No se llama a Anthropic. ${EVAL_DATASET.length} casos listos para correr:\n`,
      );
      for (const evalCase of EVAL_DATASET) {
        console.log(`  ${evalCase.id}: "${evalCase.prompt}"`);
      }
      return;
    }

    let passed = 0;
    const failed: { id: string; reason: string }[] = [];

    for (const evalCase of EVAL_DATASET) {
      const { toolUses, textBlocks } = await callClaude(
        apiKey!,
        initResult.instructions ?? '',
        tools,
        evalCase.prompt,
      );
      const { pass, reason } = gradeCase(evalCase, toolUses);
      if (pass) {
        passed += 1;
      } else {
        failed.push({ id: evalCase.id, reason });
      }
      console.log(`${pass ? '✓' : '✗'} ${evalCase.id}: ${evalCase.prompt}`);
      console.log(`   ${reason}`);
      if (!pass && textBlocks.length > 0) {
        console.log(
          `   Texto del modelo: ${textBlocks.join(' ').slice(0, 200)}`,
        );
      }
    }

    console.log(
      `\n${passed}/${EVAL_DATASET.length} casos pasaron (${((passed / EVAL_DATASET.length) * 100).toFixed(0)}%).`,
    );
    if (failed.length > 0) {
      console.log('\nCasos que fallaron:');
      for (const f of failed) {
        console.log(`  - ${f.id}: ${f.reason}`);
      }
    }
  } finally {
    await cleanupEvalFixtures(prisma, fixtures.userId);
    await prisma.$disconnect();
    console.log('\nFixtures de eval limpiados.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
