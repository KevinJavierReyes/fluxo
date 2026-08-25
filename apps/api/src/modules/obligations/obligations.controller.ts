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
  CreateObligationDto,
  LinkObligationRecurringDto,
  UpdateObligationDto,
} from './dto';
import { ObligationsService } from './obligations.service';

@ApiTags('obligations')
@ApiBearerAuth()
@Controller('obligations')
export class ObligationsController {
  constructor(private readonly obligationsService: ObligationsService) {}

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.obligationsService.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.obligationsService.findOne(user.id, id);
  }

  @Post()
  create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateObligationDto,
  ) {
    return this.obligationsService.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateObligationDto,
  ) {
    return this.obligationsService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.obligationsService.remove(user.id, id);
  }

  @Post(':id/link-recurring')
  linkRecurring(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: LinkObligationRecurringDto,
  ) {
    return this.obligationsService.linkRecurring(user.id, id, dto);
  }
}
