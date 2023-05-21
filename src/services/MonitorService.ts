import dayjs from "dayjs";
import * as https from "https";
import { AppDataSource } from "../data-source";
import { Heartbeat } from "../entity/Heartbeat";
import { Monitor } from "../entity/Monitor";
import { Proxy } from "../entity/Proxy";
import {
  DOWN,
  flipStatus,
  MAINTENANCE,
  PENDING,
  UP,
} from "../utils/status";
import {
  tcping,
  ping,
  dnsResolve,
  checkCertificate,
  checkStatusCode,
  getTotalClientInRoom,
  mssqlQuery,
  postgresQuery,
  mysqlQuery,
  mqttAsync,
  httpNtlm,
  radius,
  grpcQuery,
} from "../utils/util-server";
import { ProxyService } from "./ProxyService";
import axios from "axios";
import { DockerHost } from "../entity/DockerHost";
import { Setting } from "../entity/Setting";
import { MonitorTlsInfo } from "../entity/MonitorTlsInfo";
import { NotificationSentHistory } from "../entity/NotificationSentHistory";
import { CacheableDnsHttpAgent } from "../utils/cacheable-dns-http-agent";
import { DockerHostService } from "./DockerService";
import { MAX_INTERVAL_SECOND, MIN_INTERVAL_SECOND } from "../utils/datetime";
import { log } from "../utils/Logger";

export class MonitorService {
  private monitor: Monitor;
  private heartbeatInterval: NodeJS.Timeout;
  private isStop: boolean = false;

  constructor(monitor: Monitor) {
    this.monitor = monitor;
  }

  encodeBase64(user, pass) {
    return Buffer.from(user + ":" + pass).toString("base64");
  }

  /**
   * Get accepted status codes
   * @returns {Object}
   */
  getAcceptedStatuscodes() {
    return JSON.parse(this.monitor.acceptedStatuscodesJson);
  }

