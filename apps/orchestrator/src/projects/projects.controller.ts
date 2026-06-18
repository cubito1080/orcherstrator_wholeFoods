import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ProjectsService } from "./projects.service";

@Controller("projects")
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Post()
  create(@Body() body: { name: string }) {
    return this.projects.createProject(body);
  }

  @Get()
  list() {
    return this.projects.listProjects();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.projects.getProject(id);
  }

  @Post(":id/upload")
  @UseInterceptors(FileInterceptor("file"))
  upload(@Param("id") id: string, @UploadedFile() file: Express.Multer.File) {
    return this.projects.uploadDocument(id, file);
  }
}
