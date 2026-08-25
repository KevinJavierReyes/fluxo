import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { CashflowService } from './cashflow.service';
import { CashflowProjectionQueryDto } from './dto';

@ApiTags('cashflow')
@ApiBearerAuth()
@Controller('cashflow')
export class CashflowController {
  constructor(private readonly cashflowService: CashflowService) {}

  @Get('projection')
  getProjection(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: CashflowProjectionQueryDto,
  ) {
    return this.cashflowService.getProjection(user.id, query);
  }
}