  start() {
    log.info("Monitor", `Start monitor with id: ${this.monitor.id}`)
    let previousBeat: Heartbeat = null;
    let retries = 0;

    const beat = async () => {
      let beatInterval = this.monitor.interval;

      if (!beatInterval) {
        beatInterval = 1;
      }

      if (beatInterval < 20) {
        console.log("beat interval too low, reset to 20s");
        beatInterval = 20;
      }

      // Expose here for prometheus update
      // undefined if not https
      let tlsInfo = undefined;

      if (!previousBeat || this.monitor.type === "push") {
        previousBeat = await AppDataSource.manager.findOne(Heartbeat, {
          where: {
            monitorId: this.monitor.id,
          },
          order: {
            time: "DESC",
          },
        });
      }

      const isFirstBeat = !previousBeat;

      let newBeat = new Heartbeat();
      newBeat.monitorId = this.monitor.id;
      let beatStartTime = dayjs()
      newBeat.time = beatStartTime.toDate();
      newBeat.status = DOWN;
      newBeat.downCount = previousBeat?.downCount || 0;

      if (this.monitor.upsideDown) {
        newBeat.status = flipStatus(newBeat.status);
      }



      try {
        if (this.monitor.type === "http" || this.monitor.type === "keyword") {
          // Do not do any queries/high loading things before the "newBeat.ping"
          let startTime = dayjs().valueOf();

          // HTTP basic auth
          let basicAuthHeader = {};
          if (this.monitor.authMethod === "basic") {
            basicAuthHeader = {
              Authorization:
                "Basic " +
                this.encodeBase64(
                  this.monitor.basicAuthUser,
                  this.monitor.basicAuthPass
                ),
            };
          }

          const httpsAgentOptions = {
            maxCachedSessions: 0, // Use Custom agent to disable session reuse (https://github.com/nodejs/node/issues/3940)
            rejectUnauthorized: !this.monitor.ignoreTls,
          };

          log.debug(
            "monitor",
            `[${this.monitor.name}] Prepare Options for axios`
          );

          // Axios Options
          const options: any = {
            url: this.monitor.url,
            method: (this.monitor.method || "get").toLowerCase(),
            ...(this.monitor.body
              ? { data: JSON.parse(this.monitor.body) }
              : {}),
            timeout: process.env.MONITOR_TIMEOUT,
            headers: {
              Accept:
                "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
              "User-Agent": "Uptime-Kuma/" + 10,
              ...(this.monitor.headers ? JSON.parse(this.monitor.headers) : {}),
              ...basicAuthHeader,
            },
            maxRedirects: this.monitor.maxredirects,
            validateStatus: (status) => {
              return checkStatusCode(status, this.getAcceptedStatuscodes());
            },
          };

          if (this.monitor.proxyId) {
            const proxy = await AppDataSource.manager.findOneBy(Proxy, {
              id: this.monitor.proxyId,
            });

            if (proxy && proxy.active) {
              const { httpAgent, httpsAgent } = ProxyService.createAgents(
                proxy,
                {
                  httpsAgentOptions: httpsAgentOptions,
                }
              );

              options.proxy = false;
              options.httpAgent = httpAgent;
              options.httpsAgent = httpsAgent;
            }
          }

          if (!options.httpsAgent) {
            options.httpsAgent = new https.Agent(httpsAgentOptions);
          }

          log.debug(
            "monitor",
            `[${this.monitor.name}] Axios Options: ${JSON.stringify(options)}`
          );
          log.debug("monitor", `[${this.monitor.name}] Axios Request`);

          // Make Request
          let res = await this.makeAxiosRequest(options);

          newBeat.msg = `${res.status} - ${res.statusText}`;
          newBeat.ping = dayjs().valueOf() - startTime;

          // Check certificate if https is used
          // let certInfoStartTime = dayjs().valueOf();
          // if (this.getUrl()?.protocol === "https:") {
          //   log.debug("monitor", `[${this.monitor.name}] Check cert`);
          //   try {
          //     let tlsInfoObject = checkCertificate(res);
          //     tlsInfo = await this.updateTlsInfo(tlsInfoObject);

          //     if (!this.monitor.ignoreTls && this.monitor.expiryNotification) {
          //       log.debug(
          //         "monitor",
          //         `[${this.monitor.name}] call sendCertNotification`
          //       );
          //       // await this.sendCertNotification(tlsInfoObject);
          //     }
          //   } catch (e) {
          //     if (e.message !== "No TLS certificate in response") {
          //       log.error("monitor", "Caught error");
          //       log.error("monitor", e.message);
          //     }
          //   }
          // }

          if (this.monitor.type === "http") {
            newBeat.status = UP;
          } else {
            let data = res.data;

            // Convert to string for object/array
            if (typeof data !== "string") {
              data = JSON.stringify(data);
            }

            if (data.includes(this.monitor.keyword)) {
              newBeat.msg += ", keyword is found";
              newBeat.status = UP;
            } else {
              data = data.replace(/<[^>]*>?|[\n\r]|\s+/gm, " ");
              if (data.length > 50) {
                data = data.substring(0, 47) + "...";
              }
              throw new Error(
                newBeat.msg + ", but keyword is not in [" + data + "]"
              );
            }
          }
        } else if (this.monitor.type === "port") {
          newBeat.ping = await tcping(this.monitor.hostname, this.monitor.port);
          newBeat.msg = "";
          newBeat.status = UP;
        } else if (this.monitor.type === "ping") {
          newBeat.ping = await ping(this.monitor.hostname);
          newBeat.msg = "";
          newBeat.status = UP;
        } else if (this.monitor.type === "dns") {
          let startTime = dayjs().valueOf();
          let dnsMessage = "";

          let dnsRes = await dnsResolve(
            this.monitor.hostname,
            this.monitor.dnsResolveServer,
            this.monitor.port,
            this.monitor.dnsResolveType
          );
          newBeat.ping = dayjs().valueOf() - startTime;

          if (
            this.monitor.dnsResolveType === "A" ||
            this.monitor.dnsResolveType === "AAAA" ||
            this.monitor.dnsResolveType === "TXT"
          ) {
            dnsMessage += "Records: ";
            dnsMessage += dnsRes.join(" | ");
          } else if (
            this.monitor.dnsResolveType === "CNAME" ||
            this.monitor.dnsResolveType === "PTR"
          ) {
            dnsMessage = dnsRes[0];
          } else if (this.monitor.dnsResolveType === "CAA") {
            dnsMessage = dnsRes[0].issue;
          } else if (this.monitor.dnsResolveType === "MX") {
            dnsRes.forEach((record) => {
              dnsMessage += `Hostname: ${record.exchange} - Priority: ${record.priority} | `;
            });
            dnsMessage = dnsMessage.slice(0, -2);
          } else if (this.monitor.dnsResolveType === "NS") {
            dnsMessage += "Servers: ";
            dnsMessage += dnsRes.join(" | ");
          } else if (this.monitor.dnsResolveType === "SOA") {
            dnsMessage += `NS-Name: ${dnsRes.nsname} | Hostmaster: ${dnsRes.hostmaster} | Serial: ${dnsRes.serial} | Refresh: ${dnsRes.refresh} | Retry: ${dnsRes.retry} | Expire: ${dnsRes.expire} | MinTTL: ${dnsRes.minttl}`;
          } else if (this.monitor.dnsResolveType === "SRV") {
            dnsRes.forEach((record) => {
              dnsMessage += `Name: ${record.name} | Port: ${record.port} | Priority: ${record.priority} | Weight: ${record.weight} | `;
            });
            dnsMessage = dnsMessage.slice(0, -2);
          }

          if (this.monitor.dnsLastResult !== dnsMessage) {
            AppDataSource.manager.update(
              Monitor,
              { id: this.monitor.id },
              { dnsLastResult: dnsMessage }
            );
          }

          newBeat.msg = dnsMessage;
          newBeat.status = UP;
        } else if (this.monitor.type === "push") {
          // Type: Push
          log.debug(
            "monitor",
            `[${this.monitor.name}] Checking monitor at ${dayjs().format(
              "YYYY-MM-DD HH:mm:ss.SSS"
            )}`
          );
          const bufferTime = 1000; // 1s buffer to accommodate clock differences

          if (previousBeat) {
            const msSinceLastBeat =
              dayjs.utc().valueOf() - dayjs.utc(previousBeat.time).valueOf();

            log.debug(
              "monitor",
              `[${this.monitor.name}] msSinceLastBeat = ${msSinceLastBeat}`
            );

            // If the previous beat was down or pending we use the regular
            // beatInterval/retryInterval in the setTimeout further below
            if (
              previousBeat.status !== (this.monitor.upsideDown ? DOWN : UP) ||
              msSinceLastBeat > beatInterval * 1000 + bufferTime
            ) {
              throw new Error("No heartbeat in the time window");
            } else {
              let timeout = beatInterval * 1000 - msSinceLastBeat;
              if (timeout < 0) {
                timeout = bufferTime;
              } else {
                timeout += bufferTime;
              }
              // No need to insert successful heartbeat for push type, so end here
              retries = 0;
              log.debug(
                "monitor",
                `[${this.monitor.name}] timeout = ${timeout}`
              );
              this.heartbeatInterval = setTimeout(beat, timeout);
              return;
            }
          } else {
            throw new Error("No heartbeat in the time window");
          }
        } else if (this.monitor.type === "steam") {
          const steamApiUrl =
            "https://api.steampowered.com/IGameServersService/GetServerList/v1/";
          const steamAPIKey = await AppDataSource.manager.findOneBy(Setting, {
            key: "steamAPIKey",
          });
          const filter = `addr\\${this.monitor.hostname}:${this.monitor.port}`;

          if (!steamAPIKey) {
            throw new Error("Steam API Key not found");
          }

          let res = await axios.get(steamApiUrl, {
            timeout: parseInt(process.env.MONITOR_TIMEOUT),
            headers: {
              Accept: "*/*",
              "User-Agent": "Uptime-Kuma/",
            },
            httpsAgent: CacheableDnsHttpAgent.getHttpsAgent({
              maxCachedSessions: 0, // Use Custom agent to disable session reuse (https://github.com/nodejs/node/issues/3940)
              rejectUnauthorized: !this.monitor.ignoreTls,
            }),
            httpAgent: CacheableDnsHttpAgent.getHttpAgent({
              maxCachedSessions: 0,
            }),
            maxRedirects: this.monitor.maxredirects,
            validateStatus: (status) => {
              return checkStatusCode(status, this.getAcceptedStatuscodes());
            },
            params: {
              filter: filter,
              key: steamAPIKey,
            },
          });

          if (
            res.data.response &&
            res.data.response.servers &&
            res.data.response.servers.length > 0
          ) {
            newBeat.status = UP;
            newBeat.msg = res.data.response.servers[0].name;

            try {
              newBeat.ping = await ping(this.monitor.hostname);
            } catch (_) { }
          } else {
            throw new Error("Server not found on Steam");
          }
        } else if (this.monitor.type === "docker") {
          log.debug(
            "Monitor",
            `[${this.monitor.name}] Prepare Options for Axios`
          );

          const dockerHost = await AppDataSource.manager.findOneBy(DockerHost, {
            id: this.monitor.dockerHost.id,
          });

          const options: any = {
            url: `/containers/${this.monitor.dockerContainer}/json`,
            headers: {
              Accept: "*/*",
              "User-Agent": "Uptime-Kuma/" + 10,
            },
            httpsAgent: new https.Agent({
              maxCachedSessions: 0, // Use Custom agent to disable session reuse (https://github.com/nodejs/node/issues/3940)
              rejectUnauthorized: !this.monitor.ignoreTls,
            }),
          };

          if (dockerHost.dockerType === "socket") {
            options.socketPath = dockerHost.dockerDaemon;
          } else if (dockerHost.dockerType === "tcp") {
            options.baseURL = DockerHostService.patchDockerURL(
              dockerHost.dockerDaemon
            );
          }

          log.debug("Monitor", `[${this.monitor.name}] Axios Request`);
          let res = await axios.request(options);
          if (res.data.State.Running) {
            newBeat.status = UP;
            newBeat.msg = res.data.State.Status;
          } else {
            throw Error("Container State is " + res.data.State.Status);
          }
        } else if (this.monitor.type === "mqtt") {
          newBeat.msg = await mqttAsync(
            this.monitor.hostname,
            this.monitor.mqttTopic,
            this.monitor.mqttSuccessMessage,
            {
              port: this.monitor.port,
              username: this.monitor.mqttUsername,
              password: this.monitor.mqttPassword,
              interval: this.monitor.interval,
            }
          );
          newBeat.status = UP;
        } else if (this.monitor.type === "sqlserver") {
          let startTime = dayjs().valueOf();

          await mssqlQuery(
            this.monitor.databaseConnectionString,
            this.monitor.databaseQuery
          );

          newBeat.msg = "";
          newBeat.status = UP;
          newBeat.ping = dayjs().valueOf() - startTime;
        } else if (this.monitor.type === "grpc-keyword") {
          let startTime = dayjs().valueOf();
          const options = {
            grpcUrl: this.monitor.grpcUrl,
            grpcProtobufData: this.monitor.grpcProtobuf,
            grpcServiceName: this.monitor.grpcServiceName,
            grpcEnableTls: this.monitor.grpcEnableTls,
            grpcMethod: this.monitor.grpcMethod,
            grpcBody: this.monitor.grpcBody,
            keyword: this.monitor.keyword
          };
          const response = await grpcQuery(options);
          newBeat.ping = dayjs().valueOf() - startTime;
          log.debug("monitor:", `gRPC response: ${JSON.stringify(response)}`);
          let responseData = response.data;
          if (responseData.length > 50) {
            responseData = responseData.toString().substring(0, 47) + "...";
          }
          if (response.code !== 1) {
            newBeat.status = DOWN;
            newBeat.msg = `Error in send gRPC ${response.code} ${response.errorMessage}`;
          } else {
            if (response.data.toString().includes(this.monitor.keyword)) {
              newBeat.status = UP;
              newBeat.msg = `${responseData}, keyword [${this.monitor.keyword}] is found`;
            } else {
              log.debug("monitor:", `GRPC response [${response.data}] + ", but keyword [${this.monitor.keyword}] is not in [" + ${response.data} + "]"`);
              newBeat.status = DOWN;
              newBeat.msg = `, but keyword [${this.monitor.keyword}] is not in [" + ${responseData} + "]`;
            }
          }
        } else if (this.monitor.type === "postgres") {
          let startTime = dayjs().valueOf();

          await postgresQuery(
            this.monitor.databaseConnectionString,
            this.monitor.databaseQuery
          );

          newBeat.msg = "";
          newBeat.status = UP;
          newBeat.ping = dayjs().valueOf() - startTime;
        } else if (this.monitor.type === "mysql") {
          let startTime = dayjs().valueOf();

          await mysqlQuery(
            this.monitor.databaseConnectionString,
            this.monitor.databaseQuery
          );

          newBeat.msg = "";
          newBeat.status = UP;
          newBeat.ping = dayjs().valueOf() - startTime;
        } else if (this.monitor.type === "radius") {
          let startTime = dayjs().valueOf();

          // Handle monitors that were created before the
          // update and as such don't have a value for
          // this.monitor.port.
          let port;
          if (this.monitor.port == null) {
            port = 1812;
          } else {
            port = this.monitor.port;
          }

          try {
            const resp = await radius(
              this.monitor.hostname,
              this.monitor.radiusUsername,
              this.monitor.radiusPassword,
              this.monitor.radiusCalledStationId,
              this.monitor.radiusCallingStationId,
              this.monitor.radiusSecret,
              port
            );
            if (resp.code) {
              newBeat.msg = resp.code;
            }
            newBeat.status = UP;
          } catch (error) {
            newBeat.status = DOWN;
            if (error.response?.code) {
              newBeat.msg = error.response.code;
            } else {
              newBeat.msg = error.message;
            }
          }
          newBeat.ping = dayjs().valueOf() - startTime;
        } else {
          newBeat.msg = "Unknown Monitor Type";
          newBeat.status = PENDING;
        }

        if (this.monitor.upsideDown) {
          newBeat.status = flipStatus(newBeat.status);

          if (newBeat.status === DOWN) {
            throw new Error("Flip UP to DOWN");
          }
        }

        retries = 0;
      } catch (error) {
        newBeat.msg = error.message;

        // If UP come in here, it must be upside down mode
        // Just reset the retries
        if (this.monitor.upsideDown && newBeat.status === UP) {
          retries = 0;
        } else if (
          this.monitor.maxretries > 0 &&
          retries < this.monitor.maxretries
        ) {
          retries++;
          newBeat.status = PENDING;
        }
      }

      log.debug("monitor", `[${this.monitor.name}] Check isImportant`);
      let isImportant = MonitorService.isImportantBeat(
        isFirstBeat,
        previousBeat?.status,
        newBeat.status
      );

      // Mark as important if status changed, ignore pending pings,
      // Don't notify if disrupted changes to up
      if (isImportant) {
        // TODO send notification
        newBeat.important = true;
        // if (this.isImportantForNotification(isFirstBeat, previousBeat?.status, newBeat.status)) {
        //     log.debug("monitor", `[${this.monitor.name}] sendNotification`);
        // await Monitor.sendNotification(isFirstBeat, this, bean);
        // } else {
        //     log.debug("monitor", `[${this.monitor.name}] will not sendNotification because it is (or was) under maintenance`);
        // }
        // Reset down count
        newBeat.downCount = 0;
        // Clear Status Page Cache
        log.debug("monitor", `[${this.monitor.name}] apicache clear`);
        // apicache.clear();
        // UptimeKumaServer.getInstance().sendMaintenanceListByUserID(this.user_id);
      } else {
        newBeat.important = false;

        if (newBeat.status === DOWN && this.monitor.resendInterval > 0) {
          ++newBeat.downCount;
          if (newBeat.downCount >= this.monitor.resendInterval) {
            // TODO send notification
            // Send notification again, because we are still DOWN
            // log.debug("monitor", `[${this.monitor.name}] sendNotification again: Down Count: ${newBeat.downCount} | Resend Interval: ${this.monitor.resendInterval}`);
            // await Monitor.sendNotification(isFirstBeat, this, bean);

            // Reset down count
            newBeat.downCount = 0;
          }
        }
      }

      if (newBeat.status === UP) {
        log.debug(
          "monitor",
          `Monitor #${this.monitor.id} '${this.monitor.name}': Successful Response: ${newBeat.ping} ms | Interval: ${beatInterval} seconds | Type: ${this.monitor.type}`
        );
      } else if (newBeat.status === PENDING) {
        if (this.monitor.retryInterval > 0) {
          beatInterval = this.monitor.retryInterval;
        }
        log.warn(
          "monitor",
          `Monitor #${this.monitor.id} '${this.monitor.name}': Pending: ${newBeat.msg} | Max retries: ${this.monitor.maxretries} | Retry: ${retries} | Retry Interval: ${beatInterval} seconds | Type: ${this.monitor.type}`
        );
      } else if (newBeat.status === MAINTENANCE) {
        log.warn(
          "monitor",
          `Monitor #${this.monitor.id} '${this.monitor.name}': Under Maintenance | Type: ${this.monitor.type}`
        );
      } else {
        log.warn(
          "monitor",
          `Monitor #${this.monitor.id} '${this.monitor.name}': Failing: ${newBeat.msg} | Interval: ${beatInterval} seconds | Type: ${this.monitor.type} | Down Count: ${newBeat.downCount} | Resend Interval: ${this.monitor.resendInterval}`
        );
      }

      log.debug("monitor", `[${this.monitor.name}] Send to socket`);
      // UptimeCacheList.clearCache(this.monitor.id);
      // io.to(this.monitor.userId).emit("heartbeat", newBeat.toJSON());
      // Monitor.sendStats(io, this.monitor.id, this.monitor.user_id);

      log.debug("monitor", `[${this.monitor.name}] Store`);
      AppDataSource.manager.save(newBeat).catch((e) => log.error("db", e.message));

      log.debug("monitor", `[${this.monitor.name}] prometheus.update`);
      // prometheus.update(bean, tlsInfo);

      // Duration
      newBeat.duration = dayjs().diff(
        beatStartTime,
        "millisecond"
      );

      previousBeat = newBeat;

      if (!this.isStop) {
        log.debug(
          "monitor",
          `[${this.monitor.name}] SetTimeout for next check.`
        );
        const nextBeat = 60 * 1000 - dayjs().diff(
          beatStartTime,
          "millisecond"
        );
        this.heartbeatInterval = setTimeout(safeBeat, nextBeat);
      } else {
        log.info(
          "monitor",
          `[${this.monitor.name}] isStop = true, no next check.`
        );
      }
    };

    /** Get a heartbeat and handle errors */
    const safeBeat = async () => {
      try {
        await beat();
      } catch (e) {
        console.trace(e);
        // UptimeKumaServer.errorLog(e, false);
        log.error(
          "monitor",
          "Please report to https://github.com/louislam/uptime-kuma/issues"
        );

        if (!this.isStop) {
          log.info("monitor", "Try to restart the monitor");
          this.heartbeatInterval = setTimeout(
            safeBeat,
            this.monitor.interval * 1000
          );
        }
      }
    };

    // Delay Push Type
    if (this.monitor.type === "push") {
      setTimeout(() => {
        safeBeat();
      }, this.monitor.interval * 1000);
    } else {
      safeBeat();
    }
  }

