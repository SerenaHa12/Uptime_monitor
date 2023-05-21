import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Monitor } from "./Monitor";

@Entity("docker_host")
export class DockerHost {
  @PrimaryGeneratedColumn({ type: "integer", name: "id" })
  id: number;

  @Column("int", { name: "user_id" })
  userId: number;

  @Column("varchar", { name: "docker_daemon", nullable: true, length: 255 })
  dockerDaemon: string | null;

  @Column("varchar", { name: "docker_type", nullable: true, length: 255 })
  dockerType: string | null;

  @Column("varchar", { name: "name", nullable: true, length: 255 })
  name: string | null;

  @OneToMany(() => Monitor, (monitor) => monitor.dockerHost)
  monitors: Monitor[];

  /**
     * Returns an object that ready to parse to JSON
     * @returns {Object}
     */
  toJSON() {
    return {
        id: this.id,
        userID: this.userId,
        dockerDaemon: this.dockerDaemon,
        dockerType: this.dockerType,
        name: this.name,
    };
}
}
