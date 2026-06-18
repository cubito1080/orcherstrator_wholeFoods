import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { APP_CONFIG } from "../config/app-config";
import type { AppConfig } from "../config/app-config";
import type { AuthenticatedRequest, AuthUser } from "./auth.types";
import { IS_PUBLIC_ROUTE } from "./public.decorator";

/**
 * Global opt-in auth guard. Local MVP mode remains open while
 * `AUTH_ENFORCE=false`, but production can require JWTs for every route except
 * those explicitly marked `@Public()`.
 */
@Injectable()
export class AuthEnforcementGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_ROUTE, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");

    if (!this.config.auth.enforce) {
      if (token) {
        try {
          request.user = this.jwt.verify<AuthUser>(token);
        } catch {
          // Local open mode should not fail requests just because an optional
          // token is stale or malformed.
        }
      }
      return true;
    }

    if (!token) {
      throw new UnauthorizedException("missing bearer token");
    }
    try {
      request.user = this.jwt.verify<AuthUser>(token);
      return true;
    } catch {
      throw new UnauthorizedException("invalid token");
    }
  }
}
