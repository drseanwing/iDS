import { Module } from '@nestjs/common';
import { CoiController } from './coi.controller';
import { CoiService } from './coi.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [CoiController],
  providers: [CoiService],
  exports: [CoiService],
})
export class CoiModule {}
