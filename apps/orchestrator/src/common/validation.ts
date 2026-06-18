import { BadRequestException } from "@nestjs/common";
import type { BoundingBox } from "@auto-estimator/contracts";

/**
 * Small hand-rolled validators for inbound request bodies. (Zod is not a direct
 * dependency of this app; once it is added these can be replaced by a shared
 * `ZodValidationPipe` driven by the contracts package.)
 */

export function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new BadRequestException(`${field} is required`);
  }
  return value.trim();
}

export function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new BadRequestException(`${field} must be a string`);
  }
  return value;
}

export function optionalNumber(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new BadRequestException(`${field} must be a number`);
  }
  return value;
}

export function requireNonNegativeNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
    throw new BadRequestException(`${field} must be a non-negative number`);
  }
  return value;
}

export function parseBoundingBox(value: unknown, field = "box"): BoundingBox | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "object") {
    throw new BadRequestException(`${field} must be an object`);
  }
  const candidate = value as Record<string, unknown>;
  const num = (key: string) => {
    const v = candidate[key];
    if (typeof v !== "number" || Number.isNaN(v)) {
      throw new BadRequestException(`${field}.${key} must be a number`);
    }
    return v;
  };
  return {
    page: num("page"),
    x: num("x"),
    y: num("y"),
    width: num("width"),
    height: num("height"),
  };
}
