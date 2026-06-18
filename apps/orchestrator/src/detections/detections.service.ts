import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import type { DetectedSymbol } from "@auto-estimator/contracts";
import {
  DetectedSymbolEntity,
  DetectionReview,
  DetectionReviewStatus,
  Project,
} from "../persistence/entities";
import type { UpdateDetectionInput } from "./update-detection.dto";

@Injectable()
export class DetectionsService {
  constructor(
    @InjectRepository(DetectedSymbolEntity)
    private readonly detections: Repository<DetectedSymbolEntity>,
    @InjectRepository(DetectionReview)
    private readonly reviews: Repository<DetectionReview>,
  ) {}

  listForProject(projectId: string) {
    return this.detections.find({
      where: { project: { id: projectId } },
      order: { label: "ASC" },
    });
  }

  async updateDetection(projectId: string, detectionId: string, input: UpdateDetectionInput) {
    const detection = await this.getDetection(projectId, detectionId);
    if (input.label) detection.label = input.label;
    if (typeof input.quantity === "number") detection.quantity = input.quantity;
    if (input.box) detection.box = input.box;
    return this.detections.save(detection);
  }

  async setStatus(projectId: string, detectionId: string, status: DetectionReviewStatus) {
    const detection = await this.getDetection(projectId, detectionId);
    detection.reviewStatus = status;
    await this.detections.save(detection);
    await this.reviews.save(this.reviews.create({ detection, status }));
    return detection;
  }

  /** Replaces all detections for a project, participating in the given transaction. */
  async replaceForProject(
    manager: EntityManager,
    project: Project,
    symbols: DetectedSymbol[],
  ): Promise<void> {
    const repo = manager.getRepository(DetectedSymbolEntity);
    await repo.delete({ project: { id: project.id } });
    if (symbols.length > 0) {
      await repo.save(
        symbols.map((symbol) =>
          repo.create({
            project,
            label: symbol.label,
            confidence: symbol.confidence,
            box: symbol.box,
          }),
        ),
      );
    }
  }

  private async getDetection(projectId: string, detectionId: string) {
    const detection = await this.detections.findOne({
      where: { id: detectionId, project: { id: projectId } },
    });
    if (!detection) {
      throw new NotFoundException("detection not found");
    }
    return detection;
  }
}
