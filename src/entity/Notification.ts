import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { MonitorNotification } from "./MonitorNotification";

@Entity("notification")
export class Notification {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("varchar", { name: "name", nullable: true, length: 255 })
  name: string | null;

  @Column("varchar", { name: "config", nullable: true, length: 255 })
  config: string | null;

  @Column("boolean", { name: "active", default: true })
  active: boolean;

  @Column("integer", { name: "user_id" })
  userId: number;

  @Column("boolean", { name: "is_default", default: false })
  isDefault: boolean;

  @OneToMany(
    () => MonitorNotification,
    (monitorNotification) => monitorNotification.notification
  )
  monitorNotifications: MonitorNotification[];
}
