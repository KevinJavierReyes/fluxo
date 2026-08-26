import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception.code === 'P2002') {
      const mapped = new ConflictException(
        'Ya existe un registro con esos datos',
      );
      return response.status(mapped.getStatus()).json(mapped.getResponse());
    }

    if (exception.code === 'P2025') {
      const mapped = new NotFoundException('Registro no encontrado');
      return response.status(mapped.getStatus()).json(mapped.getResponse());
    }

    if (exception.code === 'P2003') {
      const mapped = new BadRequestException(
        'Referencia inválida en la solicitud',
      );
      return response.status(mapped.getStatus()).json(mapped.getResponse());
    }

    // Códigos no mapeados explícitamente: antes desaparecían sin dejar
    // rastro (500 genérico sin log). Se registra el código y el mensaje
    // completo de Prisma para poder diagnosticarlos.
    this.logger.error(
      `Error de Prisma sin mapear (${exception.code}): ${exception.message}`,
      exception.stack,
    );

    return response.status(500).json({
      statusCode: 500,
      message: 'Error interno del servidor',
    });
  }
}
