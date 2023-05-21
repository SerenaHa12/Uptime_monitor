import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Monitor } from "./Monitor";
import { Tag } from "./Tag";

@Index("monitor_tag_tag_id_index", ["tagId"], {})
@Index("monitor_tag_monitor_id_index", ["monitorId"], {})
@Entity("monitor_tag")
export class MonitorTag {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("integer", { name: "monitor_id" })
  monitorId: number;

  @Column("integer", { name: "tag_id" })
  tagId: number;

  @Column("text", { name: "value", nullable: true })
  value: string | null;

  @ManyToOne(() => Monitor, (monitor) => monitor.monitorTags, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn([{ name: "monitor_id", referencedColumnName: "id" }])
  monitor: Monitor;

  @ManyToOne(() => Tag, (tag) => tag.monitorTags, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn([{ name: "tag_id", referencedColumnName: "id" }])
  tag: Tag;
}
