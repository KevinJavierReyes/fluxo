import { resolveMonthArg } from './month.util';
import type { ToolUserContext } from '../tools/types';

describe('resolveMonthArg', () => {
  it('devuelve el arg tal cual si vino', () => {
    const ctx: ToolUserContext = { userId: 'u1', timezone: 'UTC' };
    expect(resolveMonthArg('2026-03', ctx)).toBe('2026-03');
  });

  it('calcula el mes actual en la zona horaria del usuario cuando no viene el arg', () => {
    const ctx: ToolUserContext = { userId: 'u1', timezone: 'America/Lima' };
    const result = resolveMonthArg(undefined, ctx);
    expect(result).toMatch(/^\d{4}-\d{2}$/);
  });

  it('padea el mes a dos dígitos', () => {
    const ctx: ToolUserContext = { userId: 'u1', timezone: 'UTC' };
    const result = resolveMonthArg(undefined, ctx);
    const [, month] = result.split('-');
    expect(month).toHaveLength(2);
  });
});
