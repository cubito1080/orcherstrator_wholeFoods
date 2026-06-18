import { Controller, Get, Param, Post } from "@nestjs/common";
import { ProcessingService } from "./processing.service";

@Controller("projects")
export class ProcessingController {
  constructor(private readonly processing: ProcessingService) {}

  @Post(":id/process")
  process(@Param("id") id: string) {
    return this.processing.startProcessing(id);
  }

  @Get(":id/status")
  status(@Param("id") id: string) {
    return this.processing.getStatus(id);
  }

  @Get(":id/result")
  result(@Param("id") id: string) {
    return this.processing.getResult(id);
  }

  @Get(":id/export.json")
  exportJson(@Param("id") id: string) {
    return this.processing.exportJson(id);
  }
}
