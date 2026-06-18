import { z } from "zod";

export const JobStatusSchema = z.enum([
  "queued",
  "processing",
  "completed",
  "needs_review",
  "failed",
]);

export type JobStatus = z.infer<typeof JobStatusSchema>;

export const ProjectStatusSchema = z.enum([
  "draft",
  "uploaded",
  "queued",
  "processing",
  "needs_review",
  "complete",
  "failed",
]);

export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

export const ProcessRequestSchema = z.object({
  project_id: z.string().min(1),
  s3_key: z.string().min(1),
  callback_url: z.string().url().optional().nullable(),
  unit_prices: z.record(z.number().nonnegative()).default({}),
});

export type ProcessRequest = z.infer<typeof ProcessRequestSchema>;

export const BoundingBoxSchema = z.object({
  page: z.number().int().nonnegative(),
  x: z.number(),
  y: z.number(),
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
});

export type BoundingBox = z.infer<typeof BoundingBoxSchema>;

export const DetectedSymbolSchema = z.object({
  label: z.string().min(1),
  confidence: z.number().min(0).max(1),
  box: BoundingBoxSchema,
});

export type DetectedSymbol = z.infer<typeof DetectedSymbolSchema>;

export const LegendSymbolSchema = z.object({
  name: z.string(),
  code: z.string().default(""),
  description: z.string().default(""),
  detection_prompt: z.string(),
});

export type LegendSymbol = z.infer<typeof LegendSymbolSchema>;

export const ScheduleRowSchema = z.object({
  values: z.record(z.union([z.string(), z.number(), z.null()])).default({}),
});

export type ScheduleRow = z.infer<typeof ScheduleRowSchema>;

export const PanelScheduleSchema = z.object({
  name: z.string(),
  rows: z.array(ScheduleRowSchema).default([]),
});

export type PanelSchedule = z.infer<typeof PanelScheduleSchema>;

export const LineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().nonnegative(),
  unit_price: z.number().nonnegative(),
});

export type LineItem = z.infer<typeof LineItemSchema>;

export const BudgetSchema = z.object({
  line_items: z.array(LineItemSchema).default([]),
  subtotal: z.number().nonnegative().default(0),
  total: z.number().nonnegative().default(0),
});

export type Budget = z.infer<typeof BudgetSchema>;

export const ProcessResultSchema = z.object({
  project_id: z.string().min(1),
  status: JobStatusSchema,
  schedules: z.array(PanelScheduleSchema).default([]),
  symbols: z.array(DetectedSymbolSchema).default([]),
  budget: BudgetSchema.nullable().default(null),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});

export type ProcessResult = z.infer<typeof ProcessResultSchema>;

export const DetectorRequestSchema = z.object({
  image: z.string().min(1),
  prompts: z.array(z.string().min(1)).default([]),
});

export type DetectorRequest = z.infer<typeof DetectorRequestSchema>;

export const DetectorResponseSchema = z.object({
  detections: z.array(DetectedSymbolSchema).default([]),
});

export type DetectorResponse = z.infer<typeof DetectorResponseSchema>;

export const WorkerWebhookHeaders = {
  event: "x-auto-estimator-event",
  projectId: "x-auto-estimator-project-id",
  signature: "x-auto-estimator-signature",
} as const;

export const PipelineCompletedEvent = "pipeline.completed";
