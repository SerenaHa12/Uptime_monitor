import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { StatusPage } from "./StatusPage";
import { Maintenance } from "./Maintenance";

@Index("maintenance_id_index", ["maintenanceId"], {})
@Index("status_page_id_index", ["statusPageId"], {})
@Entity("maintenance_status_page")
export class MaintenanceStatusPage {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("integer", { name: "status_page_id" })
  statusPageId: number;

  @Column("integer", { name: "maintenance_id" })
  maintenanceId: number;

  @ManyToOne(
    () => StatusPage,
    (statusPage) => statusPage.maintenanceStatusPages,
    { onDelete: "CASCADE", onUpdate: "CASCADE" }
  )
  @JoinColumn([{ name: "status_page_id", referencedColumnName: "id" }])
  statusPage: StatusPage;

  @ManyToOne(
    () => Maintenance,
    (maintenance) => maintenance.maintenanceStatusPages,
    { onDelete: "CASCADE", onUpdate: "CASCADE" }
  )
  @JoinColumn([{ name: "maintenance_id", referencedColumnName: "id" }])
  maintenance: Maintenance;
}
