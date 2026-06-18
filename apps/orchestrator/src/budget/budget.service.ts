import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import type { ProcessResult } from "@auto-estimator/contracts";
import {
  BudgetEntity,
  BudgetLineItemEntity,
  DetectedSymbolEntity,
  DetectionReviewStatus,
  Project,
} from "../persistence/entities";
import { roundMoney } from "../common/money";
import { TransactionRunner } from "../common/transaction.runner";
import { ProjectsService } from "../projects/projects.service";
import { PricingService } from "../pricing/pricing.service";

@Injectable()
export class BudgetService {
  constructor(
    @InjectRepository(BudgetEntity) private readonly budgets: Repository<BudgetEntity>,
    @InjectRepository(BudgetLineItemEntity)
    private readonly lineItems: Repository<BudgetLineItemEntity>,
    private readonly projects: ProjectsService,
    private readonly pricing: PricingService,
    private readonly tx: TransactionRunner,
  ) {}

  async getBudget(projectId: string) {
    const budget = await this.budgets.findOne({
      where: { project: { id: projectId } },
      order: { createdAt: "DESC" },
    });
    const lineItems = await this.lineItems.find({ where: { project: { id: projectId } } });
    return { budget, lineItems };
  }

  /** Public endpoint: recompute the budget for a project from its detections and prices. */
  async recalculate(projectId: string) {
    const project = await this.projects.getProject(projectId);
    const priceMap = await this.pricing.getPriceMap();
    return this.tx.run((manager) => this.recalculateWithin(manager, project, priceMap));
  }

  /**
   * Core recalculation, operating inside an existing transaction. Aggregates
   * non-rejected detections by label, prices them, and replaces the stored budget.
   */
  async recalculateWithin(
    manager: EntityManager,
    project: Project,
    priceMap: Map<string, number>,
  ) {
    const detectionRepo = manager.getRepository(DetectedSymbolEntity);
    const budgetRepo = manager.getRepository(BudgetEntity);
    const lineItemRepo = manager.getRepository(BudgetLineItemEntity);

    const detections = await detectionRepo.find({ where: { project: { id: project.id } } });
    const counts = new Map<string, number>();
    for (const detection of detections) {
      if (detection.reviewStatus === DetectionReviewStatus.rejected) continue;
      counts.set(detection.label, (counts.get(detection.label) ?? 0) + detection.quantity);
    }

    await budgetRepo.delete({ project: { id: project.id } });
    await lineItemRepo.delete({ project: { id: project.id } });

    const lineItems = [...counts.entries()].map(([label, quantity]) => {
      const unitPrice = priceMap.get(label) ?? 0;
      return lineItemRepo.create({
        project,
        description: label,
        quantity,
        unitPrice,
        total: roundMoney(quantity * unitPrice),
      });
    });
    if (lineItems.length > 0) {
      await lineItemRepo.save(lineItems);
    }
    const subtotal = roundMoney(lineItems.reduce((sum, item) => sum + item.total, 0));
    const budget = await budgetRepo.save(budgetRepo.create({ project, subtotal, total: subtotal }));
    return { budget, lineItems };
  }

  /** Persists a worker-provided budget verbatim, inside an existing transaction. */
  async persistWorkerBudgetWithin(
    manager: EntityManager,
    project: Project,
    budget: NonNullable<ProcessResult["budget"]>,
  ): Promise<void> {
    const budgetRepo = manager.getRepository(BudgetEntity);
    const lineItemRepo = manager.getRepository(BudgetLineItemEntity);
    await budgetRepo.delete({ project: { id: project.id } });
    await lineItemRepo.delete({ project: { id: project.id } });
    await budgetRepo.save(
      budgetRepo.create({
        project,
        subtotal: budget.subtotal,
        total: budget.total,
        sourceWorkerBudget: budget,
      }),
    );
    if (budget.line_items.length > 0) {
      await lineItemRepo.save(
        budget.line_items.map((item) =>
          lineItemRepo.create({
            project,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            total: roundMoney(item.quantity * item.unit_price),
          }),
        ),
      );
    }
  }
}
