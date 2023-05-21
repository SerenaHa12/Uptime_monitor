import { Column, CreateDateColumn, Entity, OneToMany } from "typeorm";
import { AppDataSource } from "../data-source";
import { MonitorGroup } from "./MonitorGroup";

@Entity("group")
export class Group {
  @Column("integer", { primary: true, name: "id" })
  id: number;

  @Column("varchar", { name: "name", length: 255 })
  name: string;

  @CreateDateColumn({name: "created_date"})
  createdDate: Date;

  @Column("boolean", { name: "public", default: false })
  public: boolean;

  @Column("boolean", { name: "active", default: true })
  active: boolean;

  @Column("integer", { name: "weight", default: 1000 })
  weight: number;

  @Column("integer", { name: "status_page_id", nullable: true })
  statusPageId: number | null;

  @OneToMany(() => MonitorGroup, (monitorGroup) => monitorGroup.group)
  monitorGroups: MonitorGroup[];

  /**
     * Return an object that ready to parse to JSON for public
     * Only show necessary data to public
     * @param {boolean} [showTags=false] Should the JSON include monitor tags
     * @returns {Object}
     */
  async toPublicJSON(showTags = false) {
    let monitorBeanList = await this.getMonitorList();
    let monitorList = [];

    for (let bean of monitorBeanList) {
        monitorList.push(await bean.toPublicJSON(showTags));
    }

    return {
        id: this.id,
        name: this.name,
        weight: this.weight,
        monitorList,
    };
  }

  /**
   * Get all monitors
   * @returns {Bean[]}
   */
  async getMonitorList() {
    const queryRunner = await AppDataSource.createQueryRunner();
    var result = await queryRunner.manager.query(
        `SELECT monitor.*, monitor_group.send_url FROM monitor, monitor_group
        WHERE monitor.id = monitor_group.monitor_id
        AND group_id = ${this.id}
        ORDER BY monitor_group.weight`
    );
    return result
  }
}
