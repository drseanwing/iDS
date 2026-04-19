import { Module } from '@nestjs/common';
import { PicosController } from './picos.controller';
import { PicosService } from './picos.service';

@Module({
  controllers: [PicosController],
  providers: [PicosService],
  exports: [PicosService],
})
export class PicosModule {}

