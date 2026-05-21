import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { ROLES_KEY } from './roles.decorator';
import { ENTITY_TYPE_KEY, RbacEntityType } from './entity-type.decorator';

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

    const entityType = this.reflector.get<RbacEntityType | undefined>(
      ENTITY_TYPE_KEY,
      context.getHandler(),
    );

    let guidelineId: string | null | undefined =
      request.params?.guidelineId ||
      request.body?.guidelineId ||
      request.query?.guidelineId;

    // For guideline routes with :id param (no entityType = it IS a guideline)
    if (!guidelineId && !entityType && request.params?.id) {
      guidelineId = request.params.id;
    }

    // For child entity routes, resolve guidelineId via DB lookup. Accept
    // either :id or :itemId as the entity primary key, depending on how the
    // route was declared.
    const entityId: string | undefined =
      request.params?.id || request.params?.itemId;
    if (
      !guidelineId &&
      entityType &&
      entityType !== 'guideline' &&
      entityId
    ) {
      guidelineId = await this.resolveGuidelineId(entityType, entityId);
    }

    if (!guidelineId) {
      throw new ForbiddenException(
        'This operation requires a guideline context',
      );
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

  private async resolveGuidelineId(
    entityType: RbacEntityType,
    id: string,
  ): Promise<string | null> {
    try {
      switch (entityType) {
        case 'recommendation':
          return (
            (
              await this.prisma.recommendation.findUnique({
                where: { id },
                select: { guidelineId: true },
              })
            )?.guidelineId ?? null
          );
        case 'pico':
          return (
            (
              await this.prisma.pico.findUnique({
                where: { id },
                select: { guidelineId: true },
              })
            )?.guidelineId ?? null
          );
        case 'section':
          return (
            (
              await this.prisma.section.findUnique({
                where: { id },
                select: { guidelineId: true },
              })
            )?.guidelineId ?? null
          );
        case 'outcome': {
          const o = await this.prisma.outcome.findUnique({
            where: { id },
            include: { pico: { select: { guidelineId: true } } },
          });
          return o?.pico?.guidelineId ?? null;
        }
        case 'poll':
          return (
            (
              await this.prisma.poll.findUnique({
                where: { id },
                select: { guidelineId: true },
              })
            )?.guidelineId ?? null
          );
        case 'milestone':
          return (
            (
              await this.prisma.milestone.findUnique({
                where: { id },
                select: { guidelineId: true },
              })
            )?.guidelineId ?? null
          );
        case 'coi':
          return (
            (
              await this.prisma.coiRecord.findUnique({
                where: { id },
                select: { guidelineId: true },
              })
            )?.guidelineId ?? null
          );
        case 'checklistItem':
          return (
            (
              await this.prisma.checklistItem.findUnique({
                where: { id },
                select: { guidelineId: true },
              })
            )?.guidelineId ?? null
          );
        default:
          return null;
      }
    } catch {
      return null;
    }
  }
}
