import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { GuidelinesModule } from './guidelines/guidelines.module';
import { SectionsModule } from './sections/sections.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { ReferencesModule } from './references/references.module';
import { PicosModule } from './picos/picos.module';
import { OutcomesModule } from './outcomes/outcomes.module';
import { LinksModule } from './links/links.module';
import { VersionsModule } from './versions/versions.module';
import { ActivityModule } from './activity/activity.module';
import { ActivityLoggingInterceptor } from './activity/activity.interceptor';
import { CommentsModule } from './comments/comments.module';
import { CoiModule } from './coi/coi.module';
import { PollsModule } from './polls/polls.module';
import { MilestonesModule } from './milestones/milestones.module';
import { TasksModule } from './tasks/tasks.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL', 'info'),
          transport:
            config.get('NODE_ENV') !== 'production'
              ? { target: 'pino-pretty', options: { colorize: true } }
              : undefined,
          genReqId: (req: any) =>
            req.headers['x-correlation-id'] || crypto.randomUUID(),
          customProps: () => ({
            context: 'HTTP',
          }),
        },
      }),
    }),
    PrismaModule,
    AuthModule,
    OrganizationsModule,
    GuidelinesModule,
    SectionsModule,
    RecommendationsModule,
    ReferencesModule,
    PicosModule,
    OutcomesModule,
    LinksModule,
    VersionsModule,
    ActivityModule,
    CommentsModule,
    CoiModule,
    PollsModule,
    MilestonesModule,
    TasksModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ActivityLoggingInterceptor },
  ],
})
export class AppModule {}
