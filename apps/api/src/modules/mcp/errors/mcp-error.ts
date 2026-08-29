import { HttpException, Logger } from '@nestjs/common';
import { ZodError } from 'zod';
import type {
  ResolveCandidate,
  ResolveResult,
} from '../resolvers/resolve-result';

export type McpErrorCode =
  | 'AMBIGUOUS_MATCH'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'CONFIRM_REQUIRED'
  | 'INTERNAL';

export class McpToolError extends Error {
  constructor(
    readonly code: McpErrorCode,
    message: string,
    readonly candidates?: ResolveCandidate[],
  ) {
    super(message);
  }
}

interface ToolTextResult {
  [key: string]: unknown;
  content: { type: 'text'; text: string }[];
  isError: true;
}

function renderCandidates(candidates?: ResolveCandidate[]): string {
  if (!candidates || candidates.length === 0) {
    return '';
  }
  const lines = candidates
    .slice(0, 10)
    .map(
      (c) => `  · "${c.label}"${c.detail ? ` (${c.detail})` : ''} — id=${c.id}`,
    );
  return `\n\nCoincidencias posibles:\n${lines.join('\n')}`;
}

/** Convierte cualquier error de un handler de tool en un resultado MCP seguro: nunca un stack trace ni un mensaje de Prisma crudo. */
export function toToolErrorResult(
  error: unknown,
  logger: Logger,
): ToolTextResult {
  if (error instanceof McpToolError) {
    return {
      content: [
        {
          type: 'text',
          text: error.message + renderCandidates(error.candidates),
        },
      ],
      isError: true,
    };
  }
  if (error instanceof ZodError) {
    const issues = error.issues
      .map((issue) => `${issue.path.join('.') || '(raíz)'}: ${issue.message}`)
      .join('; ');
    return {
      content: [
        {
          type: 'text',
          text: `Datos inválidos — ${issues}. Revisá los campos esperados en la descripción de fluxo_create para este recurso.`,
        },
      ],
      isError: true,
    };
  }
  if (error instanceof HttpException) {
    const response = error.getResponse();
    const message =
      typeof response === 'string'
        ? response
        : ((response as { message?: string | string[] }).message ??
          error.message);
    const text = Array.isArray(message) ? message.join('; ') : message;
    return { content: [{ type: 'text', text }], isError: true };
  }

  logger.error(
    'Error no manejado en una tool MCP',
    error instanceof Error ? error.stack : error,
  );
  return {
    content: [
      {
        type: 'text',
        text: 'Ocurrió un error inesperado procesando la solicitud. Intenta de nuevo.',
      },
    ],
    isError: true,
  };
}

/**
 * Convierte un ResolveResult en la entidad resuelta, o lanza un
 * McpToolError con las candidatas si no hay match único — el punto en
 * común que usan todas las tools para no seguir adelante con un id
 * adivinado.
 */
export function requireResolved<T>(result: ResolveResult<T>, label: string): T {
  if (result.status === 'resolved') {
    return result.entity;
  }
  if (result.status === 'ambiguous') {
    throw new McpToolError(
      'AMBIGUOUS_MATCH',
      `Hay más de una coincidencia para "${label}". Sé más específico o usa el id exacto.`,
      result.candidates,
    );
  }
  throw new McpToolError(
    'NOT_FOUND',
    `No encontré "${label}".`,
    result.candidates,
  );
}

/** Envuelve un handler de tool para que cualquier excepción se traduzca a un resultado MCP seguro en vez de propagarse. */
export function withToolSafety<Args extends unknown[], R>(
  logger: Logger,
  handler: (...args: Args) => Promise<R>,
) {
  return async (...args: Args): Promise<R | ToolTextResult> => {
    try {
      return await handler(...args);
    } catch (error) {
      return toToolErrorResult(error, logger);
    }
  };
}
