import { Module } from '@nestjs/common';
import { RecommendationsController, EtdFactorsController, EtdJudgmentsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { EtdService } from './etd.service';

@Module({
  controllers: [RecommendationsController, EtdFactorsController, EtdJudgmentsController],
  providers: [RecommendationsService, EtdService],
  exports: [RecommendationsService, EtdService],
})
export class RecommendationsModule {}
