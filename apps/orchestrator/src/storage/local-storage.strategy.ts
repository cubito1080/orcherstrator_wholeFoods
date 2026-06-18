import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import type { StorageStrategy, StoredObject } from "./storage.strategy";

/** Stores PDFs on the local filesystem; used for no-Docker local development. */
export class LocalStorageStrategy implements StorageStrategy {
  constructor(private readonly rootDir: string) {}

  async putPdf(projectId: string, file: Express.Multer.File): Promise<StoredObject> {
    const key = `projects/${projectId}/${randomUUID()}-${file.originalname}`;
    const absolutePath = join(this.rootDir, key);
    await mkdir(join(this.rootDir, `projects/${projectId}`), { recursive: true });
    await writeFile(absolutePath, file.buffer);
    return { bucket: "local", key };
  }
}
