import { Module } from "@nestjs/common";
import { APP_CONFIG } from "../config/app-config";
import type { AppConfig } from "../config/app-config";
import { HttpWorkerStrategy } from "./http-worker.strategy";
import { MockWorkerStrategy } from "./mock-worker.strategy";
import { SqsWorkerStrategy } from "./sqs-worker.strategy";
import { WORKER_DISPATCH } from "./worker-dispatch.strategy";

/** Selects the worker-dispatch strategy from config; consumers inject {@link WORKER_DISPATCH}. */
@Module({
  providers: [
    {
      provide: WORKER_DISPATCH,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => {
        switch (config.worker.mode) {
          case "mock":
            return new MockWorkerStrategy();
          case "sqs":
            return new SqsWorkerStrategy(config.worker);
          default:
            return new HttpWorkerStrategy(config.worker.httpUrl);
        }
      },
    },
  ],
  exports: [WORKER_DISPATCH],
})
export class WorkerModule {}
