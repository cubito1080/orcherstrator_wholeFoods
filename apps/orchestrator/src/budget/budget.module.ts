import { Module } from "@nestjs/common";
import { PersistenceModule } from "../persistence/persistence.module";
import { ProjectsModule } from "../projects/projects.module";
import { PricingModule } from "../pricing/pricing.module";
import { BudgetController } from "./budget.controller";
import { BudgetService } from "./budget.service";
import { ExportService } from "./export.service";

@Module({
  imports: [PersistenceModule, ProjectsModule, PricingModule],
  controllers: [BudgetController],
  providers: [BudgetService, ExportService],
  exports: [BudgetService, ExportService],
})
export class BudgetModule {}
