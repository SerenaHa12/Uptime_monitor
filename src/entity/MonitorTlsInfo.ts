import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("monitor_tls_info")
export class MonitorTlsInfo {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("integer", { name: "monitor_id" })
  monitorId: number;

  @Column("text", { name: "info_json", nullable: true })
  infoJson: string | null;
}
