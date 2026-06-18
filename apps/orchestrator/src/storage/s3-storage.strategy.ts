import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import type { StorageConfig } from "../config/app-config";
import type { StorageStrategy, StoredObject } from "./storage.strategy";

/** Stores PDFs in S3 (or an S3-compatible endpoint such as LocalStack). */
export class S3StorageStrategy implements StorageStrategy {
  private readonly client: S3Client;

  constructor(private readonly config: StorageConfig) {
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: Boolean(config.endpoint),
      credentials: config.credentials,
    });
  }

  async putPdf(projectId: string, file: Express.Multer.File): Promise<StoredObject> {
    const key = `projects/${projectId}/${randomUUID()}-${file.originalname}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype || "application/pdf",
      }),
    );
    return { bucket: this.config.bucket, key };
  }
}