  async makeAxiosRequest(options, finalCall = false) {
    try {
      let res;
      if (this.monitor.authMethod === "ntlm") {
        options.httpsAgent.keepAlive = true;

        res = await httpNtlm(options, {
          username: this.monitor.basicAuthUser,
          password: this.monitor.basicAuthPass,
          domain: this.monitor.authDomain,
          workstation: this.monitor.authWorkstation
            ? this.monitor.authWorkstation
            : undefined,
        });
      } else {
        res = await axios.request(options);
      }

      return res;
    } catch (e) {
      // Fix #2253
      // Read more: https://stackoverflow.com/questions/1759956/curl-error-18-transfer-closed-with-outstanding-read-data-remaining
      if (
        !finalCall &&
        typeof e.message === "string" &&
        e.message.includes("maxContentLength size of -1 exceeded")
      ) {
        log.debug("monitor", "makeAxiosRequest with gzip");
        options.headers["Accept-Encoding"] = "gzip, deflate";
        return this.makeAxiosRequest(options, true);
      } else {
        if (
          typeof e.message === "string" &&
          e.message.includes("maxContentLength size of -1 exceeded")
        ) {
          e.message = "response timeout: incomplete response within a interval";
        }
        throw e;
      }
    }
  }

  /** Stop monitor */
  stop() {
    clearTimeout(this.heartbeatInterval);
    this.isStop = true;

    // this.prometheus().remove();
  }

