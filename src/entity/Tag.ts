import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { MonitorTag } from "./MonitorTag";

@Entity("tag")
export class Tag {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("varchar", { name: "name", length: 255 })
  name: string;

  @Column("varchar", { name: "color", length: 255 })
  color: string;

  @CreateDateColumn({
    name: "created_date",
  })
  createdDate: Date;

  @OneToMany(() => MonitorTag, (monitorTag) => monitorTag.tag)
  monitorTags: MonitorTag[];

  /**
     * Return an object that ready to parse to JSON
     * @returns {Object}
     */
  toJSON() {
    return {
        id: this.id,
        name: this.name,
        color: this.color,
    };
}
}
