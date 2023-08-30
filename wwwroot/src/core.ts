import { Utils } from './utils';

export interface BaseConfig {
    video?: boolean | MediaTrackConstraints;
    shadingRatio?: number;
    enableSwitchCamera?: boolean;
    enableFilePicker?: boolean;
    enableFlash?: boolean;
    zoom?: number;
    recordMs?: number;
    videoBitsPerSecond?: number;
    canvasMaxWidth?: number;
    canvasMinWidth?: number;
    onStart?: OnStartCallback;
    onStop?: OnStopCallback;
    onError?: OnErrorCallback;
    onOpen?: OnOpen;
}

export type OnOpen = () => void;
export type OnStartCallback = () => void;
export type OnStopCallback = (result?: BaseResult | null) => void;
export type OnErrorCallback = (reason?: any) => void;


export interface AlertConfig {
    content?: string;
    classList?: string[];
    title?: string;
    enableClose?: boolean;
    displayTimeout?: number;
    parentSelector?: string;
}

export interface BaseResult {
    blob: Blob | null;
    contentName: string;
    contentType: string;
    contentLength: number;
}

export interface VideoResult extends BaseResult {
    poster: BaseResult | null
}

export class ResultFactory {
    static createImageResult(blob: Blob | null): BaseResult | null {
        if (blob) {
            return {
                blob: blob,
                contentName: `${Utils.newGuid()}.png`,
                contentLength: blob.size,
                contentType: 'image/png'
            };
        }
        return null;
    }

    static createVideoResult(videoBlob: Blob | null, posterBlob: Blob | null): VideoResult | null {
        if (videoBlob) {
            var poster = this.createImageResult(posterBlob);
            return {
                blob: videoBlob,
                contentName: `${Utils.newGuid()}.webm`,
                contentLength: videoBlob.size,
                contentType: 'video/webm',
                poster
            };
        }
        return null;
    }
}

export interface Logger {
    log(message: string): void;
    warn(message: string): void;
    logError(message: string, isExperimental?: boolean): void;
    logErrors(errors: Array<any>): void;
}

export class BaseLoggger implements Logger {

    private verbose: boolean;

    public constructor(verbose: boolean) {
        this.verbose = verbose;
    }

    public log(message: string): void {
        if (this.verbose) {
            console.log(message);
        }
    }

    public warn(message: string): void {
        if (this.verbose) {
            console.warn(message);
        }
    }

    public logError(message: string, isExperimental?: boolean)
        : void {
        if (this.verbose || isExperimental === true) {
            console.error(message);
        }
    }

    public logErrors(errors: Array<any>): void {
        if (errors.length === 0) {
            throw "Logger#logError called without arguments";
        }
        if (this.verbose) {
            console.error(errors);
        }
    }
}