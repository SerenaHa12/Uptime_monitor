import {HttpProxyAgent} from "http-proxy-agent";
import {HttpsProxyAgent} from "https-proxy-agent";
import {SocksProxyAgent} from "socks-proxy-agent";
import { AppDataSource } from "../data-source";
import { Monitor } from "../entity/Monitor";
import { Proxy } from "../entity/Proxy";
import { debug, log } from "../utils/Logger";
// import { UptimeKumaServer } from "./uptime-kuma-server";

export class ProxyService {

    static SUPPORTED_PROXY_PROTOCOLS = [ "http", "https", "socks", "socks5", "socks5h", "socks4" ];

    /**
     * Saves and updates given proxy entity
     *
     * @param proxy
     * @param proxyID
     * @param userID
     * @return {Promise<Bean>}
     */
    static async save(proxy, proxyID, userID) {
        let bean;

        if (proxyID) {
            bean = await AppDataSource.manager.findOneBy(Proxy, {id: proxyID, userId: userID});

            if (!bean) {
                throw new Error("proxy not found");
            }

        } else {
            bean = new Proxy();
        }

        // Make sure given proxy protocol is supported
        if (!this.SUPPORTED_PROXY_PROTOCOLS.includes(proxy.protocol)) {
            throw new Error(`
                Unsupported proxy protocol "${proxy.protocol}.
                Supported protocols are ${this.SUPPORTED_PROXY_PROTOCOLS.join(", ")}."`
            );
        }

        // When proxy is default update deactivate old default proxy
        if (proxy.default) {
            await AppDataSource.manager.update(Proxy, {default: true}, {default: false})
        }

        bean.user_id = userID;
        bean.protocol = proxy.protocol;
        bean.host = proxy.host;
        bean.port = proxy.port;
        bean.auth = proxy.auth;
        bean.username = proxy.username;
        bean.password = proxy.password;
        bean.active = proxy.active || true;
        bean.default = proxy.default || false;

        await AppDataSource.manager.save(bean);

        if (proxy.applyExisting) {
            await applyProxyEveryMonitor(bean.id, userID);
        }

        return bean;
    }

    /**
     * Deletes proxy with given id and removes it from monitors
     *
     * @param proxyID
     * @param userID
     * @return {Promise<void>}
     */
    static async delete(proxyID, userID) {
        const bean = await AppDataSource.manager.findOneBy(Proxy, {id: proxyID, userId: userID});

        if (!bean) {
            throw new Error("proxy not found");
        }

        // Delete removed proxy from monitors if exists
        await AppDataSource.manager.update(Monitor, {proxyId: proxyID}, {proxyId: null})

        // Delete proxy from list
        await AppDataSource.manager.delete(Proxy, {id: proxyID, userId: userID})
    }

    /**
     * Create HTTP and HTTPS agents related with given proxy bean object
     *
     * @param proxy proxy bean object
     * @param options http and https agent options
     * @return {{httpAgent: Agent, httpsAgent: Agent}}
     */
    static createAgents(proxy, options) {
        const { httpAgentOptions, httpsAgentOptions } = options || {};
        let agent;
        let httpAgent;
        let httpsAgent;

        const proxyOptions: any = {
            protocol: proxy.protocol,
            host: proxy.host,
            port: proxy.port,
        };

        if (proxy.auth) {
            proxyOptions.auth = `${proxy.username}:${proxy.password}`;
        }

        log.info("Proxy", `Proxy Options: ${JSON.stringify(proxyOptions)}`);
        log.info("Proxy", `HTTP Agent Options: ${JSON.stringify(httpAgentOptions)}`);
        log.info("Proxy", `HTTPS Agent Options: ${JSON.stringify(httpsAgentOptions)}`);

        switch (proxy.protocol) {
            case "http":
            case "https":
                httpAgent = new HttpProxyAgent({
                    ...httpAgentOptions || {},
                    ...proxyOptions
                });

                httpsAgent = new HttpsProxyAgent({
                    ...httpsAgentOptions || {},
                    ...proxyOptions,
                });
                break;
            case "socks":
            case "socks5":
            case "socks5h":
            case "socks4":
                agent = new SocksProxyAgent({
                    ...httpAgentOptions,
                    ...httpsAgentOptions,
                    ...proxyOptions,
                });

                httpAgent = agent;
                httpsAgent = agent;
                break;

            default: throw new Error(`Unsupported proxy protocol provided. ${proxy.protocol}`);
        }

        return {
            httpAgent,
            httpsAgent
        };
    }

    /**
     * Reload proxy settings for current monitors
     * @returns {Promise<void>}
     */
    // static async reloadProxy() {
    //     const server = UptimeKumaServer.getInstance();

    //     let updatedList = await R.getAssoc("SELECT id, proxy_id FROM monitor");

    //     for (let monitorID in server.monitorList) {
    //         let monitor = server.monitorList[monitorID];

    //         if (updatedList[monitorID]) {
    //             monitor.proxy_id = updatedList[monitorID].proxy_id;
    //         }
    //     }
    // }
}

/**
 * Applies given proxy id to monitors
 *
 * @param proxyID
 * @param userID
 * @return {Promise<void>}
 */
async function applyProxyEveryMonitor(proxyID, userID) {
    // Find all monitors with id and proxy id
    const monitors = await AppDataSource.manager.findBy(Monitor, {userId: userID});

    // Update proxy id not match with given proxy id
    for (const monitor of monitors) {
        if (monitor.proxyId !== proxyID) {
            await AppDataSource.manager.update(Monitor, {id: monitor.id}, {proxyId: proxyID});
        }
    }
}