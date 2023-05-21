// Common Util for frontend and backend
//
// DOT NOT MODIFY util.js!
// Need to run "tsc" to compile if there are any changes.
//
// Backend uses the compiled file util.js
// Frontend uses util.ts

import * as timezone from "dayjs/plugin/timezone";
import * as utc from "dayjs/plugin/utc";

export const isDev = process.env.NODE_ENV === "development";
export const appName = "Uptime Kuma";


import {randomBytes} from 'crypto'
import dayjs from "dayjs";
import { UP, DOWN } from "./status";

/** Flip the status of s */
export function flipStatus(s: number) {
    if (s === UP) {
        return DOWN;
    }

    if (s === DOWN) {
        return UP;
    }

    return s;
}

/**
 * Delays for specified number of seconds
 * @param ms Number of milliseconds to sleep for
 */
export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * PHP's ucfirst
 * @param str
 */
export function ucfirst(str: string) {
    if (!str) {
        return str;
    }

    const firstLetter = str.substr(0, 1);
    return firstLetter.toUpperCase() + str.substr(1);
}

/**
 * @deprecated Use log.debug
 * @since https://github.com/louislam/uptime-kuma/pull/910
 * @param msg
 */
export function debug(msg: any) {
    log.log("", msg, "debug");
}

class Logger {

    /**
     * UPTIME_KUMA_HIDE_LOG=debug_monitor,info_monitor
     *
     * Example:
     *  [
     *     "debug_monitor",          // Hide all logs that level is debug and the module is monitor
     *     "info_monitor",
     *  ]
     */
    hideLog : any = {
        info: [],
        warn: [],
        error: [],
        debug: [],
    };

    constructor() {
        if (typeof process !== "undefined" && process.env.UPTIME_KUMA_HIDE_LOG) {
            let list = process.env.UPTIME_KUMA_HIDE_LOG.split(",").map(v => v.toLowerCase());

            for (let pair of list) {
                // split first "_" only
                let values = pair.split(/_(.*)/s);

                if (values.length >= 2) {
                    this.hideLog[values[0]].push(values[1]);
                }
            }

            this.debug("server", "UPTIME_KUMA_HIDE_LOG is set");
            this.debug("server", this.hideLog);
        }
    }

    /**
     * Write a message to the log
     * @param module The module the log comes from
     * @param msg Message to write
     * @param level Log level. One of INFO, WARN, ERROR, DEBUG or can be customized.
     */
    log(module: string, msg: any, level: string) {
        if (this.hideLog[level] && this.hideLog[level].includes(module.toLowerCase())) {
            return;
        }

        module = module.toUpperCase();
        level = level.toUpperCase();

        let now;
        if (dayjs.tz) {
            now = dayjs.tz(new Date()).format();
        } else {
            now = dayjs().format();
        }
        const formattedMessage = (typeof msg === "string") ? `${now} [${module}] ${level}: ${msg}` : msg;

        if (level === "INFO") {
            console.info(formattedMessage);
        } else if (level === "WARN") {
            console.warn(formattedMessage);
        } else if (level === "ERROR") {
            console.error(formattedMessage);
        } else if (level === "DEBUG") {
            if (isDev) {
                console.log(formattedMessage);
            }
        } else {
            console.log(formattedMessage);
        }
    }

    /**
     * Log an INFO message
     * @param module Module log comes from
     * @param msg Message to write
     */
    info(module: string, msg: any) {
        this.log(module, msg, "info");
    }

    /**
     * Log a WARN message
     * @param module Module log comes from
     * @param msg Message to write
     */
    warn(module: string, msg: any) {
        this.log(module, msg, "warn");
    }

    /**
     * Log an ERROR message
     * @param module Module log comes from
     * @param msg Message to write
     */
    error(module: string, msg: any) {
       this.log(module, msg, "error");
    }

    /**
     * Log a DEBUG message
     * @param module Module log comes from
     * @param msg Message to write
     */
    debug(module: string, msg: any) {
       this.log(module, msg, "debug");
    }

    /**
     * Log an exeption as an ERROR
     * @param module Module log comes from
     * @param exception The exeption to include
     * @param msg The message to write
     */
    exception(module: string, exception: any, msg: any) {
        let finalMessage = exception

        if (msg) {
            finalMessage = `${msg}: ${exception}`
        }

        this.log(module, finalMessage , "error");
    }
}

export const log = new Logger();

declare global { interface String { replaceAll(str: string, newStr: string): string; } }

/**
 * String.prototype.replaceAll() polyfill
 * https://gomakethings.com/how-to-replace-a-section-of-a-string-with-another-one-with-vanilla-js/
 * @author Chris Ferdinandi
 * @license MIT
 */
export function polyfill() {
    if (!String.prototype.replaceAll) {
        String.prototype.replaceAll = function (str: string, newStr: string) {
            // If a regex pattern
            if (Object.prototype.toString.call(str).toLowerCase() === "[object regexp]") {
                return this.replace(str, newStr);
            }

            // If a string
            return this.replace(new RegExp(str, "g"), newStr);
        };
    }
}

export class TimeLogger {
    startTime: number;

    constructor() {
        this.startTime = dayjs().valueOf();
    }
    /**
     * Output time since start of monitor
     * @param name Name of monitor
     */
    print(name: string) {
        if (isDev && process.env.TIMELOGGER === "1") {
            console.log(name + ": " + (dayjs().valueOf() - this.startTime) + "ms")
        }
    }
}

