import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
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

    return response.status(500).json({
      statusCode: 500,
      message: 'Error interno del servidor',
    });
  }
}
