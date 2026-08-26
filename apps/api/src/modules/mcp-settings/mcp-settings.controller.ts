import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { CreatePatDto } from './dto';
import { McpSettingsService } from './mcp-settings.service';

@ApiTags('mcp-settings')
@ApiBearerAuth()
@Controller('mcp-settings')
export class McpSettingsController {
  constructor(private readonly service: McpSettingsService) {}

  @Get('connections')
  listConnections(@CurrentUser() user: CurrentUserPayload) {
    return this.service.listConnections(user.id);
  }

  /**
   * `clientId` va como query, no como path param: en CIMD es una URL
   * `https://...` completa (con `/`), y eso rompe el ruteo por segmento de
   * Express/Nest si se manda como `:clientId`.
   */
  @Delete('connections')
  disconnect(
    @CurrentUser() user: CurrentUserPayload,
    @Query('clientId') clientId: string,
  ) {
    return this.service.disconnect(user.id, clientId);
  }

  @Get('tokens')
  listPats(@CurrentUser() user: CurrentUserPayload) {
    return this.service.listPats(user.id);
  }

  @Post('tokens')
  createPat(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreatePatDto,
  ) {
    return this.service.createPat(user.id, dto);
  }

  @Delete('tokens/:id')
  revokePat(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.service.revokePat(user.id, id);
  }

  @Get('activity')
  listActivity(
    @CurrentUser() user: CurrentUserPayload,
    @Query('cursor') cursor?: string,
  ) {
    return this.service.listActivity(user.id, cursor);
  }

  @Post('activity/:id/undo')
  undo(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.service.undo(user.id, id);
  }
}
