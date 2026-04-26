import { Module } from '@nestjs/common';
import { ReferencesController } from './references.controller';
import { ReferencesService } from './references.service';
import { RisParserService } from './ris-parser.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [ReferencesController],
  providers: [ReferencesService, RisParserService],
  exports: [ReferencesService],
})
export class ReferencesModule {}
