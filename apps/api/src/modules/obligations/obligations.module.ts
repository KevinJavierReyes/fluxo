import { Module } from '@nestjs/common';
import { RecurringRulesModule } from '../recurring-rules/recurring-rules.module';
import { ObligationsController } from './obligations.controller';
import { ObligationsService } from './obligations.service';

@Module({
  imports: [RecurringRulesModule],
  controllers: [ObligationsController],
  providers: [ObligationsService],
})
export class ObligationsModule {}
