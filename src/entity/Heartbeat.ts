import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Monitor } from "./Monitor";

@Index("monitor_important_time_index", ["monitorId", "important", "time"], {})
@Index("monitor_time_index", ["monitorId", "time"], {})
@Index("important", ["important"], {})
@Index("monitor_id", ["monitorId"], {})
@Entity("heartbeat")
export class Heartbeat {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("boolean", { name: "important", default: false })
  important: boolean;

  @Column("integer", { name: "monitor_id" })
  monitorId: number;

  @Column("smallint", { name: "status" })
  status: number;

  @Column("text", { name: "msg", nullable: true })
  msg: string | null;

  @Column({ name: "time" })
  time: Date;

  @Column("integer", { name: "ping", nullable: true })
  ping: number | null;

  @Column("integer", { name: "duration", default: 0 })
  duration: number;

  @Column("integer", { name: "down_count", default: 0 })
  downCount: number;

  @ManyToOne(() => Monitor, (monitor) => monitor.heartbeats, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn([{ name: "monitor_id", referencedColumnName: "id" }])
  monitor: Monitor;

  /**
     * Return an object that ready to parse to JSON for public
     * Only show necessary data to public
     * @returns {Object}
     */
    toPublicJSON() {
      return {
          status: this.status,
          time: this.time,
          msg: "",        // Hide for public
          ping: this.ping,
      };
    }

    /**
     * Return an object that ready to parse to JSON
     * @returns {Object}
     */
    toJSON() {
        return {
            monitorID: this.monitorId,
            status: this.status,
            time: this.time,
            msg: this.msg,
            ping: this.ping,
            important: this.important,
            duration: this.duration,
        };
    }
}
