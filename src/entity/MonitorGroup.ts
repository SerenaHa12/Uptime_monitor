import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Group } from "./Group";
import { Monitor } from "./Monitor";

@Index("fk", ["monitorId", "groupId"], {})
@Entity("monitor_group")
export class MonitorGroup {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("integer", { name: "monitor_id" })
  monitorId: number;

  @Column("integer", { name: "group_id" })
  groupId: number;

  @Column("integer", { name: "weight", default: 1000 })
  weight: number;

  @Column("boolean", { name: "send_url", default: false })
  sendUrl: boolean;

  @ManyToOne(() => Group, (group) => group.monitorGroups, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn([{ name: "group_id", referencedColumnName: "id" }])
  group: Group;

  @ManyToOne(() => Monitor, (monitor) => monitor.monitorGroups, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn([{ name: "monitor_id", referencedColumnName: "id" }])
  monitor: Monitor;
}
