import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { createHash } from 'crypto';
import { Response, Request } from 'express';

/**
 * Adds ETag and Last-Modified headers to FHIR responses.
 * Supports conditional requests via If-None-Match.
 */
@Injectable()
export class FhirEtagInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        const ctx = context.switchToHttp();
        const res = ctx.getResponse<Response>();
        const req = ctx.getRequest<Request>();

        if (!data) return data;

        // Compute ETag from response body
        const json = JSON.stringify(data);
        const hash = createHash('md5').update(json).digest('hex');
        const etag = `"${hash}"`;

        res.setHeader('ETag', etag);

        // Set Last-Modified from entity updatedAt if available
        const updatedAt = data.meta?.lastUpdated || data.timestamp;
        if (updatedAt) {
          res.setHeader('Last-Modified', new Date(updatedAt).toUTCString());
        }

        // Handle conditional request
        const ifNoneMatch = req.headers['if-none-match'];
        if (ifNoneMatch === etag) {
          res.status(304);
          return undefined;
        }

        return data;
      }),
    );
  }
}
