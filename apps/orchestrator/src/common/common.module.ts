import { Global, Module } from "@nestjs/common";
import { TransactionRunner } from "./transaction.runner";

/** Cross-cutting helpers shared by every feature module. */
@Global()
@Module({
  providers: [TransactionRunner],
  exports: [TransactionRunner],
})
export class CommonModule {}
