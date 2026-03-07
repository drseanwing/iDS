import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { ActivityService } from './activity.service';

@Injectable()
export class ActivityLoggingInterceptor implements NestInterceptor {
  constructor(private readonly activityService: ActivityService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only log mutating operations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((response) => {
        try {
          const guidelineId = response?.guidelineId ?? request.body?.guidelineId ?? request.params?.guidelineId;
          if (!guidelineId) return;

          const entityId = response?.id ?? request.params?.id;
          if (!entityId) return;

          // Derive action and entity type from the route
          const path = request.route?.path ?? request.url ?? '';
          const entityType = this.deriveEntityType(path);
          const actionType = this.deriveActionType(method);

          // TODO: extract userId from JWT when auth is wired
          const userId = '00000000-0000-0000-0000-000000000001';

          this.activityService.log({
            guidelineId,
            userId,
            actionType,
            entityType,
            entityId,
            entityTitle: response?.title ?? response?.name ?? undefined,
          }).catch(() => { /* activity logging is best-effort */ });
        } catch {
          // Never let logging failures affect the response
        }
      }),
    );
  }

  private deriveEntityType(path: string): string {
    if (path.includes('guidelines')) return 'Guideline';
    if (path.includes('sections')) return 'Section';
    if (path.includes('recommendations')) return 'Recommendation';
    if (path.includes('references')) return 'Reference';
    if (path.includes('picos')) return 'Pico';
    if (path.includes('outcomes')) return 'Outcome';
    if (path.includes('versions')) return 'GuidelineVersion';
    return 'Unknown';
  }

  private deriveActionType(method: string): string {
    switch (method) {
      case 'POST': return 'CREATE';
      case 'PUT': case 'PATCH': return 'UPDATE';
      case 'DELETE': return 'DELETE';
      default: return method;
    }
  }
}
