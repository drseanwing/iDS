import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { MagicAppParserService } from './magicapp-parser.service';
import { MagicAppImportService } from './magicapp-import.service';
import { MagicAppController } from './magicapp.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({ limits: { fileSize: 5 * 1024 * 1024 } }),
  ],
  controllers: [MagicAppController],
  providers: [MagicAppParserService, MagicAppImportService],
})
export class MagicAppModule {}