  /**
   * Get a new prometheus instance
   * @returns {Prometheus}
   */
  prometheus() {
    // return new Prometheus(this);
  }

  /**
   * Helper Method:
   * returns URL object for further usage
   * returns null if url is invalid
   * @returns {(null|URL)}
   */
  getUrl() {
    try {
      return new URL(this.monitor.url);
    } catch (_) {
      return null;
    }
  }

  /**
   * Store TLS info to database
   * @param checkCertificateResult
   * @returns {Promise<Object>}
   */
  async updateTlsInfo(checkCertificateResult) {
    let tlsInfoBean = await AppDataSource.manager.findOneBy(MonitorTlsInfo, {
      monitorId: this.monitor.id,
    });

    if (tlsInfoBean == null) {
      tlsInfoBean = new MonitorTlsInfo();
      tlsInfoBean.monitorId = this.monitor.id;
    } else {
      // Clear sent history if the cert changed.
      try {
        let oldCertInfo = JSON.parse(tlsInfoBean.infoJson);

        let isValidObjects =
          oldCertInfo &&
          oldCertInfo.certInfo &&
          checkCertificateResult &&
          checkCertificateResult.certInfo;

        if (isValidObjects) {
          if (
            oldCertInfo.certInfo.fingerprint256 !==
            checkCertificateResult.certInfo.fingerprint256
          ) {
            log.debug("monitor", "Resetting sent_history");
            await AppDataSource.manager.delete(NotificationSentHistory, {
              type: "certificate",
              monitorId: this.monitor.id,
            });
          } else {
            log.debug("monitor", "No need to reset sent_history");
            log.debug("monitor", oldCertInfo.certInfo.fingerprint256);
            log.debug(
              "monitor",
              checkCertificateResult.certInfo.fingerprint256
            );
          }
        } else {
          log.debug("monitor", "Not valid object");
        }
      } catch (e) { }
    }

    tlsInfoBean.infoJson = JSON.stringify(checkCertificateResult);
    AppDataSource.manager.save(tlsInfoBean);

    return checkCertificateResult;
  }

