import { Module, Global } from '@nestjs/common';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';
import { ActivityLoggingInterceptor } from './activity.interceptor';

@Global()
@Module({
  controllers: [ActivityController],
  providers: [ActivityService, ActivityLoggingInterceptor],
  exports: [ActivityService, ActivityLoggingInterceptor],
})
export class ActivityModule {}
