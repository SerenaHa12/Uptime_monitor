import * as https from 'https'
import * as http from 'http'
const CacheableLookup = require('cacheable-lookup');
import { log } from "../utils/Logger";
import { AppDataSource } from '../data-source';
import { Setting } from '../entity/Setting';

export class CacheableDnsHttpAgent {

    static cacheable = new CacheableLookup();

    static httpAgentList = {};
    static httpsAgentList = {};

    static enable = false;

    static async update() {
        log.debug("CacheableDnsHttpAgent", "update");
        let instance = await AppDataSource.manager.findOneBy(Setting, {key: "dnsCache"});
        let isEnable = JSON.parse(instance.value)
        if (isEnable !== this.enable) {
            log.debug("CacheableDnsHttpAgent", "value changed");

            if (isEnable) {
                log.debug("CacheableDnsHttpAgent", "enable");
                this.cacheable.install(http.globalAgent);
                this.cacheable.install(https.globalAgent);
            } else {
                log.debug("CacheableDnsHttpAgent", "disable");
                this.cacheable.uninstall(http.globalAgent);
                this.cacheable.uninstall(https.globalAgent);
            }
        }

        this.enable = isEnable;
    }

    static install(agent) {
        this.cacheable.install(agent);
    }

    static getHttpsAgent(agentOptions) {
        if (!this.enable) {
            return new https.Agent(agentOptions);
        }

        let key = JSON.stringify(agentOptions);
        if (!(key in this.httpsAgentList)) {
            this.httpsAgentList[key] = new https.Agent(agentOptions);
            this.cacheable.install(this.httpsAgentList[key]);
        }
        return this.httpsAgentList[key];
    }

    static getHttpAgent(agentOptions) {
        if (!this.enable) {
            return new http.Agent(agentOptions);
        }

        let key = JSON.stringify(agentOptions);
        if (!(key in this.httpAgentList)) {
            this.httpAgentList[key] = new http.Agent(agentOptions);
            this.cacheable.install(this.httpAgentList[key]);
        }
        return this.httpAgentList[key];
    }

}
