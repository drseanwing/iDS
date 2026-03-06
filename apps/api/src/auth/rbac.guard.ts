// Usage:
//   @UseGuards(AuthGuard, RbacGuard)
//   @Roles('ADMIN', 'AUTHOR')
//   @Post()
//   createSection() { ... }
//
//   @UseGuards(AuthGuard, RbacGuard)
//   @Roles('ADMIN')
//   @Delete(':id')
//   deleteGuideline() { ... }
//
//   @UseGuards(AuthGuard, RbacGuard)
//   @Roles('ADMIN', 'AUTHOR', 'REVIEWER')
//   @Get(':guidelineId/sections')
//   getSections() { ... }

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.sub) {
      throw new ForbiddenException('User not authenticated');
    }

    const userId: string = user.sub;

    const guidelineId =
      request.params?.guidelineId ||
      request.params?.id ||
      request.body?.guidelineId ||
      request.query?.guidelineId;

    if (!guidelineId) {
      return true;
    }

    // Check if user is an org ADMIN for the guideline's organization
    const guideline = await this.prisma.guideline.findUnique({
      where: { id: guidelineId },
      select: { organizationId: true },
    });

    if (guideline?.organizationId) {
      const orgMembership = await this.prisma.organizationMember.findFirst({
        where: {
          organizationId: guideline.organizationId,
          userId,
          role: 'ADMIN',
        },
      });

      if (orgMembership) {
        return true;
      }
    }

    // Check guideline-level permission
    const permission = await this.prisma.guidelinePermission.findFirst({
      where: {
        guidelineId,
        userId,
      },
    });

    if (permission && requiredRoles.includes(permission.role)) {
      return true;
    }

    throw new ForbiddenException(
      'You do not have the required permissions to access this resource',
    );
  }
}
