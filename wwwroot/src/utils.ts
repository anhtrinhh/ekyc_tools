import { Logger } from "./core";

export class Utils {

    public static getFileExtensions(contentType: string) {
        contentType = contentType.toLowerCase();
        if (contentType.startsWith('image/png')) return '.png';
        else if (contentType.startsWith('image/webp')) return '.webp';
        else if (contentType.startsWith('image/jpeg')) return '.jpg';
        else if (contentType.startsWith('video/webm')) return '.webm';
        else if (contentType.startsWith('video/mp4')) return '.mp4';
        else if (contentType.startsWith('video/quicktime')) return '.mov';
        else if (contentType.startsWith('video/x-matroska')) return '.mkv';
        else if (contentType.startsWith('video/mpeg') || contentType.startsWith('video/mp1s')
            || contentType.startsWith('video/mp2p')) return '.mpg';
        else return '.webm';

    }

    public static delay(delayInMS: number) {
        return new Promise((resolve) => {
            setTimeout(resolve, delayInMS);
        });
    }

    public static newGuid() {
        let guid = 'xxxxxxxx-xxxx-4xxx-yxxx-'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        let dateNow = new Date;
        guid += `${dateNow.getUTCFullYear()}`;
        if (dateNow.getUTCMonth() < 9) guid += `0${dateNow.getUTCMonth() + 1}`;
        else guid += (dateNow.getUTCMonth() + 1);
        if (dateNow.getUTCDate() < 10) guid += `0${dateNow.getUTCDate()}`;
        else guid += `${dateNow.getUTCDate()}`;
        if (dateNow.getUTCHours() < 10) guid += `0${dateNow.getUTCHours()}`;
        else guid += dateNow.getUTCHours();
        if (dateNow.getUTCMinutes() < 10) guid += `0${dateNow.getUTCMinutes()}`;
        else guid += dateNow.getUTCMinutes();
        if (dateNow.getUTCSeconds() < 10) guid += `0${dateNow.getUTCSeconds()}`;
        else guid += dateNow.getUTCSeconds();
        return guid;
    }

