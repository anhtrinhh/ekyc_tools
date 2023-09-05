import { OnErrorCallback, OnStartCallback, OnStopCallback, ResultFactory } from "../core";
import { EkycRecordBtnSVG } from '../ekyc-asset';
import { Utils } from "../utils";
import { UI, UILoadHandler } from "./base";
import { UIElementClasses } from "./constants";

export interface RecorderConfig {
    recordMs?: number;
    videoBitsPerSecond?: number;
}

// class RecordProgressUI {
//     private static delayMilliseconds = 100;
//     private readonly progressMs: number;
//     private readonly progressElement: HTMLDivElement;
//     private interval: any;
//     private durationMilliseconds: number = 0;
//     private constructor(progressMs: number) {
//         this.progressMs = progressMs;
//         this.progressElement = document.createElement('div');
//     }
//     private render(parent: HTMLElement) {
//         this.progressElement.className = UIElementClasses.CIRCULAR_PROGRESS;
//         this.progressElement.innerHTML = EkycCircularSVG;
//         const span = document.createElement('span');
//         this.progressElement.appendChild(span);
//         this.setPercent(0);
//         parent.appendChild(this.progressElement);
//     }

//     private setPercent(percent: number) {
//         this.progressElement.setAttribute('style', '--percent: ' + percent);
//         const span = this.progressElement.querySelector('span');
//         if (span) span.innerText = `${percent}%`;
//     }

//     public start() {
//         this.reset();
//         return new Promise((resolve) => {
//             this.interval = setInterval(() => {
//                 this.durationMilliseconds += 100;
//                 const percent = Math.floor((this.durationMilliseconds / this.progressMs) * 100);
//                 this.setPercent(percent);
//                 if (this.durationMilliseconds >= this.progressMs) resolve(null);
//             }, RecordProgressUI.delayMilliseconds);
//         })
//     }

//     public reset() {
//         this.durationMilliseconds = 0;
//         this.setPercent(0);
//         if (this.interval) clearInterval(this.interval);
//     }

//     public static create(parent: HTMLElement, progressMs: number): RecordProgressUI {
//         const ui = new RecordProgressUI(progressMs);
//         ui.render(parent);
//         return ui;
//     }
// }

class RecordProgressUI {
    private static delayMilliseconds = 500;
    private readonly progressMs: number;
    private readonly parentElement: HTMLElement;
    private interval: any;
    private durationMilliseconds: number = 0;
    private constructor(parent: HTMLElement, progressMs: number) {
        this.progressMs = progressMs;
        this.parentElement = parent;
    }

    private setPercent(percent: number) {
        const element = Utils.queryByClassName(UIElementClasses.CIRCULAR_PROGRESS_DIV, this.parentElement) as HTMLElement;
        if (element) {
            Utils.queryAllByClassName(UIElementClasses.CIRCULAR_PROGRESS_POINT_DIV, element).forEach((elm, ix) => {
                if (ix < percent) elm.classList.add('ekyct-circle-region-point--marked');
                else elm.classList.remove('ekyct-circle-region-point--marked');
            });
        }
    }

    public start() {
        this.reset();
        return new Promise((resolve) => {
            this.interval = setInterval(() => {
                this.durationMilliseconds += RecordProgressUI.delayMilliseconds;
                const percent = Math.floor((this.durationMilliseconds / this.progressMs) * 100);
                this.setPercent(percent);
                if (this.durationMilliseconds >= this.progressMs) resolve(null);
            }, RecordProgressUI.delayMilliseconds);
        })
    }

    public reset() {
        this.durationMilliseconds = 0;
        this.setPercent(0);
        if (this.interval) clearInterval(this.interval);
    }

    public static create(parent: HTMLElement, progressMs: number): RecordProgressUI {
        const ui = new RecordProgressUI(parent, progressMs);
        return ui;
    }
}

export class RecordUI {
    private onStart: OnStartCallback | undefined;
    private onStop: OnStopCallback | undefined;
    private onError: OnErrorCallback | undefined;
    private mediaStream: MediaStream | null = null;
    private recorder: MediaRecorder | null = null;
    private recordProgress: RecordProgressUI | null = null;
    private recording: boolean = false;
    private readonly recordButton: HTMLButtonElement;
    private readonly config: RecorderConfig;
    private constructor(config: RecorderConfig, onStart?: OnStartCallback, onStop?: OnStopCallback, onError?: OnErrorCallback) {
        this.recordButton = document.createElement('button');
        this.config = config;
        this.onStart = onStart;
        this.onStop = onStop;
        this.onError = onError;
    }

    private render(parent: HTMLElement, captureRegion: HTMLElement, loadHandlers: UILoadHandler[]) {
        this.recordButton.className = `ekyct-btn ${UIElementClasses.RECORD_BTN}`;
        this.recordButton.disabled = true;
        this.recordButton.addEventListener('click', evt => {
            evt.preventDefault();
            if (this.mediaStream && !this.recording) {
                this.recording = true;
                this.recordButton.disabled = true;
                if (this.onStart) this.onStart();
                this.recorder = new MediaRecorder(this.mediaStream, {
                    videoBitsPerSecond: this.config.videoBitsPerSecond
                });
                this.recorder.ondataavailable = async event => {
                    try {
                        if (this.onStop) {
                            const blob = event.data;
                            const posterBlob = await UI.getCapture(captureRegion);
                            this.recording = false;
                            this.recordButton.disabled = false;
                            this.onStop(ResultFactory.createVideoResult(blob, posterBlob));
                        }
                    } catch (err) {
                        if (this.onError) this.onError(err);
                    }
                };
                this.recorder.onstart = () => {
                    if (this.recordProgress) this.recordProgress.reset()
                    else {
                        const recordMs = this.config.recordMs && this.config.recordMs % 100 === 0 && this.config.recordMs >= 1000 ? this.config.recordMs : 6000;
                        this.recordProgress = RecordProgressUI.create(captureRegion, recordMs);
                    }
                    this.recordProgress.start().then(() => {
                        this.recorder?.stop();
                    });
                }
                this.recorder.start();
            }
        });
        parent.appendChild(this.recordButton);
        const handleUILoad: UILoadHandler = (loading: boolean) => {
            if (loading) this.recordButton.disabled = true;
            else this.recordButton.disabled = false;
        };
        loadHandlers.push(handleUILoad);
    }

    public show() {
        this.recordButton.innerHTML = EkycRecordBtnSVG;
        this.recordButton.classList.remove(UIElementClasses.DNONE);
    }

    public setStream(stream: MediaStream) {
        this.mediaStream = stream;
        if (this.recorder) {
            this.recorder.stop();
            this.recorder = null;
        }
    }

    public static create(parent: HTMLElement, captureRegion: HTMLElement, loadHandlers: UILoadHandler[], config: RecorderConfig,
        onStart?: OnStartCallback, onStop?: OnStopCallback, onError?: OnErrorCallback): RecordUI {
        const recordUI = new RecordUI(config, onStart, onStop, onError);
        recordUI.render(parent, captureRegion, loadHandlers);
        return recordUI;
    }
}