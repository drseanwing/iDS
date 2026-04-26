import { Module } from '@nestjs/common';
import { EmrElementsController } from './emr-elements.controller';
import { EmrElementsService } from './emr-elements.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EmrElementsController],
  providers: [EmrElementsService],
  exports: [EmrElementsService],
})
export class EmrElementsModule {}
