import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { ProcessResult } from "@auto-estimator/contracts";
import { Tenant, User } from "./identity.entity";
import { ProcessingJobStatus, ProjectStatus } from "./enums";

@Entity()
export class Project {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string;

  @Column({ type: "simple-enum", enum: ProjectStatus, default: ProjectStatus.draft })
  status!: ProjectStatus;

  @ManyToOne(() => Tenant, { nullable: true })
  tenant?: Tenant | null;

  @ManyToOne(() => User, { nullable: true })
  owner?: User | null;

  @OneToMany(() => DocumentEntity, (document: DocumentEntity) => document.project)
  documents!: DocumentEntity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

@Entity()
export class DocumentEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Project, (project: Project) => project.documents, { nullable: false })
  project!: Project;

  @Column()
  originalName!: string;

  @Column()
  s3Key!: string;

  @Column()
  mimeType!: string;

  @Column({ type: "bigint" })
  sizeBytes!: string;

  @CreateDateColumn()
  createdAt!: Date;
}

@Entity()
export class ProcessingJob {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Project, { nullable: false })
  project!: Project;

  @Column({ type: "simple-enum", enum: ProcessingJobStatus, default: ProcessingJobStatus.queued })
  status!: ProcessingJobStatus;

  @Column({ type: "simple-json" })
  requestPayload!: unknown;

  @Column({ type: "text", nullable: true })
  error?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

@Entity()
export class WorkerResult {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @OneToOne(() => Project, { nullable: false })
  @JoinColumn()
  project!: Project;

  @Column({ type: "simple-json" })
  raw!: ProcessResult;

  @Column({ type: "simple-array", default: "" })
  warnings!: string[];

  @Column({ type: "simple-array", default: "" })
  errors!: string[];

  @CreateDateColumn()
  createdAt!: Date;
}
