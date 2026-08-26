import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module';
import { RecurringRulesController } from './recurring-rules.controller';
import { RecurringRulesGenerator } from './recurring-rules.generator';
import { RecurringRulesService } from './recurring-rules.service';

@Module({
  imports: [CategoriesModule],
  controllers: [RecurringRulesController],
  providers: [RecurringRulesService, RecurringRulesGenerator],
  exports: [RecurringRulesService],
})
export class RecurringRulesModule {}
