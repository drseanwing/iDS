import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const request = http.getRequest<{ method: string; url: string }>();
    const method = request.method ?? 'UNKNOWN';
    const rawPath = (request.url ?? '/').split('?')[0];
    const path = MetricsService.normalizePath(rawPath);

    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = http.getResponse<{ statusCode: number }>();
          const status = String(response.statusCode ?? 200);
          const duration = Date.now() - start;

          this.metrics.increment('http_requests_total', { method, path, status });
          this.metrics.observe('http_request_duration_ms', duration, { method, path });
        },
        error: () => {
          const duration = Date.now() - start;
          this.metrics.increment('http_requests_total', { method, path, status: '500' });
          this.metrics.observe('http_request_duration_ms', duration, { method, path });
        },
      }),
    );
  }
}
