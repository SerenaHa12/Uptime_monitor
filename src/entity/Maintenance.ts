import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./User";
import { MaintenanceStatusPage } from "./MaintenanceStatusPage";
import { MaintenanceTimeslot } from "./MaintenanceTimeslot";
import { MonitorMaintenance } from "./MonitorMaintenance";

@Index("maintenance_user_id", ["userId"], {})
@Index("active", ["active"], {})
@Index("manual_active", ["strategy", "active"], {})
@Entity("maintenance")
export class Maintenance {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("varchar", { name: "title", length: 150 })
  title: string;

  @Column("text", { name: "description" })
  description: string;

  @Column("integer", { name: "user_id", nullable: true })
  userId: number | null;

  @Column("boolean", { name: "active", default: true })
  active: boolean;

  @Column("varchar", {
    name: "strategy",
    length: 50,
    default: "single",
  })
  strategy: string;

  @Column({ name: "start_date", nullable: true })
  startDate: Date | null;

  @Column({ name: "end_date", nullable: true })
  endDate: Date | null;

  @Column({ name: "start_time", nullable: true })
  startTime: Date;

  @Column({ name: "end_time", nullable: true })
  endTime: Date;

  @Column({
    name: "weekdays",
    nullable: true,
    length: 250,
    default: "[]",
  })
  weekdays: string;

  @Column("text", {
    name: "days_of_month",
    nullable: true,
    default: "[]",
  })
  daysOfMonth: string | null;

  @Column("integer", { name: "interval_day", nullable: true })
  intervalDay: number | null;

  @ManyToOne(() => User, (user) => user.maintenances, {
    onDelete: "SET NULL",
    onUpdate: "CASCADE",
  })
  @JoinColumn([{ name: "user_id", referencedColumnName: "id" }])
  user: User;

  @OneToMany(
    () => MaintenanceStatusPage,
    (maintenanceStatusPage) => maintenanceStatusPage.maintenance
  )
  maintenanceStatusPages: MaintenanceStatusPage[];

  @OneToMany(
    () => MaintenanceTimeslot,
    (maintenanceTimeslot) => maintenanceTimeslot.maintenance
  )
  maintenanceTimeslots: MaintenanceTimeslot[];

  @OneToMany(
    () => MonitorMaintenance,
    (monitorMaintenance) => monitorMaintenance.maintenance
  )
  monitorMaintenances: MonitorMaintenance[];
}
