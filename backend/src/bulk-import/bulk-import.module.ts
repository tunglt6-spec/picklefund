import { Module } from '@nestjs/common';
import { BulkImportService } from './bulk-import.service';
import { BulkImportController } from './bulk-import.controller';
import { FinancialModule } from '../financial/financial.module';
import { FundPeriodsModule } from '../fund-periods/fund-periods.module';

@Module({
  imports: [FinancialModule, FundPeriodsModule],
  providers: [BulkImportService],
  controllers: [BulkImportController],
})
export class BulkImportModule {}