  /**
   * Send statistics to clients
   * @param {Server} io Socket server instance
   * @param {number} monitorID ID of monitor to send
   * @param {number} userID ID of user to send to
   */
  // static async sendStats(io, monitorID, userID) {
  //     const hasClients = getTotalClientInRoom(io, userID) > 0;

  //     if (hasClients) {
  //         await Monitor.sendAvgPing(24, io, monitorID, userID);
  //         await Monitor.sendUptime(24, io, monitorID, userID);
  //         await Monitor.sendUptime(24 * 30, io, monitorID, userID);
  //         await Monitor.sendCertInfo(io, monitorID, userID);
  //     } else {
  //         log.debug("monitor", "No clients in the room, no need to send stats");
  //     }
  // }

  /**
   * Send the average ping to user
   * @param {number} duration Hours
   */
  // static async sendAvgPing(duration, io, monitorID, userID) {
  //     const timeLogger = new TimeLogger();

  //     let avgPing = parseInt(await R.getCell(`
  //         SELECT AVG(ping)
  //         FROM heartbeat
  //         WHERE time > DATETIME('now', ? || ' hours')
  //         AND ping IS NOT NULL
  //         AND monitor_id = ? `, [
  //         -duration,
  //         monitorID,
  //     ]));

  //     timeLogger.print(`[Monitor: ${monitorID}] avgPing`);

