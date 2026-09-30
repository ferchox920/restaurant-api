import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

@Injectable()
export class CookieAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    // JwtAuthGuard ran first: without Authorization it validated the cookie itself.
    if (
      request.headers.authorization ||
      !request.user?.sessionJti ||
      !/(?:^|;\s*)restaurant_session=/.test(request.headers.cookie ?? '')
    ) {
      throw new UnauthorizedException('SSE requires cookie authentication.');
    }
    return true;
  }
}
