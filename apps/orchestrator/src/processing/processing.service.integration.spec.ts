import "reflect-metadata";
import { DataSource } from "typeorm";
import {
  BudgetEntity,
  BudgetLineItemEntity,
  DetectedSymbolEntity,
  DetectionReview,
  DocumentEntity,
  PanelScheduleEntity,
  PriceCatalogItem,
  ProcessingJob,
  Project,
  ProjectStatus,
  WebhookEvent,
  WorkerResult,
  entities,
} from "../persistence/entities";
import { TransactionRunner } from "../common/transaction.runner";
import { BudgetService } from "../budget/budget.service";
import { DetectionsService } from "../detections/detections.service";
import { DocumentsService } from "../documents/documents.service";
import { PricingService } from "../pricing/pricing.service";
import { ProjectStatusMachine } from "../projects/project-status.machine";
import { ProjectsService } from "../projects/projects.service";
import { MockWorkerStrategy } from "../worker/mock-worker.strategy";
import { ProcessingService } from "./processing.service";

describe("ProcessingService integration", () => {
  let dataSource: DataSource;
  let processing: ProcessingService;
  let projects: ProjectsService;
  let pricing: PricingService;

  beforeEach(async () => {
    dataSource = new DataSource({
      type: "sqljs",
      entities,
      synchronize: true,
    });
    await dataSource.initialize();

    const tx = new TransactionRunner(dataSource);
    const statusMachine = new ProjectStatusMachine();
    const documents = new DocumentsService(dataSource.getRepository(DocumentEntity), {
      putPdf: jest.fn().mockResolvedValue({ bucket: "local", key: "projects/p1/test.pdf" }),
    });
    projects = new ProjectsService(dataSource.getRepository(Project), documents, statusMachine);
    pricing = new PricingService(dataSource.getRepository(PriceCatalogItem));
    const detections = new DetectionsService(
      dataSource.getRepository(DetectedSymbolEntity),
      dataSource.getRepository(DetectionReview),
    );
    const budget = new BudgetService(
      dataSource.getRepository(BudgetEntity),
      dataSource.getRepository(BudgetLineItemEntity),
      projects,
      pricing,
      tx,
    );
    processing = new ProcessingService(
      dataSource.getRepository(ProcessingJob),
      dataSource.getRepository(WorkerResult),
      dataSource.getRepository(WebhookEvent),
      dataSource.getRepository(PanelScheduleEntity),
      projects,
      statusMachine,
      documents,
      detections,
      budget,
      pricing,
      tx,
      new MockWorkerStrategy(),
      {
        publicApiUrl: "http://localhost:4000",
      } as never,
    );
  });

  afterEach(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  it("applies a mock worker result transactionally and prices the project", async () => {
    await pricing.upsertPrice({ label: "duplex receptacle", unitPrice: 85 });
    await pricing.upsertPrice({ label: "luminaire", unitPrice: 140 });
    const project = await projects.createProject({ name: "Whole Foods" });
    await projects.uploadDocument(project.id, {
      originalname: "electrical.pdf",
      mimetype: "application/pdf",
      size: 8,
      buffer: Buffer.from("%PDF-1.7"),
    } as Express.Multer.File);

    await processing.startProcessing(project.id);

    const updatedProject = await projects.getProject(project.id);
    const result = await processing.getResult(project.id);

    expect(updatedProject.status).toBe(ProjectStatus.needs_review);
    expect(result.rawResult?.warnings).toContain("mock worker result generated locally");
    expect(result.detections).toHaveLength(2);
    expect(result.schedules).toHaveLength(1);
    expect(result.budget.budget?.total).toBe(225);
    expect(result.budget.lineItems.map((item) => item.description).sort()).toEqual([
      "duplex receptacle",
      "luminaire",
    ]);
  });
});
