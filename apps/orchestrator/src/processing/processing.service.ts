import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  PipelineCompletedEvent,
  ProcessRequestSchema,
  ProcessResultSchema,
} from "@auto-estimator/contracts";
import type { ProcessResult } from "@auto-estimator/contracts";
import {
  PanelScheduleEntity,
  ProcessingJob,
  ProcessingJobStatus,
  Project,
  ProjectStatus,
  WebhookEvent,
  WorkerResult,
} from "../persistence/entities";
import { APP_CONFIG } from "../config/app-config";
import type { AppConfig } from "../config/app-config";
import { TransactionRunner } from "../common/transaction.runner";
import { ProjectsService } from "../projects/projects.service";
import { ProjectStatusMachine } from "../projects/project-status.machine";
import { DocumentsService } from "../documents/documents.service";
import { DetectionsService } from "../detections/detections.service";
import { BudgetService } from "../budget/budget.service";
import { PricingService } from "../pricing/pricing.service";
import { WORKER_DISPATCH } from "../worker/worker-dispatch.strategy";
import type { WorkerDispatchStrategy } from "../worker/worker-dispatch.strategy";

/**
 * Application service coordinating the processing use case: dispatch a job to
 * the worker, and atomically ingest the result it returns (sync for mock,
 * async via webhook for http/sqs).
 */
@Injectable()
export class ProcessingService {
  private readonly logger = new Logger(ProcessingService.name);

  constructor(
    @InjectRepository(ProcessingJob) private readonly jobs: Repository<ProcessingJob>,
    @InjectRepository(WorkerResult) private readonly workerResults: Repository<WorkerResult>,
    @InjectRepository(WebhookEvent) private readonly webhookEvents: Repository<WebhookEvent>,
    @InjectRepository(PanelScheduleEntity)
    private readonly schedules: Repository<PanelScheduleEntity>,
    private readonly projects: ProjectsService,
    private readonly statusMachine: ProjectStatusMachine,
    private readonly documents: DocumentsService,
    private readonly detections: DetectionsService,
    private readonly budget: BudgetService,
    private readonly pricing: PricingService,
    private readonly tx: TransactionRunner,
    @Inject(WORKER_DISPATCH) private readonly workerDispatch: WorkerDispatchStrategy,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async startProcessing(projectId: string) {
    const project = await this.projects.getProject(projectId);
    const document = await this.documents.findLatest(project.id);
    if (!document) {
      throw new BadRequestException("project has no uploaded PDF");
    }

    const priceMap = await this.pricing.getPriceMap();
    const payload = ProcessRequestSchema.parse({
      project_id: project.id,
      s3_key: document.s3Key,
      callback_url: `${this.config.publicApiUrl}/api/worker/webhooks/pipeline-completed`,
      unit_prices: Object.fromEntries(priceMap),
    });

    const job = await this.jobs.save(
      this.jobs.create({
        project,
        status: ProcessingJobStatus.queued,
        requestPayload: payload,
      }),
    );
    await this.projects.transitionTo(project, ProjectStatus.queued);

    const outcome = await this.workerDispatch.dispatch(payload);
    this.logger.log(`dispatched project ${project.id} via ${outcome.mode}`);
    if (outcome.result) {
      await this.applyWorkerResult(outcome.result);
    }
    return job;
  }

  async applyWorkerResult(resultInput: unknown) {
    const result = ProcessResultSchema.parse(resultInput) as ProcessResult;
    const project = await this.projects.getProject(result.project_id);

    const existingEvent = await this.webhookEvents.findOne({
      where: { projectId: project.id, event: PipelineCompletedEvent },
    });
    if (existingEvent) {
      this.logger.warn(`duplicate pipeline-completed event for project ${project.id}`);
      return { duplicate: true, projectId: project.id };
    }

    const priceMap = await this.pricing.getPriceMap();
    const nextStatus = this.deriveProjectStatus(result);
    this.statusMachine.assert(project.status, nextStatus);

    await this.tx.run(async (manager) => {
      const webhookRepo = manager.getRepository(WebhookEvent);
      await webhookRepo.save(
        webhookRepo.create({
          projectId: project.id,
          event: PipelineCompletedEvent,
          payload: result,
        }),
      );

      const workerResultRepo = manager.getRepository(WorkerResult);
      await workerResultRepo.save(
        workerResultRepo.create({
          project,
          raw: result,
          warnings: result.warnings,
          errors: result.errors,
        }),
      );

      const scheduleRepo = manager.getRepository(PanelScheduleEntity);
      await scheduleRepo.delete({ project: { id: project.id } });
      if (result.schedules.length > 0) {
        await scheduleRepo.save(
          result.schedules.map((schedule) =>
            scheduleRepo.create({ project, name: schedule.name, rows: schedule.rows }),
          ),
        );
      }

      await this.detections.replaceForProject(manager, project, result.symbols);

      if (result.budget) {
        await this.budget.persistWorkerBudgetWithin(manager, project, result.budget);
      } else {
        await this.budget.recalculateWithin(manager, project, priceMap);
      }

      project.status = nextStatus;
      await manager.getRepository(Project).save(project);

      const jobRepo = manager.getRepository(ProcessingJob);
      const job = await jobRepo.findOne({
        where: { project: { id: project.id } },
        order: { createdAt: "DESC" },
      });
      if (job) {
        job.status = this.deriveJobStatus(result, nextStatus);
        await jobRepo.save(job);
      }
    });

    this.logger.log(`applied worker result for project ${project.id} (status=${nextStatus})`);
    return { duplicate: false, projectId: project.id };
  }

  async getStatus(projectId: string) {
    const project = await this.projects.getProject(projectId);
    const job = await this.jobs.findOne({
      where: { project: { id: project.id } },
      order: { createdAt: "DESC" },
    });
    return { projectId: project.id, status: project.status, job };
  }

  async getResult(projectId: string) {
    const project = await this.projects.getProject(projectId);
    const workerResult = await this.workerResults.findOne({
      where: { project: { id: project.id } },
      order: { createdAt: "DESC" },
    });
    const detections = await this.detections.listForProject(project.id);
    const schedules = await this.schedules.find({ where: { project: { id: project.id } } });
    const budget = await this.budget.getBudget(project.id);
    return { project, rawResult: workerResult?.raw ?? null, detections, schedules, budget };
  }

  exportJson(projectId: string) {
    return this.getResult(projectId);
  }

  private deriveProjectStatus(result: ProcessResult): ProjectStatus {
    if (result.status === "failed") return ProjectStatus.failed;
    return result.symbols.length > 0 ? ProjectStatus.needs_review : ProjectStatus.complete;
  }

  private deriveJobStatus(result: ProcessResult, projectStatus: ProjectStatus): ProcessingJobStatus {
    if (result.status === "failed") return ProcessingJobStatus.failed;
    return projectStatus === ProjectStatus.needs_review
      ? ProcessingJobStatus.needs_review
      : ProcessingJobStatus.completed;
  }
}
