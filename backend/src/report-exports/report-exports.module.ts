import { Module } from '@nestjs/common';
import { ReportExportsController } from './report-exports.controller';

@Module({
  controllers: [ReportExportsController],
})
export class ReportExportsModule {}
