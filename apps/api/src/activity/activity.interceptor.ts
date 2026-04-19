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
          const path = request.route?.path ?? request.url ?? '';

          // Resolve guidelineId from multiple possible locations
          const guidelineId =
            response?.guidelineId ??
            request.body?.guidelineId ??
            request.params?.guidelineId ??
            // For guideline-level routes (e.g. /guidelines/:id/...) the param id IS the guideline
            (path.match(/^\/guidelines\/:id/) ? request.params?.id : undefined);

          if (!guidelineId) return;

          // Resolve the entity ID
          const entityId =
            response?.id ??
            request.params?.id ??
            request.params?.attachmentId ??
            request.params?.userId;

          if (!entityId) return;

          const entityType = this.deriveEntityType(path);
          const actionType = this.deriveActionType(method, path);

          const userId = request.user?.sub;
          if (!userId) return;

          // Capture rich change details for special workflows
          const changeDetails = this.buildChangeDetails(method, path, request, response);

          this.activityService
            .log({
              guidelineId,
              userId,
              actionType,
              entityType,
              entityId,
              entityTitle: response?.title ?? response?.name ?? response?.question ?? undefined,
              changeDetails: Object.keys(changeDetails).length > 0 ? changeDetails : undefined,
            })
            .catch(() => { /* activity logging is best-effort */ });
        } catch {
          // Never let logging failures affect the response
        }
      }),
    );
  }

  private deriveEntityType(path: string): string {
    if (path.includes('/permissions')) return 'GuidelinePermission';
    if (path.includes('/attachments')) return 'ReferenceAttachment';
    if (path.includes('/vote')) return 'PollVote';
    if (path.includes('/status') && path.includes('comments')) return 'Comment';
    if (path.includes('guidelines')) return 'Guideline';
    if (path.includes('sections')) return 'Section';
    if (path.includes('recommendations')) return 'Recommendation';
    if (path.includes('references')) return 'Reference';
    if (path.includes('picos')) return 'Pico';
    if (path.includes('outcomes')) return 'Outcome';
    if (path.includes('versions')) return 'GuidelineVersion';
    if (path.includes('comments')) return 'Comment';
    if (path.includes('polls')) return 'Poll';
    if (path.includes('coi')) return 'CoiRecord';
    return 'Unknown';
  }

  private deriveActionType(method: string, path: string): string {
    // Special path-based actions take precedence over HTTP method
    if (path.endsWith('/restore')) return 'RESTORE';
    if (path.endsWith('/status')) return 'STATUS_CHANGE';
    if (path.endsWith('/public')) return 'STATUS_CHANGE';
    if (path.includes('/permissions') && method === 'DELETE') return 'PERMISSION_REMOVE';
    if (path.includes('/permissions')) return 'PERMISSION_CHANGE';
    if (path.endsWith('/vote')) return 'VOTE';
    if (path.endsWith('/close') && path.includes('polls')) return 'CLOSE';
    if (path.includes('/attachments') && method === 'POST') return 'UPLOAD';
    if (path.includes('/attachments') && method === 'DELETE') return 'DELETE';
    // Version publish is a POST to /versions
    if (path.startsWith('/versions') && method === 'POST') return 'PUBLISH';
    // Guideline import
    if (path.endsWith('/import') || path.endsWith('import')) return 'IMPORT';

    switch (method) {
      case 'POST': return 'CREATE';
      case 'PUT': case 'PATCH': return 'UPDATE';
      case 'DELETE': return 'DELETE';
      default: return method;
    }
  }

  private buildChangeDetails(
    method: string,
    path: string,
    request: any,
    response: any,
  ): Record<string, unknown> {
    const details: Record<string, unknown> = {};

    // Status transitions — capture new status from body
    if (path.endsWith('/status') && request.body?.status) {
      details['newStatus'] = request.body.status;
    }

    // Public visibility toggle
    if (path.endsWith('/public') && request.body?.isPublic !== undefined) {
      details['isPublic'] = request.body.isPublic;
    }

    // Permission changes — capture target userId + role
    if (path.includes('/permissions')) {
      if (request.body?.userId) details['targetUserId'] = request.body.userId;
      if (request.body?.role) details['role'] = request.body.role;
      if (request.params?.userId) details['targetUserId'] = request.params.userId;
    }

    // Version publish — capture version number and type from response
    if (path.startsWith('/versions') && method === 'POST') {
      if (response?.versionNumber) details['versionNumber'] = response.versionNumber;
      if (response?.versionType ?? request.body?.versionType) {
        details['versionType'] = response?.versionType ?? request.body?.versionType;
      }
      if (request.body?.guidelineId) details['guidelineId'] = request.body.guidelineId;
    }

    // File uploads — capture filename and size
    if (path.includes('/attachments') && method === 'POST') {
      const file = request.file;
      if (file?.originalname) details['fileName'] = file.originalname;
      if (file?.size !== undefined) details['fileSize'] = file.size;
      if (file?.mimetype) details['mimeType'] = file.mimetype;
    }

    // Voting — capture the vote value
    if (path.endsWith('/vote') && request.body) {
      if (request.body.value !== undefined) details['voteValue'] = request.body.value;
      if (request.body.comment !== undefined) details['voteComment'] = request.body.comment;
    }

    return details;
  }
}
