import { AppDataSource } from "../data-source";
import { Monitor } from "../entity/Monitor";
import { MonitorService } from "../services/MonitorService";
import { sleep } from "./datetime";
import {chunkArray } from './common'


const startSectionMonitor = async (monitors: MonitorService[]) => {
    for (let monitor of monitors) {
        monitor.start();
    }
}

export async function startMonitors() {
    let monitorRecords = await AppDataSource.manager.findBy(Monitor, {active: true})

    let monitorTimeout = parseInt(process.env.MONITOR_TIMEOUT)
    let requestPerSection = parseInt(process.env.MONITOR_PER_SECTION)

    let sectionStartDuration = monitorTimeout + parseInt(process.env.SECTION_TIME_SLEEP)
    let numberOfSections = Math.floor((60_000 / sectionStartDuration))

    let maxSitesMonitor = numberOfSections * requestPerSection

    let monitors = monitorRecords.map(monitor => {
        return new MonitorService(monitor)
    }).slice(0, maxSitesMonitor)

    let monitorSections = chunkArray(monitors, maxSitesMonitor / 10)

    console.log(monitorSections.length, monitorTimeout + 1000)

    monitorSections.forEach(section => console.log(section.length))

    for (let section of monitorSections) {
        startSectionMonitor(section)
        // Give some delays, so all monitors won't make request at the same moment when just start the server.
        await sleep(monitorTimeout + 1000);
    }

    return monitorSections
}