import { Module } from '@nestjs/common';
import { RevmanParserService } from './revman-parser.service';
import { RevmanImportService } from './revman-import.service';
import { RevmanController } from './revman.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RevmanController],
  providers: [RevmanParserService, RevmanImportService],
})
export class RevmanModule {}
