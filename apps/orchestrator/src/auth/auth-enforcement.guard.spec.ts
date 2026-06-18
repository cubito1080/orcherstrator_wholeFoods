import "reflect-metadata";
import { UnauthorizedException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { JwtService } from "@nestjs/jwt";
import type { AppConfig } from "../config/app-config";
import { AuthEnforcementGuard } from "./auth-enforcement.guard";
import { IS_PUBLIC_ROUTE } from "./public.decorator";

describe("AuthEnforcementGuard", () => {
  const baseConfig = {
    auth: { enforce: false },
  } as AppConfig;

  function makeGuard(config: Pick<AppConfig, "auth">, verify = jest.fn()) {
    return new AuthEnforcementGuard(
      new Reflector(),
      { verify } as unknown as JwtService,
      config as AppConfig,
    );
  }

  function makeContext(authorization?: string, handler: () => void = () => undefined) {
    const request = { headers: { authorization } } as Record<string, unknown>;
    const context = {
      getHandler: () => handler,
      getClass: () => class TestController {},
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    return { context, request };
  }

  it("allows public routes even when auth enforcement is enabled", () => {
    const handler = () => undefined;
    Reflect.defineMetadata(IS_PUBLIC_ROUTE, true, handler);
    const { context } = makeContext(undefined, handler);

    expect(makeGuard({ auth: { enforce: true } }).canActivate(context)).toBe(true);
  });

  it("allows unauthed requests in local open mode", () => {
    const { context } = makeContext();

    expect(makeGuard(baseConfig).canActivate(context)).toBe(true);
  });

  it("requires a bearer token when auth enforcement is enabled", () => {
    const { context } = makeContext();

    expect(() => makeGuard({ auth: { enforce: true } }).canActivate(context)).toThrow(
      UnauthorizedException,
    );
  });

  it("verifies and attaches the decoded user when auth enforcement is enabled", () => {
    const user = { sub: "u1", email: "u@example.com", tenantId: "t1" };
    const verify = jest.fn().mockReturnValue(user);
    const { context, request } = makeContext("Bearer token");

    expect(makeGuard({ auth: { enforce: true } }, verify).canActivate(context)).toBe(true);
    expect(verify).toHaveBeenCalledWith("token");
    expect(request.user).toEqual(user);
  });
});
