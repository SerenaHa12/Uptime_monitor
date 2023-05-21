import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config()

import { AppDataSource } from "./data-source"
import { MonitorService } from './services/MonitorService'
import { sleep } from './utils/datetime'
import { log } from './utils/Logger'
import { startMonitors } from './utils/monitor'

let monitors: MonitorService[] = []

AppDataSource.initialize().then(async (connection) => {

    /** Resume active monitors */

    startMonitors()

}).catch(error => console.log(error))

process.on('SIGINT', () => {
    console.info('SIGINT signal received.');
    console.log('Closing http server.');
    shutdownFunction("SIGINT")
});

process.on('SIGTERM', () => {
    console.info('SIGTERM signal received.');
    console.log('Closing http server.');
    shutdownFunction("SIGTERM")
});

async function shutdownFunction(signal) {
    log.info("server", "Shutdown requested");
    log.info("server", "Called signal: " + signal);

    log.info("server", "Stopping all monitors");
    monitors.forEach(monitor => {
        monitor.stop()
    })
    await sleep(20000);

    finalFunction()
}

/** Final function called before application exits */
function finalFunction() {
    log.info("server", "Graceful shutdown successful!");
}