import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./current-user.decorator";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { Public } from "./public.decorator";
import type { AuthUser } from "./auth.types";

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("auth/register")
  @Public()
  register(@Body() body: { email: string; password: string; tenantName?: string }) {
    return this.auth.register(body);
  }

  @Post("auth/login")
  @Public()
  login(@Body() body: { email: string; password: string }) {
    return this.auth.login(body);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
