import { Module } from '@nestjs/common';
import { TagsController, RecommendationTagsController } from './tags.controller';
import { TagsService } from './tags.service';

@Module({
  controllers: [TagsController, RecommendationTagsController],
  providers: [TagsService],
  exports: [TagsService],
})
export class TagsModule {}
