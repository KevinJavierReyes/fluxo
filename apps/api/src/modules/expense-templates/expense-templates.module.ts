import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module';
import { ExpenseTemplatesController } from './expense-templates.controller';
import { ExpenseTemplatesService } from './expense-templates.service';

@Module({
  imports: [CategoriesModule],
  controllers: [ExpenseTemplatesController],
  providers: [ExpenseTemplatesService],
  exports: [ExpenseTemplatesService],
})
export class ExpenseTemplatesModule {}
