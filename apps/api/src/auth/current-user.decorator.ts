import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * User payload attached to the request by AuthGuard.
 * See apps/api/src/auth/auth.guard.ts.
 */
export interface AuthenticatedUser {
  sub: string;
  email?: string;
  name?: string;
  roles?: string[];
}

/**
 * Extracts the authenticated user (request.user) from the execution context.
 * Returns `undefined` when no user is attached (e.g. on @Public() routes).
 *
 * Usage:
 *   create(@CurrentUser() user: AuthenticatedUser | undefined) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request?.user;
  },
);

/**
 * Convenience decorator that returns the authenticated user's `sub` (userId).
 * Throws UnauthorizedException if no user is attached — use only on routes
 * that are guaranteed to be authenticated (i.e. not wrapped with @Public()).
 *
 * Usage:
 *   create(@CurrentUserId() userId: string) { ... }
 */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const sub = request?.user?.sub;
    if (!sub) {
      throw new UnauthorizedException('Missing authenticated user context');
    }
    return sub;
  },
);
