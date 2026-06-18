import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import type { Budget } from "@auto-estimator/contracts";
import { Project } from "./project.entity";
import { Tenant } from "./identity.entity";

@Entity()
export class BudgetEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Project, { nullable: false })
  project!: Project;

  @Column({ type: "float", default: 0 })
  subtotal!: number;

  @Column({ type: "float", default: 0 })
  total!: number;

  @Column({ type: "simple-json", nullable: true })
  sourceWorkerBudget?: Budget | null;

  @CreateDateColumn()
  createdAt!: Date;
}

@Entity()
export class BudgetLineItemEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Project, { nullable: false })
  project!: Project;

  @Column()
  description!: string;

  @Column({ type: "float" })
  quantity!: number;

  @Column({ type: "float" })
  unitPrice!: number;

  @Column({ type: "float" })
  total!: number;
}

@Entity()
@Index(["tenant", "label"], { unique: false })
export class PriceCatalogItem {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Tenant, { nullable: true })
  tenant?: Tenant | null;

  @Column()
  label!: string;

  @Column({ type: "float" })
  unitPrice!: number;

  @Column({ default: "each" })
  unit!: string;
}
