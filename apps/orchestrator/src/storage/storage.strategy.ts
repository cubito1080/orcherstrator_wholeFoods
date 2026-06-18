/** DI token for the active {@link StorageStrategy}. */
export const STORAGE = Symbol("STORAGE");

export interface StoredObject {
  bucket: string;
  key: string;
}

/** Abstraction over where uploaded PDFs are persisted (local disk or S3). */
export interface StorageStrategy {
  putPdf(projectId: string, file: Express.Multer.File): Promise<StoredObject>;
}
