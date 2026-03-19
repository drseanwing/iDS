# ADR-004: RBAC Authorization Model

## Status

Accepted

## Context

OpenGRADE manages multi-tenant guidelines with different user roles:

- **Organization Admins** - Manage org settings, members, billing
- **Guideline Authors** - Create and edit guidelines
- **Reviewers** - Review and approve guidelines
- **Panel Members** - Vote on recommendations
- **Public Users** - Read published guidelines

Authorization must work at two levels:

1. **Organization Level** - Who can manage this organization?
2. **Guideline Level** - Who can edit/approve/vote on this guideline?

A simple role-based approach (everyone is either admin or user) is too coarse. We needed fine-grained permissions that can vary per guideline.

## Decision

We implemented a two-tier RBAC model:

### Tier 1: Organization Roles

Each user has an organization role that applies across the organization:

```sql
CREATE TABLE organization_member (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role VARCHAR NOT NULL,  -- ADMIN, MEMBER
  UNIQUE(organization_id, user_id)
);
```

**Organization Roles:**
- **ADMIN** - Manage organization settings, members, and all guidelines
- **MEMBER** - Create guidelines and collaborate on them

### Tier 2: Guideline Permissions

Each user has per-guideline permissions:

```sql
CREATE TABLE guideline_permission (
  id UUID PRIMARY KEY,
  guideline_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role VARCHAR NOT NULL,  -- AUTHOR, REVIEWER, VOTER, VIEWER
  UNIQUE(guideline_id, user_id)
);
```

**Guideline Roles:**
- **AUTHOR** - Full edit permission, can change title, sections, recommendations
- **REVIEWER** - Can comment and approve sections, but not edit content
- **VOTER** - Can vote on polls and express preferences
- **VIEWER** - Read-only access to the guideline

### Authorization Guards

We use NestJS guards with a `@Roles()` decorator:

```typescript
// In controller
@Post(':id/publish')
@UseGuards(AuthGuard, RbacGuard)
@Roles('AUTHOR')
async publishGuideline(@Param('id') guidelineId: string) {
  // Only guideline authors can publish
}

@Post(':id/approve')
@UseGuards(AuthGuard, RbacGuard)
@Roles('REVIEWER', 'AUTHOR')
async approveSections(@Param('id') guidelineId: string) {
  // Only reviewers and authors can approve
}
```

### Guard Implementation

```typescript
@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles) return true;  // No role requirement

    const request = context.switchToHttp().getRequest();
    const userId = request.user.id;
    const guidelineId = request.params.id;

    // Check guideline permission
    const permission = await this.prisma.guidelinePermission.findUnique({
      where: { guidelineId_userId: { guidelineId, userId } },
    });

    if (!permission) {
      throw new ForbiddenException(
        `User ${userId} does not have access to guideline ${guidelineId}`
      );
    }

    const hasRole = roles.includes(permission.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `User role ${permission.role} does not have permission for this action`
      );
    }

    return true;
  }
}
```

### Roles Decorator

```typescript
import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
```

## Consequences

### Positive

1. **Flexible Permissions** - Different users can have different permissions on the same guideline
2. **Separation of Concerns** - Organization roles are independent of guideline roles
3. **Audit Trail** - Each permission change can be logged for compliance
4. **Scalable** - Easy to add new roles (e.g., STATISTICIAN, INFORMATION_SPECIALIST)
5. **Standards-Aligned** - Follows standard RBAC patterns from enterprise systems
6. **Fine-Grained Control** - Can restrict access at the guideline level without org-wide changes

### Negative

1. **Complexity** - Two-tier model is more complex than single-role systems
2. **Permission Explosion** - Many roles across two tiers can lead to confusion about who can do what
3. **Query Overhead** - Checking permissions requires database lookups on every protected endpoint
4. **Migration Burden** - Moving users between roles requires careful planning
5. **Test Coverage** - RBAC testing requires many scenarios to cover all role combinations

## Implementation Patterns

### Assign Guideline Role

```typescript
// In guidelines.service.ts
async addAuthor(guidelineId: string, userId: string) {
  return this.prisma.guidelinePermission.upsert({
    where: { guidelineId_userId: { guidelineId, userId } },
    create: {
      guidelineId,
      userId,
      role: 'AUTHOR',
    },
    update: {
      role: 'AUTHOR',
    },
  });
}
```

### Check Permission Programmatically

```typescript
// In service
async canEditGuideline(guidelineId: string, userId: string): Promise<boolean> {
  const permission = await this.prisma.guidelinePermission.findUnique({
    where: { guidelineId_userId: { guidelineId, userId } },
  });
  return permission?.role === 'AUTHOR';
}
```

### List User's Guidelines

```typescript
async findByUser(userId: string) {
  return this.prisma.guidelinePermission.findMany({
    where: { userId },
    include: {
      guideline: true,
    },
  });
}
```

## Related ADRs

- [ADR-002: NestJS Module Boundaries](./002-nestjs-module-boundaries.md) - Guards and interceptors in module architecture

## Further Reading

- [NIST RBAC Model](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-12.pdf)
- [NestJS Guards and Authorization](https://docs.nestjs.com/guards)
- [OpenGRADE Architecture: Section 1.3 Module Boundary Rules](../../opengrade-architecture.md)
