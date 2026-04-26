import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { GradeProParserService } from './gradepro-parser.service';
import { GradeProImportService } from './gradepro-import.service';
import { GradeProController } from './gradepro.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({ limits: { fileSize: 5 * 1024 * 1024 } }),
  ],
  controllers: [GradeProController],
  providers: [GradeProParserService, GradeProImportService],
})
export class GradeProModule {}
