import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class CookieAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!/(?:^|;\s*)restaurant_session=/.test(request.headers.cookie ?? '')) {
      throw new UnauthorizedException('SSE requires cookie authentication.');
    }
    return true;
  }
}
