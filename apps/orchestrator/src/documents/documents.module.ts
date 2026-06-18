import { Module } from "@nestjs/common";
import { PersistenceModule } from "../persistence/persistence.module";
import { StorageModule } from "../storage/storage.module";
import { DocumentsService } from "./documents.service";

@Module({
  imports: [PersistenceModule, StorageModule],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
