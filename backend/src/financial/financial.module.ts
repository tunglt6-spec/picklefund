import { Module } from '@nestjs/common';
import { FinancialCalculatorService } from './financial-calculator.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [FinancialCalculatorService],
  exports: [FinancialCalculatorService],
})
export class FinancialModule {}
