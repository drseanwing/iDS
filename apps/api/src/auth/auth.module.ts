import { Module } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { RbacGuard } from './rbac.guard';
import { AuthController } from './auth.controller';
import { AuthUserService } from './auth-user.service';

@Module({
  controllers: [AuthController],
  providers: [AuthGuard, RbacGuard, AuthUserService],
  exports: [AuthGuard, RbacGuard, AuthUserService],
})
export class AuthModule {}
