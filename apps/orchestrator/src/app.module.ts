import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppConfigModule } from "./config/config.module";
import { CommonModule } from "./common/common.module";
import { DatabaseModule } from "./persistence/database.module";
import { AuthModule } from "./auth/auth.module";
import { PricingModule } from "./pricing/pricing.module";
import { DetectionsModule } from "./detections/detections.module";
import { BudgetModule } from "./budget/budget.module";
import { DocumentsModule } from "./documents/documents.module";
import { ProjectsModule } from "./projects/projects.module";
import { ProcessingModule } from "./processing/processing.module";
import { HealthModule } from "./health/health.module";

/**
 * Composition root. Cross-cutting modules (config, common, database) are global;
 * each feature is a self-contained domain module. Infrastructure modules
 * (storage, worker) are pulled in transitively by the features that use them.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AppConfigModule,
    CommonModule,
    DatabaseModule,
    AuthModule,
    PricingModule,
    DetectionsModule,
    BudgetModule,
    DocumentsModule,
    ProjectsModule,
    ProcessingModule,
    HealthModule,
  ],
})
export class AppModule {}
