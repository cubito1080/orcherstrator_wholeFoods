import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import type { JwtModuleOptions, JwtSignOptions } from "@nestjs/jwt";
import { PersistenceModule } from "../persistence/persistence.module";
import { APP_CONFIG } from "../config/app-config";
import type { AppConfig } from "../config/app-config";
import { AuthController } from "./auth.controller";
import { AuthEnforcementGuard } from "./auth-enforcement.guard";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Module({
  imports: [
    PersistenceModule,
    JwtModule.registerAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): JwtModuleOptions => ({
        secret: config.jwt.secret,
        // `expiresIn` is a configured string like "8h"; widen to whatever the
        // installed jsonwebtoken typings expect (string | number or template literal).
        signOptions: { expiresIn: config.jwt.expiresIn as JwtSignOptions["expiresIn"] },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    { provide: APP_GUARD, useClass: AuthEnforcementGuard },
  ],
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
