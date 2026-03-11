import { Module } from '@nestjs/common';
import { PdfExportController } from './pdf-export.controller';
import { PdfExportService } from './pdf-export.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { GuidelinesModule } from '../guidelines/guidelines.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [GuidelinesModule, StorageModule],
  controllers: [PdfExportController],
  providers: [PdfExportService, PdfGeneratorService],
  exports: [PdfExportService],
})
export class PdfExportModule {}
