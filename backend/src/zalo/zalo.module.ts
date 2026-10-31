import { Module } from '@nestjs/common';
import { FinancialModule } from '../financial/financial.module';
import { ZaloController } from './zalo.controller';
import { ZaloService } from './zalo.service';

@Module({ imports: [FinancialModule], controllers: [ZaloController], providers: [ZaloService], exports: [ZaloService] })
export class ZaloModule {}
