import type { Request } from "express";

/** Claims carried in the JWT and attached to authenticated requests. */
export interface AuthUser {
  sub: string;
  email: string;
  tenantId: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}
