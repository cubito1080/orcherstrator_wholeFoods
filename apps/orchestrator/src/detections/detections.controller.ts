import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { DetectionReviewStatus } from "../persistence/entities";
import { DetectionsService } from "./detections.service";
import { parseUpdateDetection } from "./update-detection.dto";

@Controller("projects")
export class DetectionsController {
  constructor(private readonly detections: DetectionsService) {}

  @Get(":id/detections")
  list(@Param("id") id: string) {
    return this.detections.listForProject(id);
  }

  @Patch(":id/detections/:detectionId")
  update(
    @Param("id") id: string,
    @Param("detectionId") detectionId: string,
    @Body() body: unknown,
  ) {
    return this.detections.updateDetection(id, detectionId, parseUpdateDetection(body));
  }

  @Post(":id/detections/:detectionId/accept")
  accept(@Param("id") id: string, @Param("detectionId") detectionId: string) {
    return this.detections.setStatus(id, detectionId, DetectionReviewStatus.accepted);
  }

  @Post(":id/detections/:detectionId/reject")
  reject(@Param("id") id: string, @Param("detectionId") detectionId: string) {
    return this.detections.setStatus(id, detectionId, DetectionReviewStatus.rejected);
  }
}
