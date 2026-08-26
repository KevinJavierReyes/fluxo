import type { GetPromptResult } from '@modelcontextprotocol/sdk/types.js';
import { cierreDeMesPrompt } from './cierre-de-mes.prompt';
import { dondeSeFueMiDineroPrompt } from './donde-se-fue-mi-dinero.prompt';
import { revisionMensualPrompt } from './revision-mensual.prompt';
import type { ToolUserContext } from '../tools/types';

const ctx: ToolUserContext = { userId: 'user-1', timezone: 'UTC' };

function textOf(result: GetPromptResult): string {
  const content = result.messages[0].content;
  if (content.type !== 'text') {
    throw new Error('Expected text content');
  }
  return content.text;
}

describe('revisionMensualPrompt', () => {
  const prompt = revisionMensualPrompt();

  it('tiene scope finances:read', () => {
    expect(prompt.requiredScope).toBe('finances:read');
  });

  it('usa el mes explícito cuando se lo dan', () => {
    const result = prompt.handler({ mes: '2026-05' }, ctx);
    expect(textOf(result)).toContain('2026-05');
    expect(textOf(result)).toContain('get_dashboard');
    expect(textOf(result)).toContain('get_budget_status');
  });

  it('cae al mes actual cuando no se pasa mes', () => {
    const result = prompt.handler({}, ctx);
    expect(textOf(result)).toMatch(/\d{4}-\d{2}/);
  });
});

describe('cierreDeMesPrompt', () => {
  const prompt = cierreDeMesPrompt();

  it('tiene scope finances:read y menciona las 3 verificaciones', () => {
    expect(prompt.requiredScope).toBe('finances:read');
    const result = prompt.handler({ mes: '2026-05' }, ctx);
    const text = textOf(result);
    expect(text).toContain('get_budget_status');
    expect(text).toContain('recurring_rule');
    expect(text).toContain('search_transactions');
  });
});

describe('dondeSeFueMiDineroPrompt', () => {
  const prompt = dondeSeFueMiDineroPrompt();

  it('tiene scope finances:read y pide desglose por categoría', () => {
    expect(prompt.requiredScope).toBe('finances:read');
    const result = prompt.handler({ mes: '2026-05' }, ctx);
    const text = textOf(result);
    expect(text).toContain('get_dashboard');
    expect(text).toContain('search_transactions');
    expect(text).toContain('2026-05');
  });
});
