import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { PerformanceMetricsService } from '../observability/performance-metrics.service';

@Injectable()
export class ObservabilityInterceptor implements NestInterceptor {
  constructor(
    private readonly configService: ConfigService,
    private readonly metrics: PerformanceMetricsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!this.configService.get<boolean>('OBSERVABILITY_V1')) {
      return next.handle();
    }

    const startedAt = performance.now();
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    return next.handle().pipe(
      tap({
        finalize: () => {
          const duration = performance.now() - startedAt;
          if (!response.headersSent) {
            response.setHeader(
              'Server-Timing',
              `app;dur=${duration.toFixed(1)}`,
            );
          }

          const requestId = response.getHeader('X-Request-Id');
          const path = request.originalUrl.split('?')[0];
          this.metrics.record(`${request.method} ${path}`, {
            durationMs: duration,
            statusCode: response.statusCode,
          });
          process.stdout.write(
            `${JSON.stringify({
              type: 'http_request',
              requestId: typeof requestId === 'string' ? requestId : undefined,
              method: request.method,
              path,
              statusCode: response.statusCode,
              durationMs: Number(duration.toFixed(1)),
            })}\n`,
          );
        },
      }),
    );
  }
}
