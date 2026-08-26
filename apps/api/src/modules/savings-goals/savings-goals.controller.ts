import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import {
  ContributeSavingsGoalDto,
  CreateSavingsGoalDto,
  UpdateSavingsGoalDto,
} from './dto';
import { SavingsGoalsService } from './savings-goals.service';

@ApiTags('savings-goals')
@ApiBearerAuth()
@Controller('savings-goals')
export class SavingsGoalsController {
  constructor(private readonly savingsGoalsService: SavingsGoalsService) {}

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.savingsGoalsService.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.savingsGoalsService.findOne(user.id, id);
  }

  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateSavingsGoalDto,
  ) {
    return this.savingsGoalsService.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateSavingsGoalDto,
  ) {
    return this.savingsGoalsService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.savingsGoalsService.remove(user.id, id);
  }

  @Post(':id/contribute')
  async contribute(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: ContributeSavingsGoalDto,
  ) {
    const { goal } = await this.savingsGoalsService.contribute(
      user.id,
      id,
      dto,
    );
    return goal;
  }
}
