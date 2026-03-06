import { Module } from '@nestjs/common';
import { CoiController } from './coi.controller';
import { CoiService } from './coi.service';

@Module({
  controllers: [CoiController],
  providers: [CoiService],
  exports: [CoiService],
})
export class CoiModule {}
