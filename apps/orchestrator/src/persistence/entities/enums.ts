export enum ProjectStatus {
  draft = "draft",
  uploaded = "uploaded",
  queued = "queued",
  processing = "processing",
  needs_review = "needs_review",
  complete = "complete",
  failed = "failed",
}

export enum ProcessingJobStatus {
  queued = "queued",
  processing = "processing",
  completed = "completed",
  needs_review = "needs_review",
  failed = "failed",
}

export enum DetectionReviewStatus {
  pending = "pending",
  accepted = "accepted",
  rejected = "rejected",
}