  //     io.to(userID).emit("avgPing", monitorID, avgPing);
  // }

  /**
   * Send certificate information to client
   * @param {Server} io Socket server instance
   * @param {number} monitorID ID of monitor to send
   * @param {number} userID ID of user to send to
   */
  // static async sendCertInfo(io, monitorID, userID) {
  //     let tlsInfo = await R.findOne("monitor_tls_info", "monitor_id = ?", [
  //         monitorID,
  //     ]);
  //     if (tlsInfo != null) {
  //         io.to(userID).emit("certInfo", monitorID, tlsInfo.info_json);
  //     }
  // }

  /**
   * Uptime with calculation
   * Calculation based on:
   * https://www.uptrends.com/support/kb/reporting/calculation-of-uptime-and-downtime
   * @param {number} duration Hours
   * @param {number} monitorID ID of monitor to calculate
   */
  // static async calcUptime(duration, monitorID, forceNoCache = false) {

  //     if (!forceNoCache) {
  //         let cachedUptime = UptimeCacheList.getUptime(monitorID, duration);
  //         if (cachedUptime != null) {
  //             return cachedUptime;
  //         }
  //     }

  //     const timeLogger = new TimeLogger();

  //     const startTime = R.isoDateTime(dayjs.utc().subtract(duration, "hour"));

  //     // Handle if heartbeat duration longer than the target duration
  //     // e.g. If the last beat's duration is bigger that the 24hrs window, it will use the duration between the (beat time - window margin) (THEN case in SQL)
  //     let result = await R.getRow(`
  //         SELECT
  //            -- SUM all duration, also trim off the beat out of time window
  //             SUM(
  //                 CASE
  //                     WHEN (JULIANDAY(\`time\`) - JULIANDAY(?)) * 86400 < duration
  //                     THEN (JULIANDAY(\`time\`) - JULIANDAY(?)) * 86400
  //                     ELSE duration
  //                 END
  //             ) AS total_duration,

