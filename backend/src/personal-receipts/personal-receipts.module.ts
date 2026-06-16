import { Module } from '@nestjs/common'
import { PersonalReceiptsService } from './personal-receipts.service'
import { PersonalReceiptsController } from './personal-receipts.controller'

@Module({ providers: [PersonalReceiptsService], controllers: [PersonalReceiptsController] })
export class PersonalReceiptsModule {}
