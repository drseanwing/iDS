import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import KeyvRedis from '@keyv/redis';
import { TerminologyController } from './terminology.controller';
import { TerminologyService } from './terminology.service';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        stores: [
          new KeyvRedis(
            configService.get<string>('redis.url', 'redis://localhost:6379'),
          ),
        ],
        ttl: 86400 * 1000, // 24 hours in milliseconds (cache-manager v7 uses ms)
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [TerminologyController],
  providers: [TerminologyService],
  exports: [TerminologyService],
})
export class TerminologyModule {}
