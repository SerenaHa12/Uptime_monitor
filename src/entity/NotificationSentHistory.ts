import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Index("good_index", ["type", "monitorId", "days"], {})
@Entity("notification_sent_history")
export class NotificationSentHistory {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("varchar", { name: "type", length: 50 })
  type: string;

  @Column("integer", { name: "monitor_id" })
  monitorId: number;

  @Column("integer", { name: "days" })
  days: number;
}
