import dayjs from "dayjs";
import * as timezone from "dayjs/plugin/timezone";
import * as utc from "dayjs/plugin/utc";

export const SQL_DATE_FORMAT = "YYYY-MM-DD";
export const SQL_DATETIME_FORMAT = "YYYY-MM-DD HH:mm:ss";
export const SQL_DATETIME_FORMAT_WITHOUT_SECOND = "YYYY-MM-DD HH:mm";

export const MAX_INTERVAL_SECOND = 2073600; // 24 days
export const MIN_INTERVAL_SECOND = 20; // 20 seconds

/**
 * Parse to Time Object that used in VueDatePicker
 * @param {string} time E.g. 12:00
 * @returns object
 */
export function parseTimeObject(time: string) {
    if (!time) {
        return {
            hours: 0,
            minutes: 0,
        };
    }

    let array = time.split(":");

    if (array.length < 2) {
        throw new Error("parseVueDatePickerTimeFormat: Invalid Time");
    }

    let obj =  {
        hours: parseInt(array[0]),
        minutes: parseInt(array[1]),
        seconds: 0,
    }
    if (array.length >= 3) {
        obj.seconds = parseInt(array[2]);
    }
    return obj;
}

/**
 * @returns string e.g. 12:00
 */
export function parseTimeFromTimeObject(obj : any) {
    if (!obj) {
        return obj;
    }

    let result = "";

    result += obj.hours.toString().padStart(2, "0") + ":" + obj.minutes.toString().padStart(2, "0")

    if (obj.seconds) {
        result += ":" +  obj.seconds.toString().padStart(2, "0")
    }

    return result;
}


export function isoToUTCDateTime(input : string) {
    return dayjs(input).utc().format(SQL_DATETIME_FORMAT);
}

/**
 * @param input
 */
export function utcToISODateTime(input : string) {
    return dayjs.utc(input).toISOString();
}

/**
 * For SQL_DATETIME_FORMAT
 */
export function utcToLocal(input : string, format = SQL_DATETIME_FORMAT) {
    return dayjs.utc(input).local().format(format);
}

export function localToUTC(input : string, format = SQL_DATETIME_FORMAT) {
    return dayjs(input).utc().format(format);
}

/**
 * Delays for specified number of seconds
 * @param ms Number of milliseconds to sleep for
 */
export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}