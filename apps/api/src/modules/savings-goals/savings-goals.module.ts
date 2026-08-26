import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module';
import { SavingsGoalsController } from './savings-goals.controller';
import { SavingsGoalsService } from './savings-goals.service';

@Module({
  imports: [CategoriesModule],
  controllers: [SavingsGoalsController],
  providers: [SavingsGoalsService],
  exports: [SavingsGoalsService],
})
export class SavingsGoalsModule {}
