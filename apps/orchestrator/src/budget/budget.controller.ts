import { Controller, Get, Header, Param, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { BudgetService } from "./budget.service";
import { ExportService } from "./export.service";

@Controller("projects")
export class BudgetController {
  constructor(
    private readonly budget: BudgetService,
    private readonly exporter: ExportService,
  ) {}

  @Get(":id/budget")
  get(@Param("id") id: string) {
    return this.budget.getBudget(id);
  }

  @Post(":id/budget/recalculate")
  recalculate(@Param("id") id: string) {
    return this.budget.recalculate(id);
  }

  @Get(":id/export.csv")
  @Header("Content-Type", "text/csv")
  async exportCsv(@Param("id") id: string, @Res() response: Response) {
    response.send(await this.exporter.exportCsv(id));
  }
}
