import { Module } from "@nestjs/common";
import { PersistenceModule } from "../persistence/persistence.module";
import { DetectionsController } from "./detections.controller";
import { DetectionsService } from "./detections.service";

@Module({
  imports: [PersistenceModule],
  controllers: [DetectionsController],
  providers: [DetectionsService],
  exports: [DetectionsService],
})
export class DetectionsModule {}
