import { Module } from '@nestjs/common';
import { GuidelinesController } from './guidelines.controller';
import { GuidelinesService } from './guidelines.service';
import { VersionsModule } from '../versions/versions.module';

@Module({
  imports: [VersionsModule],
  controllers: [GuidelinesController],
  providers: [GuidelinesService],
  exports: [GuidelinesService],
})
export class GuidelinesModule {}
