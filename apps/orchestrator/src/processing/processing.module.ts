import { Module } from "@nestjs/common";
import { PersistenceModule } from "../persistence/persistence.module";
import { ProjectsModule } from "../projects/projects.module";
import { DocumentsModule } from "../documents/documents.module";
import { DetectionsModule } from "../detections/detections.module";
import { BudgetModule } from "../budget/budget.module";
import { PricingModule } from "../pricing/pricing.module";
import { WorkerModule } from "../worker/worker.module";
import { ProcessingController } from "./processing.controller";
import { ProcessingService } from "./processing.service";
import { WebhookController } from "./webhook.controller";

@Module({
  imports: [
    PersistenceModule,
    ProjectsModule,
    DocumentsModule,
    DetectionsModule,
    BudgetModule,
    PricingModule,
    WorkerModule,
  ],
  controllers: [ProcessingController, WebhookController],
  providers: [ProcessingService],
})
export class ProcessingModule {}
