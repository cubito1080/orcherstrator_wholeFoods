import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { entities } from "./entities";

/**
 * Registers every entity's repository once and re-exports TypeORM so any
 * feature module that imports this module can inject the repositories it needs
 * without redeclaring `forFeature`.
 */
@Module({
  imports: [TypeOrmModule.forFeature(entities)],
  exports: [TypeOrmModule],
})
export class PersistenceModule {}
