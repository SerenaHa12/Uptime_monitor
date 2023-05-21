import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { Notification } from "./Notification";
import { Monitor } from "./Monitor";

@Index("monitor_notification_index", ["monitorId", "notificationId"], {})
@Entity("monitor_notification")
export class MonitorNotification {
  @Column("integer", { primary: true, name: "id" })
  id: number;

  @Column("integer", { name: "monitor_id" })
  monitorId: number;

  @Column("integer", { name: "notification_id" })
  notificationId: number;

  @ManyToOne(
    () => Notification,
    (notification) => notification.monitorNotifications,
    { onDelete: "CASCADE", onUpdate: "CASCADE" }
  )
  @JoinColumn([{ name: "notification_id", referencedColumnName: "id" }])
  notification: Notification;

  @ManyToOne(() => Monitor, (monitor) => monitor.monitorNotifications, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn([{ name: "monitor_id", referencedColumnName: "id" }])
  monitor: Monitor;
}