    public static clearMediaStream(mediaStream: MediaStream | null) {
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => {
                mediaStream?.removeTrack(track);
                track.stop();
            });
        }
    }

    public static adjustRatio(arr: any[]) {
        const [x, y, desiredRatio] = arr;
        const currentRatio = x / y;
        if (currentRatio === desiredRatio) return [x, y];
        const newX = Math.min(x, Math.floor(y * desiredRatio));
        const newY = Math.round(newX / desiredRatio);
        return [newX, newY];
    }

    public static adjustExactRatio(arr: any[]) {
        const [x, y, desiredRatio] = arr;
        const currentRatio = x / y;
        if (currentRatio === desiredRatio) return [x, y];
        const newX = Math.min(x, y * desiredRatio);
        const newY = newX / desiredRatio;
        return [newX, newY];
    }

    public static async requestFullscreen() {
        try { if (document.fullscreenEnabled) await document.documentElement.requestFullscreen() } catch (err) { console.warn(err) }
    }

    public static async exitFullscreen() {
        try { if (document.fullscreenElement != null) await document.exitFullscreen() } catch (err) { console.warn(err) }
    }

    public static isNullOrUndefined(obj?: any) {
        return (typeof obj === "undefined") || obj === null;
    }

    public static clip(value: number, minValue: number, maxValue: number) {
        if (value > maxValue) return maxValue;
        if (value < minValue) return minValue;
        return value;
    }

    public static instanceOfGetVideoConfig(object: any) {
        return 'recordMs' in object;
    }

    public static queryByClassName(className: string, parent: HTMLElement = document.body) {
        return parent.querySelector(`.${className}`);
    }

    public static closestByClassName(className: string, child: HTMLElement) {
        return child.closest(`.${className}`);
    }

    public static queryAllByClassName(className: string, parent: HTMLElement = document.body) {
        return parent.querySelectorAll(`.${className}`);
    }

    public static isMediaStreamConstraintsValid(
        videoConstraints: MediaTrackConstraints,
        logger: Logger): boolean {
        if (!videoConstraints) {
            logger.logError(
                "Empty videoConstraints", /* experimental= */ true);
            return false;
        }
        if (typeof videoConstraints !== "object") {
            const typeofVideoConstraints = typeof videoConstraints;
            logger.logError(
                "videoConstraints should be of type object, the "
                + `object passed is of type ${typeofVideoConstraints}.`,
                /* experimental= */ true);
            return false;
        }
        const bannedKeys = [
            "autoGainControl",
            "channelCount",
            "echoCancellation",
            "latency",
            "noiseSuppression",
            "sampleRate",
            "sampleSize",
            "volume"
        ];
        const bannedkeysSet = new Set(bannedKeys);
        const keysInVideoConstraints = Object.keys(videoConstraints);
        for (const key of keysInVideoConstraints) {
            if (bannedkeysSet.has(key)) {
                logger.logError(
                    `${key} is not supported videoConstaints.`,
                    /* experimental= */ true);
                return false;
            }
        }

        return true;
    }

    public static createVideoConstraints(
        cameraIdOrConfig: string | MediaTrackConstraints)
        : MediaTrackConstraints | undefined {
        if (typeof cameraIdOrConfig == "string") {
            // If it's a string it should be camera device Id.
            return { deviceId: { exact: cameraIdOrConfig } };
        } else if (typeof cameraIdOrConfig == "object") {
            const facingModeKey = "facingMode";
            const deviceIdKey = "deviceId";
            const allowedFacingModeValues
                = { "user": true, "environment": true };
            const exactKey = "exact";
            const isValidFacingModeValue = (value: string) => {
                if (value in allowedFacingModeValues) {
                    // Valid config
                    return true;
                } else {
                    // Invalid config
                    throw "config has invalid 'facingMode' value = "
                    + `'${value}'`;
                }
            };

            const keys = Object.keys(cameraIdOrConfig);
            if (keys.length !== 1) {
                throw "'cameraIdOrConfig' object should have exactly 1 key,"
                + ` if passed as an object, found ${keys.length} keys`;
            }

            const key: string = Object.keys(cameraIdOrConfig)[0];
            if (key !== facingModeKey && key !== deviceIdKey) {
                throw `Only '${facingModeKey}' and '${deviceIdKey}' `
                + " are supported for 'cameraIdOrConfig'";
            }

            if (key === facingModeKey) {
                /**
                 * Supported scenarios:
                 * - { facingMode: "user" }
                 * - { facingMode: "environment" }
                 * - { facingMode: { exact: "environment" } }
                 * - { facingMode: { exact: "user" } }
                 */
                const facingMode: any = cameraIdOrConfig.facingMode;
                if (typeof facingMode == "string") {
                    if (isValidFacingModeValue(facingMode)) {
                        return { facingMode: facingMode };
                    }
                } else if (typeof facingMode == "object") {
                    if (exactKey in facingMode) {
                        if (isValidFacingModeValue(facingMode[`${exactKey}`])) {
                            return {
                                facingMode: {
                                    exact: facingMode[`${exactKey}`]
                                }
                            };
                        }
                    } else {
                        throw "'facingMode' should be string or object with"
                        + ` ${exactKey} as key.`;
                    }
                } else {
                    const type = (typeof facingMode);
                    throw `Invalid type of 'facingMode' = ${type}`;
                }
            } else {
                /**
                 * key == deviceIdKey; Supported scenarios:
                 * - { deviceId: { exact: "a76afe74e95e3.....38627b3bde" }
                 * - { deviceId: "a76afe74e95e3....065c9cd89438627b3bde" }
                 */
                const deviceId: any = cameraIdOrConfig.deviceId;
                if (typeof deviceId == "string") {
                    return { deviceId: deviceId };
                } else if (typeof deviceId == "object") {
                    if (exactKey in deviceId) {
                        return {
                            deviceId: { exact: deviceId[`${exactKey}`] }
                        };
                    } else {
                        throw "'deviceId' should be string or object with"
                        + ` ${exactKey} as key.`;
                    }
                } else {
                    const type = (typeof deviceId);
                    throw `Invalid type of 'deviceId' = ${type}`;
                }
            }
        }


        // invalid type
        const type = (typeof cameraIdOrConfig);
        throw `Invalid type of 'cameraIdOrConfig' = ${type}`;
    }
}