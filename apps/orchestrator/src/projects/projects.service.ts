import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Project, ProjectStatus } from "../persistence/entities";
import { requireString } from "../common/validation";
import { DocumentsService } from "../documents/documents.service";
import { ProjectStatusMachine } from "./project-status.machine";

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) private readonly projects: Repository<Project>,
    private readonly documents: DocumentsService,
    private readonly statusMachine: ProjectStatusMachine,
  ) {}

  async createProject(input: { name: string }) {
    const name = requireString(input.name, "project name");
    return this.projects.save(this.projects.create({ name }));
  }

  listProjects() {
    return this.projects.find({ order: { createdAt: "DESC" } });
  }

  async getProject(id: string) {
    const project = await this.projects.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException("project not found");
    }
    return project;
  }

  async uploadDocument(projectId: string, file: Express.Multer.File) {
    const project = await this.getProject(projectId);
    const document = await this.documents.store(project, file);
    await this.transitionTo(project, ProjectStatus.uploaded);
    return document;
  }

  /** Validates the transition through the state machine, then persists it. */
  async transitionTo(project: Project, status: ProjectStatus) {
    this.statusMachine.assert(project.status, status);
    project.status = status;
    return this.projects.save(project);
  }
}
