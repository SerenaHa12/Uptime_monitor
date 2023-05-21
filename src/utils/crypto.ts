import { randomBytes } from "crypto";

/**
 * Returns a random number between min (inclusive) and max (exclusive)
 */
export function getRandomArbitrary(min: number, max: number) {
    return Math.random() * (max - min) + min;
}

/**
 * From: https://stackoverflow.com/questions/1527803/generating-random-whole-numbers-in-javascript-in-a-specific-range
 *
 * Returns a random integer between min (inclusive) and max (inclusive).
 * The value is no lower than min (or the next integer greater than min
 * if min isn't an integer) and no greater than max (or the next integer
 * lower than max if max isn't an integer).
 * Using Math.round() will give you a non-uniform distribution!
 */
export function getRandomInt(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Returns either the NodeJS crypto.randomBytes() function or its
 * browser equivalent implemented via window.crypto.getRandomValues()
 */
let getRandomBytes =randomBytes;

/**
 * Get a random integer suitable for use in cryptography between upper
 * and lower bounds.
 * @param min Minimum value of integer
 * @param max Maximum value of integer
 * @returns Cryptographically suitable random integer
 */
export function getCryptoRandomInt(min: number, max: number):number {

    // synchronous version of: https://github.com/joepie91/node-random-number-csprng

    const range = max - min
    if (range >= Math.pow(2, 32))
        console.log("Warning! Range is too large.")

    let tmpRange = range
    let bitsNeeded = 0
    let bytesNeeded = 0
    let mask = 1

    while (tmpRange > 0) {
        if (bitsNeeded % 8 === 0) bytesNeeded += 1
        bitsNeeded += 1
        mask = mask << 1 | 1
        tmpRange = tmpRange >>> 1
    }

    const randomBytes = getRandomBytes(bytesNeeded)
    let randomValue = 0

    for (let i = 0; i < bytesNeeded; i++) {
	    randomValue |= randomBytes[i] << 8 * i
    }

    randomValue = randomValue & mask;

    if (randomValue <= range) {
        return min + randomValue
    } else {
        return getCryptoRandomInt(min, max)
    }
}

/**
 * Generate a random alphanumeric string of fixed length
 * @param length Length of string to generate
 * @returns string
 */
export function genSecret(length = 64) {
    let secret = "";
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charsLength = chars.length;
    for ( let i = 0; i < length; i++ ) {
        secret += chars.charAt(getCryptoRandomInt(0, charsLength - 1));
    }
    return secret;
}

