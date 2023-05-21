import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Monitor } from "./Monitor";

@Index("proxy_user_id", ["userId"], {})
@Entity("proxy")
export class Proxy {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("int", { name: "user_id" })
  userId: number;

  @Column("varchar", { name: "protocol", length: 10 })
  protocol: string;

  @Column("varchar", { name: "host", length: 255 })
  host: string;

  @Column("smallint", { name: "port" })
  port: number;

  @Column("boolean", { name: "auth" })
  auth: boolean;

  @Column("varchar", { name: "username", nullable: true, length: 255 })
  username: string | null;

  @Column("varchar", { name: "password", nullable: true, length: 255 })
  password: string | null;

  @Column("boolean", { name: "active", default: true })
  active: boolean;

  @Column("boolean", { name: "default", default: false })
  default: boolean;

  @CreateDateColumn({
    name: "created_date",
  })
  createdDate: Date;

  @OneToMany(() => Monitor, (monitor) => monitor.proxy)
  monitors: Monitor[];
}
