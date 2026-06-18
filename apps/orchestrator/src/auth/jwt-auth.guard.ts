import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { AuthenticatedRequest, AuthUser } from "./auth.types";

/**
 * Verifies a Bearer JWT and attaches the decoded {@link AuthUser} to the request.
 * Apply with `@UseGuards(JwtAuthGuard)` for routes that must always require a
 * token, such as `GET /me`. Conditional app-wide enforcement is handled by
 * `AuthEnforcementGuard`.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token) {
      throw new UnauthorizedException("missing bearer token");
    }
    try {
      request.user = this.jwt.verify<AuthUser>(token);
    } catch {
      throw new UnauthorizedException("invalid token");
    }
    return true;
  }
}
