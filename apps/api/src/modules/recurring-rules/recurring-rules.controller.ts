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
import { CreateRecurringRuleDto, UpdateRecurringRuleDto } from './dto';
import { RecurringRulesService } from './recurring-rules.service';

@ApiTags('recurring-rules')
@ApiBearerAuth()
@Controller('recurring-rules')
export class RecurringRulesController {
  constructor(private readonly recurringRulesService: RecurringRulesService) {}

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.recurringRulesService.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.recurringRulesService.findOne(user.id, id);
  }

  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateRecurringRuleDto,
  ) {
    return this.recurringRulesService.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateRecurringRuleDto,
  ) {
    return this.recurringRulesService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.recurringRulesService.remove(user.id, id);
  }
}
