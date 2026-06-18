import { ServiceUnavailableException } from "@nestjs/common";
import type { ProcessRequest } from "@auto-estimator/contracts";
import type { DispatchOutcome, WorkerDispatchStrategy } from "./worker-dispatch.strategy";

/** Posts the processing request to an HTTP worker; results arrive via webhook. */
export class HttpWorkerStrategy implements WorkerDispatchStrategy {
  constructor(private readonly url: string) {}

  async dispatch(payload: ProcessRequest): Promise<DispatchOutcome> {
    const response = await fetch(this.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new ServiceUnavailableException(
        `worker http dispatch failed: ${response.status} ${await response.text()}`,
      );
    }
    return { mode: "http" };
  }
}
