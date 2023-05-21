import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("setting")
export class Setting {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number | null;

  @Column("varchar", { name: "key", length: 200, unique: true })
  key: string;

  @Column("text", { name: "value", nullable: true })
  value: string | null;

  @Column("varchar", { name: "type", nullable: true, length: 20 })
  type: string | null;
}
