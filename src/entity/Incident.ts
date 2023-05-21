import { Column, CreateDateColumn, Entity } from "typeorm";

@Entity("incident")
export class Incident {
  @Column("integer", { primary: true, name: "id" })
  id: number;

  @Column("varchar", { name: "title", length: 255 })
  title: string;

  @Column("text", { name: "content" })
  content: string;

  @Column("varchar", { name: "style", length: 30, default: "warning" })
  style: string;

  @CreateDateColumn({
    name: "created_date",
  })
  createdDate: Date;

  @Column({ name: "last_updated_date", nullable: true })
  lastUpdatedDate: Date | null;

  @Column("boolean", { name: "pin", default: true })
  pin: boolean;

  @Column("boolean", { name: "active", default: true })
  active: boolean;

  @Column("integer", { name: "status_page_id", nullable: true })
  statusPageId: number | null;

  /**
   * Return an object that ready to parse to JSON for public
   * Only show necessary data to public
   * @returns {Object}
  */
  toPublicJSON() {
    return {
        id: this.id,
        style: this.style,
        title: this.title,
        content: this.content,
        pin: this.pin,
        createdDate: this.createdDate,
        lastUpdatedDate: this.lastUpdatedDate,
    };
  }
}
