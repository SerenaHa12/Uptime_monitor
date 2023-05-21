import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Maintenance } from "./Maintenance";

@Entity("user")
export class User {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("varchar", { name: "username", length: 255, unique: true })
  username: string;

  @Column("varchar", { name: "password", nullable: true, length: 255 })
  password: string | null;

  @Column("boolean", { name: "active", default: true })
  active: boolean;

  @Column("varchar", { name: "timezone", nullable: true, length: 150 })
  timezone: string | null;

  @Column("varchar", { name: "twofa_secret", nullable: true, length: 64 })
  twofaSecret: string | null;

  @Column("boolean", { name: "twofa_status", default: false })
  twofaStatus: boolean;

  @Column("varchar", { name: "twofa_last_token", nullable: true, length: 6 })
  twofaLastToken: string | null;

  @OneToMany(() => Maintenance, (maintenance) => maintenance.user)
  maintenances: Maintenance[];
}
