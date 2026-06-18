import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import type { DetectedSymbol, PanelSchedule } from "@auto-estimator/contracts";
import { Project } from "./project.entity";
import { DetectionReviewStatus } from "./enums";

@Entity()
export class DetectedSymbolEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Project, { nullable: false })
  project!: Project;

  @Column()
  label!: string;

  @Column({ type: "float" })
  confidence!: number;

  @Column({ type: "simple-json" })
  box!: DetectedSymbol["box"];

  @Column({ type: "simple-enum", enum: DetectionReviewStatus, default: DetectionReviewStatus.pending })
  reviewStatus!: DetectionReviewStatus;

  @Column({ type: "float", default: 1 })
  quantity!: number;
}

/**
 * Audit row recording each accept/reject decision on a detection. Kept as an
 * append-only review trail; the previous unused override columns were removed.
 */
@Entity()
export class DetectionReview {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => DetectedSymbolEntity, { nullable: false })
  detection!: DetectedSymbolEntity;

  @Column({ type: "simple-enum", enum: DetectionReviewStatus })
  status!: DetectionReviewStatus;

  @CreateDateColumn()
  createdAt!: Date;
}

@Entity()
export class PanelScheduleEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Project, { nullable: false })
  project!: Project;

  @Column()
  name!: string;

  @Column({ type: "simple-json" })
  rows!: PanelSchedule["rows"];
}
