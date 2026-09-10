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
    const accountId = query.accountIds?.length
      ? query.accountIds
      : query.accountId;
    return this.cashflowService.getProjection(user.id, {
      from: query.from,
      to: query.to,
      accountId,
    });
  }
}
