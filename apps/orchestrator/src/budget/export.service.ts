import { Injectable } from "@nestjs/common";
import { BudgetService } from "./budget.service";

@Injectable()
export class ExportService {
  constructor(private readonly budget: BudgetService) {}

  async exportCsv(projectId: string): Promise<string> {
    const { lineItems } = await this.budget.getBudget(projectId);
    const rows = ["description,quantity,unit_price,total"];
    for (const item of lineItems) {
      rows.push(
        [item.description, item.quantity, item.unitPrice, item.total]
          .map((value) => JSON.stringify(value))
          .join(","),
      );
    }
    return rows.join("\n");
  }
}
