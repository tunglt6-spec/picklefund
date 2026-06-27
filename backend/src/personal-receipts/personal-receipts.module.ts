import { Module } from '@nestjs/common';
import { PersonalReceiptsService } from './personal-receipts.service';
import { PersonalReceiptsController } from './personal-receipts.controller';
import { FinancialModule } from '../financial/financial.module';

@Module({
  imports: [FinancialModule],
  providers: [PersonalReceiptsService],
  controllers: [PersonalReceiptsController],
})
export class PersonalReceiptsModule {}
