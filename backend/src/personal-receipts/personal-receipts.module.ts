import { Module } from '@nestjs/common';
import { PersonalReceiptsService } from './personal-receipts.service';
import { PersonalReceiptsController } from './personal-receipts.controller';
import { FinancialModule } from '../financial/financial.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [FinancialModule, EmailModule],
  providers: [PersonalReceiptsService],
  controllers: [PersonalReceiptsController],
})
export class PersonalReceiptsModule {}
