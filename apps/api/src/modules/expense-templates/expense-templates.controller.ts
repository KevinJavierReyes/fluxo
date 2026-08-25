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
  ApplyExpenseTemplateDto,
  CreateExpenseTemplateDto,
  UpdateExpenseTemplateDto,
} from './dto';
import { ExpenseTemplatesService } from './expense-templates.service';

@ApiTags('expense-templates')
@ApiBearerAuth()
@Controller('expense-templates')
export class ExpenseTemplatesController {
  constructor(
    private readonly expenseTemplatesService: ExpenseTemplatesService,
  ) {}

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.expenseTemplatesService.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.expenseTemplatesService.findOne(user.id, id);
  }

  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateExpenseTemplateDto,
  ) {
    return this.expenseTemplatesService.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseTemplateDto,
  ) {
    return this.expenseTemplatesService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.expenseTemplatesService.remove(user.id, id);
  }

  @Post(':id/apply')
  apply(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: ApplyExpenseTemplateDto,
  ) {
    return this.expenseTemplatesService.apply(user.id, id, dto);
  }
}
