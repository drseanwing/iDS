import { Module } from '@nestjs/common';
import { InternalDocumentsController } from './internal-documents.controller';
import { InternalDocumentsService } from './internal-documents.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [InternalDocumentsController],
  providers: [InternalDocumentsService],
  exports: [InternalDocumentsService],
})
export class InternalDocumentsModule {}
