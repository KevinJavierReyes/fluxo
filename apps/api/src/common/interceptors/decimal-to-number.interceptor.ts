import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { decimalsToNumbers } from '../decimal.util';

/**
 * Unifica el contrato de salida de la API: los `Prisma.Decimal` de los
 * endpoints CRUD se serializaban como string ("1500.00") porque
 * `JSON.stringify` no sabe qué hacer con ellos, mientras que los endpoints
 * calculados (dashboard, cashflow) ya devolvían `number` por hacer
 * `Number(...)` a mano. Este interceptor recorre cualquier respuesta y
 * convierte cada `Decimal` a `number`, así todo el mundo devuelve lo mismo
 * sin tener que tocar cada service uno por uno.
 */
@Injectable()
export class DecimalToNumberInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(map((data: unknown) => decimalsToNumbers(data)));
  }
}
