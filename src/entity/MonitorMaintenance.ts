import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Monitor } from "./Monitor";
import { Maintenance } from "./Maintenance";

@Index("monitor_id_index", ["monitorId"], {})
@Index("maintenance_id_index2", ["maintenanceId"], {})
@Entity("monitor_maintenance")
export class MonitorMaintenance {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("integer", { name: "monitor_id" })
  monitorId: number;

  @Column("integer", { name: "maintenance_id" })
  maintenanceId: number;

  @ManyToOne(() => Monitor, (monitor) => monitor.monitorMaintenances, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn([{ name: "monitor_id", referencedColumnName: "id" }])
  monitor: Monitor;

  @ManyToOne(
    () => Maintenance,
    (maintenance) => maintenance.monitorMaintenances,
    { onDelete: "CASCADE", onUpdate: "CASCADE" }
  )
  @JoinColumn([{ name: "maintenance_id", referencedColumnName: "id" }])
  maintenance: Maintenance;
}
