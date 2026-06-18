import { Global, Module } from "@nestjs/common";
import { APP_CONFIG } from "./app-config";
import { buildAppConfig } from "./configuration";

/**
 * Global module that builds and validates {@link AppConfig} once at boot and
 * exposes it through the {@link APP_CONFIG} token. Being global, every other
 * module can inject the config without importing this module explicitly.
 */
@Global()
@Module({
  providers: [{ provide: APP_CONFIG, useFactory: () => buildAppConfig() }],
  exports: [APP_CONFIG],
})
export class AppConfigModule {}
