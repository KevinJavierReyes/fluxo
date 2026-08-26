import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { NetWorthService } from './net-worth.service';

@ApiTags('net-worth')
@ApiBearerAuth()
@Controller('net-worth')
export class NetWorthController {
  constructor(private readonly netWorthService: NetWorthService) {}

  @Get()
  getNetWorth(@CurrentUser() user: CurrentUserPayload) {
    return this.netWorthService.getNetWorth(user.id, user.timezone);
  }
}
