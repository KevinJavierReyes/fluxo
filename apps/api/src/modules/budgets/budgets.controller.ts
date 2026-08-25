import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { BudgetsService } from './budgets.service';
import { BudgetStatusQueryDto, CreateBudgetDto, UpdateBudgetDto } from './dto';

@ApiTags('budgets')
@ApiBearerAuth()
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Get('status')
  getStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: BudgetStatusQueryDto,
  ) {
    return this.budgetsService.getStatus(user.id, query);
  }

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.budgetsService.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.budgetsService.findOne(user.id, id);
  }

  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateBudgetDto,
  ) {
    return this.budgetsService.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    return this.budgetsService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.budgetsService.remove(user.id, id);
  }
}
