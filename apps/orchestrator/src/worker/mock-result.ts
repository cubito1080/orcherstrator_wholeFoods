import type { ProcessResult } from "@auto-estimator/contracts";

/**
 * Deterministic worker output used by {@link MockWorkerStrategy} for local
 * development. Kept beside the mock strategy so production services never
 * reference mock data.
 */
export function buildMockResult(projectId: string): ProcessResult {
  return {
    project_id: projectId,
    status: "needs_review",
    schedules: [
      {
        name: "Mock Panel Schedule",
        rows: [{ values: { circuit: "1", load: "Lighting", amps: "20" } }],
      },
    ],
    symbols: [
      {
        label: "duplex receptacle",
        confidence: 0.92,
        box: { page: 0, x: 320, y: 260, width: 28, height: 22 },
      },
      {
        label: "luminaire",
        confidence: 0.88,
        box: { page: 0, x: 780, y: 520, width: 34, height: 30 },
      },
    ],
    budget: null,
    warnings: ["mock worker result generated locally"],
    errors: [],
  };
}
