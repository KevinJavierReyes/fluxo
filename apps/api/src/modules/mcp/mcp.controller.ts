import {
  Controller,
  Delete,
  Get,
  MethodNotAllowedException,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { McpAuthGuard } from './guards/mcp-auth.guard';
import { McpServerFactory } from './mcp-server.factory';

@ApiExcludeController()
@Public()
@UseGuards(McpAuthGuard)
@Controller('mcp')
export class McpController {
  constructor(private readonly serverFactory: McpServerFactory) {}

  @Post()
  async handle(@Req() req: Request, @Res() res: Response) {
    const user = req.user as CurrentUserPayload;
    const scopes = req.mcpAuth?.scopes ?? [];

    const server = this.serverFactory.create(
      { userId: user.id, timezone: user.timezone },
      scopes,
      req.mcpAuth?.tokenId ?? null,
    );
    // Stateless: sin sessionIdGenerator, una instancia de server+transport
    // por request. enableJsonResponse evita forzar un stream SSE para el
    // caso simple de pedido/respuesta.
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on('close', () => {
      void transport.close();
      void server.close();
    });

    await server.connect(transport);
    // El body ya lo parseó el body-parser de Express/Nest; hay que pasarlo
    // explícito como tercer argumento — si no, el transporte intenta leer
    // un stream ya consumido y el request se queda colgado sin error.
    await transport.handleRequest(req, res, req.body as unknown);
  }

  @Get()
  getNotAllowed() {
    throw new MethodNotAllowedException(
      'Este servidor MCP es sin estado: usa POST.',
    );
  }

  @Delete()
  deleteNotAllowed() {
    throw new MethodNotAllowedException(
      'Este servidor MCP es sin estado: no hay sesión que cerrar.',
    );
  }
}
