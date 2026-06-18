import { Tenant, User } from "./identity.entity";
import {
  DocumentEntity,
  ProcessingJob,
  Project,
  WorkerResult,
} from "./project.entity";
import {
  DetectedSymbolEntity,
  DetectionReview,
  PanelScheduleEntity,
} from "./detection.entity";
import {
  BudgetEntity,
  BudgetLineItemEntity,
  PriceCatalogItem,
} from "./budget.entity";
import { WebhookEvent } from "./event.entity";

export * from "./enums";
export * from "./identity.entity";
export * from "./project.entity";
export * from "./detection.entity";
export * from "./budget.entity";
export * from "./event.entity";

/** All persistent entities, registered with TypeORM in one place. */
export const entities = [
  Tenant,
  User,
  Project,
  DocumentEntity,
  ProcessingJob,
  WorkerResult,
  DetectedSymbolEntity,
  DetectionReview,
  PanelScheduleEntity,
  BudgetEntity,
  BudgetLineItemEntity,
  PriceCatalogItem,
  WebhookEvent,
];
