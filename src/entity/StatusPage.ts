import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { StatusPageCname } from "./StatusPageCname";
import { MaintenanceStatusPage } from "./MaintenanceStatusPage";
import { Maintenance } from "./Maintenance";

@Index("slug", ["slug"], { unique: true })
@Entity("status_page")
export class StatusPage {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("varchar", { name: "slug", length: 255, unique: true })
  slug: string;

  @Column("varchar", { name: "title", length: 255 })
  title: string;

  @Column("text", { name: "description", nullable: true })
  description: string | null;

  @Column("varchar", { name: "icon", length: 255 })
  icon: string;

  @Column("varchar", { name: "theme", length: 30 })
  theme: string;

  @Column("boolean", { name: "published", default: true })
  published: boolean;

  @Column("boolean", { name: "search_engine_index", default: true })
  searchEngineIndex: boolean;

  @Column("boolean", { name: "show_tags", default: false })
  showTags: boolean;

  @Column("varchar", { name: "password", nullable: true })
  password: string | null;

  @CreateDateColumn({
    name: "created_date",
  })
  createdDate: Date;

  @CreateDateColumn({
    name: "modified_date",
  })
  modifiedDate: Date;

  @Column("text", { name: "footer_text", nullable: true })
  footerText: string | null;

  @Column("text", { name: "custom_css", nullable: true })
  customCss: string | null;

  @Column("boolean", { name: "show_powered_by", default: true })
  showPoweredBy: boolean;

  @OneToMany(
    () => StatusPageCname,
    (statusPageCname) => statusPageCname.statusPage
  )
  statusPageCnames: StatusPageCname[];

  @OneToMany(
    () => MaintenanceStatusPage,
    (maintenanceStatusPage) => maintenanceStatusPage.statusPage
  )
  maintenanceStatusPages: MaintenanceStatusPage[];
}
