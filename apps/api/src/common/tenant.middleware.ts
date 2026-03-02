import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    // Extract organization context from header or JWT
    const orgId = req.headers['x-organization-id'] as string;
    if (orgId) {
      (req as any).organizationId = orgId;
    }
    next();
  }
}
