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
import {
  BulkDeleteTransactionsDto,
  CreateTransactionDto,
  ListTransactionsQueryDto,
  UpdateTransactionDto,
} from './dto';
import { TransactionsService } from './transactions.service';

@ApiTags('transactions')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ListTransactionsQueryDto,
  ) {
    return this.transactionsService.findAll(user.id, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.transactionsService.findOne(user.id, id);
  }

  @Post()
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateTransactionDto,
  ) {
    // El wrapper {transaction, alreadyExisted} es para que MCP pueda avisar
    // "ya la habías registrado" en un retry; REST mantiene su contrato de
    // siempre devolver la transacción directa.
    const { transaction } = await this.transactionsService.create(user.id, dto);
    return transaction;
  }

  @Patch(':id')
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.transactionsService.remove(user.id, id);
  }

  @Post('bulk-delete')
  removeMany(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: BulkDeleteTransactionsDto,
  ) {
    return this.transactionsService.removeMany(user.id, dto.ids);
  }
}
