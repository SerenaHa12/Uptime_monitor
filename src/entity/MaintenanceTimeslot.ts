import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Maintenance } from "./Maintenance";

@Index("generated_next_index", ["generatedNext"], {})
@Index("active_timeslot_index", ["maintenanceId", "startDate", "endDate"], {})
@Index("maintenance_id", ["maintenanceId"], {})
@Entity("maintenance_timeslot")
export class MaintenanceTimeslot {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("integer", { name: "maintenance_id" })
  maintenanceId: number;

  @Column({ name: "start_date" })
  startDate: Date;

  @Column({ name: "end_date", nullable: true })
  endDate: Date | null;

  @Column("boolean", {
    name: "generated_next",
    nullable: true,
    default: false,
  })
  generatedNext: boolean | null;

  @ManyToOne(
    () => Maintenance,
    (maintenance) => maintenance.maintenanceTimeslots,
    { onDelete: "CASCADE", onUpdate: "CASCADE" }
  )
  @JoinColumn([{ name: "maintenance_id", referencedColumnName: "id" }])
  maintenance: Maintenance;
}
