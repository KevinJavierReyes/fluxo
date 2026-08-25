import { Module } from '@nestjs/common';
import { ExpenseTemplatesController } from './expense-templates.controller';
import { ExpenseTemplatesService } from './expense-templates.service';

@Module({
  controllers: [ExpenseTemplatesController],
  providers: [ExpenseTemplatesService],
})
export class ExpenseTemplatesModule {}
