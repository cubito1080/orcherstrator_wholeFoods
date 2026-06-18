import type { ProcessRequest } from "@auto-estimator/contracts";
import { buildMockResult } from "./mock-result";
import type { DispatchOutcome, WorkerDispatchStrategy } from "./worker-dispatch.strategy";

/** Local-development strategy: returns a deterministic result synchronously. */
export class MockWorkerStrategy implements WorkerDispatchStrategy {
  async dispatch(payload: ProcessRequest): Promise<DispatchOutcome> {
    return { mode: "mock", result: buildMockResult(payload.project_id) };
  }
}
