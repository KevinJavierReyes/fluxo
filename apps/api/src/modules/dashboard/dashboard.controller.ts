import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';
import { OverviewQueryDto } from './dto';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(@CurrentUser() user: CurrentUserPayload) {
    return this.dashboardService.getSummary(user.id);
  }

  @Get('overview')
  getOverview(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: OverviewQueryDto,
  ) {
    return this.dashboardService.getOverview(user.id, query);
  }
}
