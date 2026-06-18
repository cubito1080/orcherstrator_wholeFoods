import type { BoundingBox } from "@auto-estimator/contracts";
import { optionalNumber, optionalString, parseBoundingBox } from "../common/validation";

export interface UpdateDetectionInput {
  label?: string;
  quantity?: number;
  box?: BoundingBox;
}

/** Validates and normalises a raw detection-update request body. */
export function parseUpdateDetection(body: unknown): UpdateDetectionInput {
  const candidate = (body ?? {}) as Record<string, unknown>;
  return {
    label: optionalString(candidate.label, "label"),
    quantity: optionalNumber(candidate.quantity, "quantity"),
    box: parseBoundingBox(candidate.box, "box"),
  };
}