  //            -- SUM all uptime duration, also trim off the beat out of time window
  //             SUM(
  //                 CASE
  //                     WHEN (status = 1 OR status = 3)
  //                     THEN
  //                         CASE
  //                             WHEN (JULIANDAY(\`time\`) - JULIANDAY(?)) * 86400 < duration
  //                                 THEN (JULIANDAY(\`time\`) - JULIANDAY(?)) * 86400
  //                             ELSE duration
  //                         END
  //                     END
  //             ) AS uptime_duration
  //         FROM heartbeat
  //         WHERE time > ?
  //         AND monitor_id = ?
  //     `, [
  //         startTime, startTime, startTime, startTime, startTime,
  //         monitorID,
  //     ]);

  //     timeLogger.print(`[Monitor: ${monitorID}][${duration}] sendUptime`);

  //     let totalDuration = result.total_duration;
  //     let uptimeDuration = result.uptime_duration;
  //     let uptime = 0;

  //     if (totalDuration > 0) {
  //         uptime = uptimeDuration / totalDuration;
  //         if (uptime < 0) {
  //             uptime = 0;
  //         }

  //     } else {
  //         // Handle new monitor with only one beat, because the beat's duration = 0
  //         let status = parseInt(await R.getCell("SELECT `status` FROM heartbeat WHERE monitor_id = ?", [ monitorID ]));

  //         if (status === UP) {
  //             uptime = 1;
  //         }
  //     }

  //     // Cache
  //     UptimeCacheList.addUptime(monitorID, duration, uptime);

  //     return uptime;
  // }

  /**
   * Send Uptime
   * @param {number} duration Hours
   * @param {Server} io Socket server instance
   * @param {number} monitorID ID of monitor to send
   * @param {number} userID ID of user to send to
   */
  // static async sendUptime(duration, io, monitorID, userID) {
  //     const uptime = await this.calcUptime(duration, monitorID);
  //     io.to(userID).emit("uptime", monitorID, duration, uptime);
  // }

  /**
   * Has status of monitor changed since last beat?
   * @param {boolean} isFirstBeat Is this the first beat of this monitor?
   * @param {const} previousBeatStatus Status of the previous beat
   * @param {const} currentBeatStatus Status of the current beat
   * @returns {boolean} True if is an important beat else false
   */
  static isImportantBeat(isFirstBeat, previousBeatStatus, currentBeatStatus) {
    // * ? -> ANY STATUS = important [isFirstBeat]
    // UP -> PENDING = not important
    // * UP -> DOWN = important
    // UP -> UP = not important
    // PENDING -> PENDING = not important
    // * PENDING -> DOWN = important
    // PENDING -> UP = not important
    // DOWN -> PENDING = this case not exists
    // DOWN -> DOWN = not important
    // * DOWN -> UP = important
    // MAINTENANCE -> MAINTENANCE = not important
    // * MAINTENANCE -> UP = important
    // * MAINTENANCE -> DOWN = important
    // * DOWN -> MAINTENANCE = important
    // * UP -> MAINTENANCE = important
    return (
      isFirstBeat ||
      (previousBeatStatus === DOWN && currentBeatStatus === MAINTENANCE) ||
      (previousBeatStatus === UP && currentBeatStatus === MAINTENANCE) ||
      (previousBeatStatus === MAINTENANCE && currentBeatStatus === DOWN) ||
      (previousBeatStatus === MAINTENANCE && currentBeatStatus === UP) ||
      (previousBeatStatus === UP && currentBeatStatus === DOWN) ||
      (previousBeatStatus === DOWN && currentBeatStatus === UP) ||
      (previousBeatStatus === PENDING && currentBeatStatus === DOWN)
    );
  }

  /**
   * Is this beat important for notifications?
   * @param {boolean} isFirstBeat Is this the first beat of this monitor?
   * @param {const} previousBeatStatus Status of the previous beat
   * @param {const} currentBeatStatus Status of the current beat
   * @returns {boolean} True if is an important beat else false
   */
  static isImportantForNotification(
    isFirstBeat,
    previousBeatStatus,
    currentBeatStatus
  ) {
    // * ? -> ANY STATUS = important [isFirstBeat]
    // UP -> PENDING = not important
    // * UP -> DOWN = important
    // UP -> UP = not important
    // PENDING -> PENDING = not important
    // * PENDING -> DOWN = important
    // PENDING -> UP = not important
    // DOWN -> PENDING = this case not exists
    // DOWN -> DOWN = not important
    // * DOWN -> UP = important
    // MAINTENANCE -> MAINTENANCE = not important
    // MAINTENANCE -> UP = not important
    // * MAINTENANCE -> DOWN = important
    // DOWN -> MAINTENANCE = not important
    // UP -> MAINTENANCE = not important
    return (
      isFirstBeat ||
      (previousBeatStatus === MAINTENANCE && currentBeatStatus === DOWN) ||
      (previousBeatStatus === UP && currentBeatStatus === DOWN) ||
      (previousBeatStatus === DOWN && currentBeatStatus === UP) ||
      (previousBeatStatus === PENDING && currentBeatStatus === DOWN)
    );
  }

