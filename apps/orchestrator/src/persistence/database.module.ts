import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import type { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { APP_CONFIG } from "../config/app-config";
import type { AppConfig } from "../config/app-config";
import { entities } from "./entities";

/**
 * Configures the TypeORM connection from the validated {@link AppConfig}
 * instead of reading `process.env` inline. Supports the SQL.js local-dev
 * backend and Postgres for production.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => buildDataSourceOptions(config),
    }),
  ],
})
export class DatabaseModule {}

function buildDataSourceOptions(config: AppConfig): TypeOrmModuleOptions {
  if (config.database.type === "sqljs") {
    return {
      type: "sqljs",
      entities,
      location: config.database.location,
      autoSave: true,
      synchronize: true,
    };
  }
  return {
    type: "postgres",
    url: config.database.url,
    entities,
    synchronize: config.synchronize,
  };
}
