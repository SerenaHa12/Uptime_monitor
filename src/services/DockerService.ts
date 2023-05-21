import { AppDataSource } from "../data-source";
import { DockerHost } from "../entity/DockerHost";
import { Monitor } from "../entity/Monitor";

const axios = require("axios");
const https = require("https");

export class DockerHostService {
  /**
   * Save a docker host
   * @param {Object} dockerHost Docker host to save
   * @param {?number} dockerHostID ID of the docker host to update
   * @param {number} userID ID of the user who adds the docker host
   * @returns {Promise<Bean>}
   */
  static async save(dockerHost, dockerHostID, userID) {
    let bean;

    if (dockerHostID) {
      bean = await AppDataSource.manager.findOneBy(DockerHost, {
        id: dockerHostID,
        userId: userID,
      });

      if (!bean) {
        throw new Error("docker host not found");
      }
    } else {
      bean = new DockerHost();
    }

    bean.user_id = userID;
    bean.docker_daemon = dockerHost.dockerDaemon;
    bean.docker_type = dockerHost.dockerType;
    bean.name = dockerHost.name;

    await AppDataSource.manager.save(bean);
    return bean;
  }

  /**
   * Delete a Docker host
   * @param {number} dockerHostID ID of the Docker host to delete
   * @param {number} userID ID of the user who created the Docker host
   * @returns {Promise<void>}
   */
  static async delete(dockerHostID, userID) {
    const bean = await AppDataSource.manager.findOneBy(DockerHost, {
      id: dockerHostID,
      userId: userID,
    });

    if (!bean) {
      throw new Error("docker host not found");
    }

    // Delete removed proxy from monitors if exists
    await AppDataSource.manager.update(
      Monitor,
      { dockerHost: dockerHostID },
      { dockerHost: null }
    );

    await AppDataSource.manager.delete(DockerHost, { id: dockerHostID });
  }

  /**
   * Fetches the amount of containers on the Docker host
   * @param {Object} dockerHost Docker host to check for
   * @returns {number} Total amount of containers on the host
   */
  static async testDockerHost(dockerHost) {
    const options: any = {
      url: "/containers/json?all=true",
      headers: {
        Accept: "*/*",
        "User-Agent": "Uptime-Kuma/",
      },
      httpsAgent: new https.Agent({
        maxCachedSessions: 0, // Use Custom agent to disable session reuse (https://github.com/nodejs/node/issues/3940)
        rejectUnauthorized: false,
      }),
    };

    if (dockerHost.dockerType === "socket") {
      options.socketPath = dockerHost.dockerDaemon;
    } else if (dockerHost.dockerType === "tcp") {
      options.baseURL = DockerHostService.patchDockerURL(
        dockerHost.dockerDaemon
      );
    }

    let res = await axios.request(options);

    if (Array.isArray(res.data)) {
      if (res.data.length > 1) {
        if ("ImageID" in res.data[0]) {
          return res.data.length;
        } else {
          throw new Error(
            "Invalid Docker response, is it Docker really a daemon?"
          );
        }
      } else {
        return res.data.length;
      }
    } else {
      throw new Error("Invalid Docker response, is it Docker really a daemon?");
    }
  }

  /**
   * Since axios 0.27.X, it does not accept `tcp://` protocol.
   * Change it to `http://` on the fly in order to fix it. (https://github.com/louislam/uptime-kuma/issues/2165)
   */
  static patchDockerURL(url) {
    if (typeof url === "string") {
      // Replace the first occurrence only with g
      return url.replace(/tcp:\/\//g, "http://");
    }
    return url;
  }
}