  /**
   * Send a notification about a monitor
   * @param {boolean} isFirstBeat Is this beat the first of this monitor?
   * @param {Monitor} monitor The monitor to send a notificaton about
   * @param {Bean} bean Status information about monitor
   */
  // static async sendNotification(isFirstBeat, monitor, bean) {
  //     if (!isFirstBeat || newBeat.status === DOWN) {
  //         const notificationList = await Monitor.getNotificationList(monitor);

  //         let text;
  //         if (newBeat.status === UP) {
  //             text = "✅ Up";
  //         } else {
  //             text = "🔴 Down";
  //         }

  //         let msg = `[${monitor.name}] [${text}] ${newBeat.msg}`;

  //         for (let notification of notificationList) {
  //             try {
  //                 // Prevent if the msg is undefined, notifications such as Discord cannot send out.
  //                 const heartbeatJSON = newBeat.toJSON();
  //                 if (!heartbeatJSON["msg"]) {
  //                     heartbeatJSON["msg"] = "N/A";
  //                 }

  //                 await Notification.send(JSON.parse(notification.config), msg, await monitor.toJSON(false), heartbeatJSON);
  //             } catch (e) {
  //                 log.error("monitor", "Cannot send notification to " + notification.name);
  //                 log.error("monitor", e);
  //             }
  //         }
  //     }
  // }

  /**
   * Get list of notification providers for a given monitor
   * @param {Monitor} monitor Monitor to get notification providers for
   * @returns {Promise<LooseObject<any>[]>}
   */
  // static async getNotificationList(monitor) {
  //     let notificationList = await R.getAll("SELECT notification.* FROM notification, monitor_notification WHERE monitor_id = ? AND monitor_notification.notification_id = notification.id ", [
  //         monitor.id,
  //     ]);
  //     return notificationList;
  // }

  /**
   * Send notification about a certificate
   * @param {Object} tlsInfoObject Information about certificate
   */
  // async sendCertNotification(tlsInfoObject) {
  //     if (tlsInfoObject && tlsInfoObject.certInfo && tlsInfoObject.certInfo.daysRemaining) {
  //         const notificationList = await Monitor.getNotificationList(this);

  //         let notifyDays = await setting("tlsExpiryNotifyDays");
  //         if (notifyDays == null || !Array.isArray(notifyDays)) {
  //             // Reset Default
  //             setSetting("tlsExpiryNotifyDays", [ 7, 14, 21 ], "general");
  //             notifyDays = [ 7, 14, 21 ];
  //         }

  //         if (notifyDays != null && Array.isArray(notifyDays)) {
  //             for (const day of notifyDays) {
  //                 log.debug("monitor", "call sendCertNotificationByTargetDays", day);
  //                 await this.sendCertNotificationByTargetDays(tlsInfoObject.certInfo.daysRemaining, day, notificationList);
  //             }
  //         }
  //     }
  // }

  /**
   * Send a certificate notification when certificate expires in less
   * than target days
   * @param {number} daysRemaining Number of days remaining on certifcate
   * @param {number} targetDays Number of days to alert after
   * @param {LooseObject<any>[]} notificationList List of notification providers
   * @returns {Promise<void>}
   */
  // async sendCertNotificationByTargetDays(daysRemaining, targetDays, notificationList) {

  //     if (daysRemaining > targetDays) {
  //         log.debug("monitor", `No need to send cert notification. ${daysRemaining} > ${targetDays}`);
  //         return;
  //     }

  //     if (notificationList.length > 0) {

  //         let row = await R.getRow("SELECT * FROM notification_sent_history WHERE type = ? AND monitor_id = ? AND days = ?", [
  //             "certificate",
  //             this.id,
  //             targetDays,
  //         ]);

  //         // Sent already, no need to send again
  //         if (row) {
  //             log.debug("monitor", "Sent already, no need to send again");
  //             return;
  //         }

  //         let sent = false;
  //         log.debug("monitor", "Send certificate notification");

  //         for (let notification of notificationList) {
  //             try {
  //                 log.debug("monitor", "Sending to " + notification.name);
  //                 await Notification.send(JSON.parse(notification.config), `[${this.name}][${this.url}] Certificate will be expired in ${daysRemaining} days`);
  //                 sent = true;
  //             } catch (e) {
  //                 log.error("monitor", "Cannot send cert notification to " + notification.name);
  //                 log.error("monitor", e);
  //             }
  //         }

  //         if (sent) {
  //             await R.exec("INSERT INTO notification_sent_history (type, monitor_id, days) VALUES(?, ?, ?)", [
  //                 "certificate",
  //                 this.id,
  //                 targetDays,
  //             ]);
  //         }
  //     } else {
  //         log.debug("monitor", "No notification, no need to send cert notification");
  //     }
  // }

  validate() {
    if (this.monitor.interval > MAX_INTERVAL_SECOND) {
      throw new Error(
        `Interval cannot be more than ${MAX_INTERVAL_SECOND} seconds`
      );
    }
    if (this.monitor.interval < MIN_INTERVAL_SECOND) {
      throw new Error(
        `Interval cannot be less than ${MIN_INTERVAL_SECOND} seconds`
      );
    }
  }
}
