import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DocumentEntity, Project } from "../persistence/entities";
import { STORAGE } from "../storage/storage.strategy";
import type { StorageStrategy } from "../storage/storage.strategy";

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(DocumentEntity)
    private readonly documents: Repository<DocumentEntity>,
    @Inject(STORAGE) private readonly storage: StorageStrategy,
  ) {}

  async store(project: Project, file: Express.Multer.File) {
    if (!file || file.mimetype !== "application/pdf") {
      throw new BadRequestException("a PDF file is required");
    }
    const stored = await this.storage.putPdf(project.id, file);
    return this.documents.save(
      this.documents.create({
        project,
        originalName: file.originalname,
        s3Key: stored.key,
        mimeType: file.mimetype,
        sizeBytes: String(file.size),
      }),
    );
  }

  findLatest(projectId: string) {
    return this.documents.findOne({
      where: { project: { id: projectId } },
      order: { createdAt: "DESC" },
    });
  }
}
