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
import { CreateTransferDto, ListTransfersQueryDto } from './dto';
import { TransfersService } from './transfers.service';

@ApiTags('transfers')
@ApiBearerAuth()
@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Get()
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListTransfersQueryDto,
  ) {
    return this.transfersService.findAll(user.id, query);
  }

  @Post()
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateTransferDto,
  ) {
    const { transfer } = await this.transfersService.create(user.id, dto);
    return transfer;
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.transfersService.remove(user.id, id);
  }
}
