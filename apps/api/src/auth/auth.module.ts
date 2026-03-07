import { Module } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { RbacGuard } from './rbac.guard';
import { AuthController } from './auth.controller';

@Module({
  controllers: [AuthController],
  providers: [AuthGuard, RbacGuard],
  exports: [AuthGuard, RbacGuard],
})
export class AuthModule {}
