import { BadRequestException, Injectable } from "@nestjs/common";
import { ProjectStatus } from "../persistence/entities/enums";

/**
 * Single source of truth for legal {@link ProjectStatus} transitions. Re-uploading
 * a document (`-> uploaded`) and re-processing (`-> queued`) are allowed from any
 * active state so the workflow can be retried.
 */
const ALLOWED: Record<ProjectStatus, ProjectStatus[]> = {
  [ProjectStatus.draft]: [ProjectStatus.uploaded],
  [ProjectStatus.uploaded]: [ProjectStatus.uploaded, ProjectStatus.queued],
  [ProjectStatus.queued]: [
    ProjectStatus.uploaded,
    ProjectStatus.processing,
    ProjectStatus.needs_review,
    ProjectStatus.complete,
    ProjectStatus.failed,
  ],
  [ProjectStatus.processing]: [
    ProjectStatus.uploaded,
    ProjectStatus.needs_review,
    ProjectStatus.complete,
    ProjectStatus.failed,
  ],
  [ProjectStatus.needs_review]: [
    ProjectStatus.uploaded,
    ProjectStatus.queued,
    ProjectStatus.complete,
  ],
  [ProjectStatus.complete]: [ProjectStatus.uploaded, ProjectStatus.queued],
  [ProjectStatus.failed]: [ProjectStatus.uploaded, ProjectStatus.queued],
};

@Injectable()
export class ProjectStatusMachine {
  canTransition(from: ProjectStatus, to: ProjectStatus): boolean {
    if (from === to) return true;
    return (ALLOWED[from] ?? []).includes(to);
  }

  assert(from: ProjectStatus, to: ProjectStatus): void {
    if (!this.canTransition(from, to)) {
      throw new BadRequestException(`illegal project status transition: ${from} -> ${to}`);
    }
  }
}
