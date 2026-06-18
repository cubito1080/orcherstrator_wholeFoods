import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

/**
 * Records inbound worker webhook deliveries. The unique `(projectId, event)`
 * index makes pipeline-completed ingestion idempotent.
 */
@Entity()
@Index(["projectId", "event"], { unique: true })
export class WebhookEvent {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  projectId!: string;

  @Column()
  event!: string;

  @Column({ type: "simple-json" })
  payload!: unknown;

  @CreateDateColumn()
  createdAt!: Date;
}
