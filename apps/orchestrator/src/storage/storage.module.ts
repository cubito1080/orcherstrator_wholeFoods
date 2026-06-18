import { Module } from "@nestjs/common";
import { APP_CONFIG } from "../config/app-config";
import type { AppConfig } from "../config/app-config";
import { LocalStorageStrategy } from "./local-storage.strategy";
import { S3StorageStrategy } from "./s3-storage.strategy";
import { STORAGE } from "./storage.strategy";

/** Selects the storage strategy from config; consumers inject the {@link STORAGE} token. */
@Module({
  providers: [
    {
      provide: STORAGE,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) =>
        config.storage.mode === "local"
          ? new LocalStorageStrategy(config.storage.localDir)
          : new S3StorageStrategy(config.storage),
    },
  ],
  exports: [STORAGE],
})
export class StorageModule {}
