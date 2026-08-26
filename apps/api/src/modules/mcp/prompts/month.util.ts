import { todayForUser } from '../../../common/date.util';
import type { ToolUserContext } from '../tools/types';

/** El arg `mes` (YYYY-MM) si vino; si no, el mes actual en la zona horaria del usuario. */
export function resolveMonthArg(
  mes: string | undefined,
  ctx: ToolUserContext,
): string {
  if (mes) {
    return mes;
  }
  const today = todayForUser(ctx.timezone);
  return `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}`;
}
