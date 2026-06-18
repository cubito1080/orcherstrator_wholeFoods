import type { ProcessRequest, ProcessResult } from "@auto-estimator/contracts";

/** DI token for the active {@link WorkerDispatchStrategy}. */
export const WORKER_DISPATCH = Symbol("WORKER_DISPATCH");

export interface DispatchOutcome {
  mode: "mock" | "http" | "sqs";
  /**
   * Present only when the worker produced a result synchronously (mock mode).
   * Real workers call back asynchronously via the webhook, so this is omitted.
   */
  result?: ProcessResult;
}

/** Abstraction over how a processing request reaches the AI worker. */
export interface WorkerDispatchStrategy {
  dispatch(payload: ProcessRequest): Promise<DispatchOutcome>;
}
