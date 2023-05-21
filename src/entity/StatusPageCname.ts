import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { StatusPage } from "./StatusPage";

@Entity("status_page_cname")
export class StatusPageCname {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("varchar", { name: "domain", unique: true })
  domain: string;

  @ManyToOne(() => StatusPage, (statusPage) => statusPage.statusPageCnames, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn([{ name: "status_page_id", referencedColumnName: "id" }])
  statusPage: StatusPage;
}
