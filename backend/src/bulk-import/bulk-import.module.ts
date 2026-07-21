import { Module } from '@nestjs/common';
import { BulkImportService } from './bulk-import.service';
import { BulkImportController } from './bulk-import.controller';
import { FinancialModule } from '../financial/financial.module';

@Module({
  imports: [FinancialModule],
  providers: [BulkImportService],
  controllers: [BulkImportController],
})
export class BulkImportModule {}
