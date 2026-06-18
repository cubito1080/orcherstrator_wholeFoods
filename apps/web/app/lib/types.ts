import type { BoundingBox } from "@auto-estimator/contracts";

/** View models for the data the orchestrator API returns to the web app. */

export type ProjectStatus =
  | "draft"
  | "uploaded"
  | "queued"
  | "processing"
  | "needs_review"
  | "complete"
  | "failed";

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  createdAt: string;
}

export interface ProjectJob {
  id: string;
  status: string;
  error?: string | null;
}

export interface ProjectStatusResponse {
  projectId: string;
  status: ProjectStatus;
  job?: ProjectJob | null;
}

export interface Detection {
  id: string;
  label: string;
  confidence: number;
  reviewStatus: string;
  quantity: number;
  box: BoundingBox;
}

export interface BudgetLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface BudgetResponse {
  budget: { subtotal: number; total: number } | null;
  lineItems: BudgetLineItem[];
}

export interface PriceItem {
  id: string;
  label: string;
  unitPrice: number;
  unit: string;
}
