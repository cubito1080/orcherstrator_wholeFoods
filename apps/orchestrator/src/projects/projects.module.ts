import { Module } from "@nestjs/common";
import { PersistenceModule } from "../persistence/persistence.module";
import { DocumentsModule } from "../documents/documents.module";
import { ProjectsController } from "./projects.controller";
import { ProjectsService } from "./projects.service";
import { ProjectStatusMachine } from "./project-status.machine";

@Module({
  imports: [PersistenceModule, DocumentsModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectStatusMachine],
  exports: [ProjectsService, ProjectStatusMachine],
})
export class ProjectsModule {}
