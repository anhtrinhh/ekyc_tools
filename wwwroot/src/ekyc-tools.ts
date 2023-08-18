import { EkycCamErrorSVG, EkycCaptureBtnSVG, EkycCloseBtnSVG, EkycFileBtnSVG, EkycRecordBtnSVG, EkycStyleHTML, EkycSwitchCamSVG } from './ekyc-asset';
import { Utils } from './utils';
import { FaceDetector } from '@tensorflow-models/face-detection';

interface BaseEkycToolOptions {
    width?: any;
    height?: any;
    frameRate?: any;
    aspectRatio?: number;
    shadingRatio?: number;
    enableSwitchCamera?: boolean;
    enableAlert?: boolean;
    enableValidation?: boolean;
    facingMode?: ConstrainDOMString;
    mimeType?: string;
    maxCanvasRatio?: number;
}

interface CaptureEkycToolOptions extends BaseEkycToolOptions {
    enableFilePicker?: boolean;
    quality?: number;
}

interface RecordEkycToolOptions extends BaseEkycToolOptions {
    recordMs?: number;
    videoBitsPerSecond?: number;
}

interface EkycToolResult {
    blob: Blob | null;
    contentName: string;
    contentType: string;
    contentLength: number;
}

interface EkycRecordResult extends EkycToolResult {
    posterBlob: Blob | null
}

type OnBlob = (file: EkycToolResult) => void;

interface ScanParameters {
    captureRegionEl: HTMLDivElement;
    videoEl: HTMLVideoElement;
    shadingEl: HTMLDivElement;
    canvasContextWidth: number;
    originWidthRatio: number;
    originHeightRatio: number;
    newWidthRatio: number;
    newHeightRatio: number;
    canvasContext: CanvasRenderingContext2D;
}

interface FaceDetectionParameters {
    captureRegionEl: HTMLDivElement;
    canvasEl: HTMLCanvasElement;
    videoEl: HTMLVideoElement;
    canvasContextWidth: number;
}

export class EkycTools {
    public static VERSION = '1.0.1';
    public static FACE_DETECTION_WARNING_01 = 'Vui lòng đưa camera ra xa một chút!';
    public static FACE_DETECTION_WARNING_02 = 'Vui lòng đưa camera lại gần một chút!';
    public static FACE_DETECTION_WARNING_03 = 'Vui lòng đưa khuôn mặt vào giữa vùng chọn!';
    public static FACE_DETECTION_WARNING_04 = 'Không thể phát hiện khuôn mặt trong vùng chọn!';
    public static FACE_DETECTION_WARNING_05 = 'Có nhiều hơn khuôn mặt trong video!';
    public static CAMERA_NOT_FOUND_WARNING = 'Không tìm thấy hoặc không thể kết nối với máy ảnh trên thiết bị của bạn!';

    private mediaStream: MediaStream | null = null;
    private currentFacingMode: ConstrainDOMString | undefined = 'environment';
    private readonly defaultGetImageOptions: CaptureEkycToolOptions = {
        enableFilePicker: true,
        enableSwitchCamera: true,
        enableAlert: true,
        enableValidation: false,
        shadingRatio: 1.66666667,
        facingMode: 'environment',
        mimeType: 'image/png',
        quality: 0.99
    };
    private readonly defaultGetVideoOptions: RecordEkycToolOptions = {
        enableAlert: true,
        enableSwitchCamera: true,
        enableValidation: true,
        facingMode: 'user',
        shadingRatio: 1,
        recordMs: 6000,
        mimeType: 'video/webm'
    };

    public static async getAvailableCameraDevices() {
        const cameraDevices = await this.getCameraDevices();
        const devicesReady = [];
        for (let i = 0; i < cameraDevices.length; i++) {
            const device = cameraDevices[i];
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { deviceId: device.deviceId },
                    audio: false
                });
                Utils.clearMediaStream(stream);
                devicesReady.push(device);
            } catch (err) {
                console.warn(err);
            }
        }
        return devicesReady;
    }

    public static createFaceDetector() {
        return Utils.createFaceDetector();
    }

    public static async getCameraDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const cameras = devices.filter(function (device) {
                return device.kind === 'videoinput';
            });
            return cameras;
        } catch (err) {
            console.error(err);
            return [];
        }
    }

    public getImage(options: CaptureEkycToolOptions = {}): Promise<EkycToolResult | null> {
        // await Utils.requestFullscreen();
        options = { ...this.defaultGetImageOptions, ...options };
        return new Promise(resolve => {
            const container = this.createBasicLayout(options);
            document.body.appendChild(container);
            container.querySelector('.ekyct-close-btn')?.addEventListener('click', evt => {
                evt.preventDefault();
                this.closeEkycWindow(container);
                resolve(null);
            });
            if (options.enableFilePicker) {
                this.handleFilePicker(container, 'image/jpeg,image/png,image/webp', rs => {
                    this.closeEkycWindow(container);
                    resolve(rs);
                });
            }
            this.handleCapture(options, container).then(rs => {
                if (rs) {
                    this.closeEkycWindow(container);
                    resolve(rs);
                }
            });
        })
    }

    public getVideo(options: RecordEkycToolOptions = {}): Promise<EkycRecordResult | null> {
        // await Utils.requestFullscreen();
        options = { ...this.defaultGetVideoOptions, ...options };
        return new Promise(resolve => {
            const container = this.createBasicLayout(options);
            document.body.appendChild(container);
            container.querySelector('.ekyct-capture-region')?.classList.add('ekyct-hide-shader-border');
            container.querySelector('.ekyct-close-btn')?.addEventListener('click', evt => {
                evt.preventDefault();
                this.closeEkycWindow(container);
                resolve(null);
            });
            this.handleRecord(options, container).then(rs => {
                if (rs) {
                    this.closeEkycWindow(container);
                    resolve(rs);
                }
            });
        })
    }

    private handleFilePicker(container: HTMLDivElement, accept: string, callback: OnBlob) {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = accept;
        fileInput.onchange = () => {
            if (fileInput.files) {
                const file = fileInput.files[0];
                const fileExtension = file.name.match(/\.(png|jpg|jpeg|webp)$/i);
                if (fileExtension && fileExtension.length > 0) {
                    callback({
                        blob: file,
                        contentName: `${Utils.newGuid()}${fileExtension[0].toLowerCase()}`,
                        contentLength: file.size,
                        contentType: file.type
                    });
                }
            }
        };
        container.querySelector('.ekyct-filepicker-btn')?.addEventListener('click', evt => {
            evt.preventDefault();
            fileInput.click();
        });
    }

    private handleRecord(options: RecordEkycToolOptions, container: HTMLDivElement): Promise<EkycRecordResult | null> {
        return new Promise(async (resolve, reject) => {
            const recordButton = container.querySelector('.ekyct-record-btn');
            if (recordButton) {
                const promises: Promise<any>[] = [this.setupCamera(container, options)];
                if (options.enableValidation) promises.push(Utils.createFaceDetector());
                Utils.toggleLoaderOnCaptureRegion(true, container.querySelector('.ekyct-capture-region'));
                const results = await Promise.all(promises);
                this.toggleDisabledButtons(container, false);
                recordButton.addEventListener('click', async evt => await this.handleClickRecord(evt, resolve, reject, options, container, results[1]));
                Utils.toggleLoaderOnCaptureRegion(false, container.querySelector('.ekyct-capture-region'));
            } else reject('Record button not exists!');
        });
    }

    private async handleClickRecord(evt: Event,
        resolve: (value: EkycRecordResult | PromiseLike<EkycRecordResult | null> | null) => void,
        reject: (reason?: any) => void,
        options: RecordEkycToolOptions,
        container: HTMLDivElement,
        faceDetector?: FaceDetector) {
        evt.preventDefault();
        const recordMs = options.recordMs || 6000;
        this.toggleDisabledButtons(container);
        const captureRegionEl = container.querySelector('div.ekyct-capture-region') as HTMLDivElement;
        if (captureRegionEl) {
            const elements = Utils.getInnerElementsInCaptureDiv(captureRegionEl)
            if (elements.canvasEl) {
                let posterBlob: Blob | null = null;
                let mimeType = typeof (options.mimeType) === 'string' && ['video/webm', 'video/mp4'].includes(options.mimeType) ? options.mimeType : 'video/webm';
                const stream = elements.canvasEl.captureStream();
                const canvasContextWidth = Utils.getCanvasContextWidth(elements.videoEl, elements.shadingEl, captureRegionEl.clientWidth, options.maxCanvasRatio);
                const contextAttributes: any = { willReadFrequently: true };
                const canvasContext: CanvasRenderingContext2D = (<any>elements.canvasEl).getContext("2d", contextAttributes)!;
                const scanParams = {
                    captureRegionEl,
                    canvasContext,
                    videoEl: elements.videoEl,
                    shadingEl: elements.shadingEl,
                    canvasContextWidth: canvasContextWidth,
                    ...Utils.getVideoRatios(elements.videoEl, options.maxCanvasRatio)
                }
                const faceDetectionParams = {
                    captureRegionEl,
                    canvasEl: elements.canvasEl,
                    videoEl: elements.videoEl,
                    canvasContextWidth: canvasContextWidth
                }
                const circleRegionPoints = captureRegionEl.querySelectorAll('.ekyct-circle-region-point');
                const panelUpdateMilliseconds = 1000;
                let data: BlobPart[] = [];
                let startInferenceTime, endInferenceTime, rafId = 0, percent = 0, numInferences = 0, inferenceTimeSum = 0, lastPanelUpdate = 0, prevStart = 0, start = 0, pause = 0, duration = 0;
                let recorder: MediaRecorder;
                try {
                    recorder = new MediaRecorder(stream, {
                        mimeType,
                        videoBitsPerSecond: options.videoBitsPerSecond
                    });
                } catch (err) {
                    console.warn(err);
                    recorder = new MediaRecorder(stream, {
                        videoBitsPerSecond: options.videoBitsPerSecond
                    });
                    mimeType = 'video/webm';
                }
                recorder.ondataavailable = async event => {
                    data.push(event.data);
                    if (posterBlob == null) posterBlob = await this.getObjectFromCaptureRegion(elements.canvasEl, 'image/png', this.defaultGetImageOptions.quality!);
                };
                recorder.onstart = () => {
                    start = Date.now();
                }
                recorder.onresume = () => {
                    const timeNow = Date.now();
                    const pauseDuration = timeNow - pause;
                    start += pauseDuration;
                }
                recorder.onpause = () => {
                    pause = Date.now();
                }
                const handleRecordVideo = async () => {
                    startInferenceTime = Date.now();
                    this.handleScan(scanParams);
                    let rs = true;
                    if (options.enableValidation && faceDetector) rs = await this.handleDetectFace(faceDetectionParams, faceDetector, options.enableAlert);
                    else await Utils.delay(10)
                    endInferenceTime = Date.now();
                    const scanDuration = endInferenceTime - startInferenceTime;
                    inferenceTimeSum += scanDuration;
                    ++numInferences;
                    if (rs) {
                        if (prevStart !== start && recorder.state === 'recording') {
                            duration = endInferenceTime - start;
                            let ratio = duration / recordMs;
                            percent = ratio >= 1 ? 100 : Math.floor(ratio * 100);
                        } else if (recorder.state === 'inactive') {
                            prevStart = start;
                            recorder.start();
                        } else if (recorder.state === 'paused') {
                            prevStart = start;
                            recorder.resume();
                        }
                    } else if (recorder.state === 'recording') {
                        prevStart = start;
                        recorder.pause();
                    }
                    if (endInferenceTime - lastPanelUpdate >= panelUpdateMilliseconds || percent === 100) {
                        const averageInferenceTime = inferenceTimeSum / numInferences;
                        inferenceTimeSum = 0;
                        numInferences = 0;
                        const fps = 1000.0 / averageInferenceTime;
                        if (rs) {
                            circleRegionPoints.forEach((elm, ix) => {
                                if (ix < percent) elm.classList.add('ekyct-circle-region-point--marked')
                                else elm.classList.remove('ekyct-circle-region-point--marked')
                            });
                        }
                        lastPanelUpdate = endInferenceTime;
                    }
                    if (percent === 100) {
                        await this.stopMediaRecorder(recorder);
                        Utils.clearMediaStream(stream);
                        if (faceDetector) faceDetector.dispose();
                        window.cancelAnimationFrame(rafId);
                        await Utils.delay(250);
                        if (data.length > 0) {
                            const blob = new Blob(data, { type: mimeType });
                            let fileExtension = mimeType === 'video/mp4' ? '.mp4' : '.webm';
                            resolve({
                                blob: blob,
                                posterBlob: posterBlob,
                                contentLength: blob.size,
                                contentType: blob.type,
                                contentName: `${Utils.newGuid()}${fileExtension}`
                            });
                        }
                        else resolve(null);
                    } else rafId = requestAnimationFrame(handleRecordVideo);
                };
                handleRecordVideo();
            } else reject('Canvas not exists!');
        } else reject('Capture region not exists!');
    }

    private async stopMediaRecorder(recorder?: MediaRecorder) {
        if (recorder) {
            if (recorder.state === "recording") {
                let stopped = () => new Promise((res, rej) => {
                    recorder!.onstop = res;
                    recorder!.onerror = () => rej('An error occured!');
                });
                recorder.stop();
                await stopped();
            }
        }
    }

    private handleCapture(options: CaptureEkycToolOptions, container: HTMLDivElement): Promise<EkycToolResult | null> {
        return new Promise(async (resolve, reject) => {
            const captureButton = container.querySelector('.ekyct-capture-btn');
            if (captureButton) {
                Utils.toggleLoaderOnCaptureRegion(true, container.querySelector('.ekyct-capture-region'));
                await this.setupCamera(container, options);
                this.toggleDisabledButtons(container, false);
                captureButton.addEventListener('click', async evt => {
                    evt.preventDefault();
                    const captureRegionEl = container.querySelector('div.ekyct-capture-region') as HTMLDivElement;
                    if (captureRegionEl) {
                        const elements = Utils.getInnerElementsInCaptureDiv(captureRegionEl);
                        let canvasContextWidth = Utils.getCanvasContextWidth(elements.videoEl, elements.shadingEl, captureRegionEl.clientWidth, options.maxCanvasRatio);
                        const contextAttributes: any = { willReadFrequently: true };
                        const canvasContext: CanvasRenderingContext2D = (<any>elements.canvasEl).getContext("2d", contextAttributes)!;
                        const scanParams = {
                            captureRegionEl,
                            canvasContext,
                            videoEl: elements.videoEl,
                            shadingEl: elements.shadingEl,
                            canvasContextWidth: canvasContextWidth,
                            ...Utils.getVideoRatios(elements.videoEl, options.maxCanvasRatio)
                        }
                        this.toggleDisabledButtons(container);
                        Utils.toggleLoaderOnCaptureRegion(true, container.querySelector('.ekyct-capture-region'));
                        this.handleScan(scanParams);
                        let mimeType = typeof (options.mimeType) === 'string' && ['image/jpeg', 'image/png', 'image/webp'].includes(options.mimeType) ? options.mimeType : this.defaultGetImageOptions.mimeType;
                        let quality = typeof (options.quality) === 'number' && options.quality >= 0 && options.quality <= 1 ? options.quality : this.defaultGetImageOptions.quality;
                        let fileExtension = mimeType === 'image/webp' ? '.webp' : mimeType === 'image/jpeg' ? '.jpg' : '.png';
                        const rs = await this.getObjectFromCaptureRegion(elements.canvasEl, mimeType!, quality!);
                        if (rs) resolve({
                            blob: rs,
                            contentLength: rs.size,
                            contentName: `${Utils.newGuid()}${fileExtension}`,
                            contentType: mimeType!
                        });
                        else resolve(null);
                        Utils.toggleLoaderOnCaptureRegion(false, container.querySelector('.ekyct-capture-region'));
                        this.toggleDisabledButtons(container, false);
                    } else reject('Capture region not exists!');
                });
                Utils.toggleLoaderOnCaptureRegion(false, container.querySelector('.ekyct-capture-region'));
            } else {
                reject('Capture button not exists!');
            }
        });
    }



    private async getObjectFromCaptureRegion(canvasEl: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob | null> {
        if (canvasEl) {
            return await this.getBlobFromCanvas(canvasEl as HTMLCanvasElement, mimeType, quality);
        }
        return null;
    }

    private getBlobFromCanvas(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob | null> {
        return new Promise(resolve => {
            canvas.toBlob(blob => resolve(blob), mimeType, quality);
        })
    }

    private async handleDetectFace(parameters: FaceDetectionParameters, faceDetector: FaceDetector, enableAlert?: boolean) {
        if (parameters.videoEl && parameters.canvasEl) {
            const faces = await faceDetector.estimateFaces(parameters.canvasEl);
            if (faces.length === 1) {
                const face = faces[0];
                const faceWidth = face.box.width;
                const noseTipKeypoint = face.keypoints.find(kp => kp.name === 'noseTip');
                if (noseTipKeypoint && noseTipKeypoint.x && noseTipKeypoint.y) {
                    let rs = true;
                    if (faceWidth < parameters.canvasContextWidth * 0.3) {
                        rs = false;
                        if (enableAlert) Utils.insertAlert(parameters.captureRegionEl, EkycTools.FACE_DETECTION_WARNING_02);
                    }
                    if (faceWidth > parameters.canvasContextWidth * 0.6) {
                        rs = false;
                        if (enableAlert) Utils.insertAlert(parameters.captureRegionEl, EkycTools.FACE_DETECTION_WARNING_01);
                    }
                    if (noseTipKeypoint.y < parameters.canvasContextWidth * 0.35 || noseTipKeypoint.y > parameters.canvasContextWidth * 0.65
                        || noseTipKeypoint.x < parameters.canvasContextWidth * 0.35 || noseTipKeypoint.x > parameters.canvasContextWidth * 0.65) {
                        rs = false;
                        if (enableAlert) Utils.insertAlert(parameters.captureRegionEl, EkycTools.FACE_DETECTION_WARNING_03);
                    }
                    if (rs && enableAlert) Utils.cleanAlert(parameters.captureRegionEl);
                    return rs;
                }
            } else if (faces.length > 1 && enableAlert) {
                Utils.insertAlert(parameters.captureRegionEl, EkycTools.FACE_DETECTION_WARNING_05);
                return false;
            }
        }
        if (enableAlert) Utils.insertAlert(parameters.captureRegionEl, EkycTools.FACE_DETECTION_WARNING_04);
        return false;
    }

    private handleScan(parameters: ScanParameters) {
        const { videoEl, captureRegionEl, shadingEl, originWidthRatio, originHeightRatio, newWidthRatio, newHeightRatio, canvasContext } = parameters;
        let borderX = 0, borderY = 0, baseWidth = captureRegionEl.clientWidth,
            baseHeight = Utils.getCaptureRegionHeight(captureRegionEl);
        if (shadingEl) {
            borderX = parseFloat(shadingEl.style.borderLeftWidth.slice(0, -2));
            borderY = parseFloat(shadingEl.style.borderTopWidth.slice(0, -2));
            baseWidth = parseFloat(shadingEl.style.width.slice(0, -2));
            baseHeight = parseFloat(shadingEl.style.height.slice(0, -2));
        }
        const qrRegionWidth = baseWidth - borderX * 2;
        const qrRegionHeight = baseHeight - borderY * 2;
        let sWidthOffset = Math.round(qrRegionWidth * originWidthRatio);
        let sHeightOffset = Math.round(qrRegionHeight * originHeightRatio);
        /* Fix lỗi một số thiết bị không record được khi canvas width hoặc canvas height là số lẻ */
        if (sWidthOffset % 2 !== 0) sWidthOffset -= 1;
        if (sHeightOffset % 2 !== 0) sHeightOffset -= 1;
        /* Fix lỗi một số thiết bị không record được khi canvas width hoặc canvas height là số lẻ */
        let offsetY = 0;
        if (videoEl.clientHeight > baseHeight) offsetY = (videoEl.clientHeight - baseHeight) / 2
        const sxOffset = Math.round(borderX * originWidthRatio);
        const syOffset = Math.round((borderY + offsetY) * originHeightRatio);
        let canvasWidth = Math.round(qrRegionWidth * newWidthRatio);
        let canvasHeight = Math.round(qrRegionHeight * newHeightRatio);
        if (canvasWidth % 2 !== 0) canvasWidth -= 1;
        if (canvasHeight % 2 !== 0) canvasHeight -= 1;
        canvasContext.canvas.width = canvasWidth;
        canvasContext.canvas.height = canvasHeight;
        canvasContext.drawImage(videoEl, sxOffset, syOffset, sWidthOffset, sHeightOffset, 0, 0, canvasWidth, canvasHeight);
    }

    private createBasicLayout(options: BaseEkycToolOptions) {
        this.validateEkycToolOptions(options);
        const container = document.createElement('div');
        const containerInner = document.createElement('div');
        containerInner.className = 'ekyct-container--inner';
        containerInner.insertAdjacentHTML('beforeend', EkycStyleHTML);
        container.className = 'ekyct-container';
        container.dataset.version = EkycTools.VERSION;
        const captureRegion = document.createElement('div');
        captureRegion.dataset['shadingRatio'] = options.shadingRatio?.toString();
        captureRegion.className = 'ekyct-capture-region';
        const footer = this.createFooter(options);
        const body = document.createElement('div');
        body.className = 'ekyct-body';
        body.appendChild(captureRegion);
        containerInner.appendChild(this.createHeader());
        containerInner.appendChild(body);
        containerInner.appendChild(footer);
        container.appendChild(containerInner);
        return container;
    }

    private async setupCamera(container: HTMLDivElement, options: BaseEkycToolOptions) {
        const captureRegion = container.querySelector('.ekyct-capture-region') as HTMLDivElement;
        try {
            const bothCamCapabilities = await Utils.getCapabilitiesBothCam();
            let videoConstraints = {
                width: options.width,
                height: options.height,
                aspectRatio: options.aspectRatio,
                frameRate: options.frameRate,
                facingMode: options.facingMode
            };
            this.toggleDisabledButtons(container);
            await this.insertVideoElement(captureRegion, this.getVideoConstraints(bothCamCapabilities, videoConstraints));
            Utils.handleScreen(captureRegion);
            const switchCamBtn = container.querySelector('.ekyct-switchcam-btn');
            if (options.enableSwitchCamera && bothCamCapabilities.hasBoth) {
                switchCamBtn?.classList.remove('ekyct-dnone');
                switchCamBtn?.addEventListener('click', evt => {
                    evt.preventDefault();
                    this.toggleDisabledButtons(container);
                    this.toggleFacingMode();
                    videoConstraints.facingMode = this.currentFacingMode;
                    this.insertVideoElement(captureRegion, this.getVideoConstraints(bothCamCapabilities, videoConstraints))
                        .then(() => {
                            Utils.handleScreen(captureRegion);
                            this.toggleDisabledButtons(container, false)
                        });
                });
            } else switchCamBtn?.remove();
        } catch (err) {
            container.querySelector('.ekyct-capture-btn')?.remove();
            container.querySelector('.ekyct-record-btn')?.remove();
            captureRegion.appendChild(this.createNotHasCamElement());
            console.error(err);
        }
    }

    private toggleDisabledButtons(container: HTMLDivElement, disabled = true) {
        if (container) {
            const switchcamBtn = container.querySelector('.ekyct-switchcam-btn');
            const captureBtn = container.querySelector('.ekyct-capture-btn');
            const recordBtn = container.querySelector('.ekyct-record-btn');
            const filePickerBtn = container.querySelector('.ekyct-filepicker-btn');
            const closeBtn = container.querySelector('.ekyct-close-btn');
            if (switchcamBtn) (switchcamBtn as HTMLButtonElement).disabled = disabled;
            if (captureBtn) (captureBtn as HTMLButtonElement).disabled = disabled;
            if (recordBtn) (recordBtn as HTMLButtonElement).disabled = disabled;
            if (filePickerBtn) (filePickerBtn as HTMLButtonElement).disabled = disabled;
            if (closeBtn) (closeBtn as HTMLButtonElement).disabled = disabled;
        }
    }

    private toggleFacingMode() {
        this.currentFacingMode = this.currentFacingMode === 'environment' ? 'user' : 'environment';
    }

    private validateEkycToolOptions(options: BaseEkycToolOptions) {
        if (!options.enableSwitchCamera) options.enableSwitchCamera = false;
        if (!options.enableAlert) options.enableAlert = false;
        if (!options.enableValidation) options.enableValidation = false;
        if (typeof options.aspectRatio !== 'number'
            || options.aspectRatio < 0) options.aspectRatio = 1;
        if (typeof options.shadingRatio !== 'number'
            || options.shadingRatio < 0) options.shadingRatio = 0;
        if (Array.isArray(options.facingMode) && options.facingMode.length > 0 && ['environment', 'user'].includes(options.facingMode[0])) options.facingMode = options.facingMode[0]
        else if (typeof options.facingMode === 'object') {
            const facingModeOption = options.facingMode as ConstrainDOMStringParameters;
            if (facingModeOption.exact !== 'environment' && facingModeOption.exact !== 'user') options.facingMode = 'environment'
        } else if (options.facingMode === 'environment' || options.facingMode === 'user') options.facingMode = options.facingMode
        else options.facingMode = 'environment'
    }

    private createNotHasCamElement() {
        const el = document.createElement('div');
        el.className = 'ekyct-cam-error';
        const elInner = document.createElement('div');
        elInner.className = 'ekyct-cam-error--inner';
        const pEl1 = document.createElement('p');
        pEl1.innerHTML = EkycCamErrorSVG;
        const pEl2 = document.createElement('p');
        pEl2.innerText = EkycTools.CAMERA_NOT_FOUND_WARNING;
        elInner.append(pEl1, pEl2);
        el.appendChild(elInner);
        return el;
    }

    private async insertVideoElement(parentEl: HTMLDivElement, videoConstraints: MediaTrackConstraints) {
        Utils.clearMediaStream(this.mediaStream);
        parentEl.querySelector('.ekyct-video')?.remove();
        const videoEl = await this.createVideoElement(videoConstraints);
        this.currentFacingMode = videoConstraints.facingMode;
        parentEl.appendChild(videoEl);
    }

    private getVideoConstraints(bothCamCapabilities: {
        hasBoth: boolean;
        frontCamCapabilities: MediaTrackCapabilities;
        rearCamCapabilities: MediaTrackCapabilities | undefined;
    }, options: {
        width?: any;
        height?: any;
        frameRate?: any;
        aspectRatio?: number;
        facingMode?: ConstrainDOMString;
    }) {
        const constraints: MediaTrackConstraints = {};
        const rearCam = bothCamCapabilities.rearCamCapabilities;
        const frontCam = bothCamCapabilities.frontCamCapabilities;
        const { width, height, frameRate, aspectRatio } = options;
        const facingMode = bothCamCapabilities.hasBoth ? options.facingMode : undefined;
        if (facingMode) constraints.facingMode = facingMode;
        const setWidthHeight = (cap: MediaTrackCapabilities, dim: 'width' | 'height', value: any) => {
            if (cap[dim]) {
                const max = cap[dim]!.max;
                if (typeof value === 'number' && value > 0) {
                    if (max && value > max) value = max;
                    constraints[dim] = value;
                } else if (typeof value === 'object' && 'ideal' in value && typeof value.ideal === 'number' && value.ideal > 0) {
                    if (max && value.ideal > max) value.ideal = max;
                    if (value.max && value.ideal > value.max) value.max = value.ideal;
                    constraints[dim] = value;
                }
            }
        };
        if (facingMode === 'environment') {
            if (width) setWidthHeight(rearCam!, 'width', width);
            if (height) setWidthHeight(rearCam!, 'height', height);
        } else {
            if (width) setWidthHeight(frontCam, 'width', width);
            if (height) setWidthHeight(frontCam, 'height', height);
        }
        if (frameRate) constraints.frameRate = frameRate;
        if (typeof aspectRatio === 'number' && aspectRatio > 0 && constraints.width && constraints.height) {
            const constraintWidth = constraints.width as any;
            const constraintHeight = constraints.height as any;
            let maxWidth = constraintWidth.ideal || constraintWidth;
            let maxHeight = constraintHeight.ideal || constraintHeight;
            const [newWidth, newHeight] = Utils.adjustRatio([maxWidth, maxHeight, aspectRatio]);
            constraints.width = constraintWidth.ideal ? { ...constraintWidth, ideal: newWidth } : newWidth;
            constraints.height = constraintHeight.ideal ? { ...constraintHeight, ideal: newHeight } : newHeight;
        }
        return constraints;
    }

    private closeEkycWindow(container: HTMLDivElement) {
        // await Utils.exitFullscreen();
        Utils.clearMediaStream(this.mediaStream);
        if (document.body.contains(container)) document.body.removeChild(container);
    }

    private createHeader() {
        const header = document.createElement('div');
        header.className = 'ekyct-header';
        const headerInner = document.createElement('div');
        headerInner.className = 'ekyct-header--inner';
        const closeButton = document.createElement('button');
        closeButton.className = 'ekyct-btn ekyct-close-btn';
        closeButton.disabled = true;
        closeButton.innerHTML = EkycCloseBtnSVG;
        headerInner.appendChild(closeButton);
        header.appendChild(headerInner);
        return header;
    }

    private createFooter(options: any) {
        const footer = document.createElement('div');
        footer.className = 'ekyct-footer';
        const footerInner = document.createElement('div');
        footerInner.className = 'ekyct-footer--inner';
        if (options.enableFilePicker) {
            const fileButton = document.createElement('button');
            fileButton.className = 'ekyct-btn ekyct-filepicker-btn';
            fileButton.innerHTML = EkycFileBtnSVG;
            fileButton.disabled = true;
            footerInner.appendChild(fileButton);
        }
        if (this.instanceOfCaptureEkycToolOptions(options)) {
            const captureButton = document.createElement('button');
            captureButton.className = 'ekyct-btn ekyct-capture-btn';
            captureButton.innerHTML = EkycCaptureBtnSVG;
            captureButton.disabled = true;
            footerInner.appendChild(captureButton);
        } else {
            const recordButton = document.createElement('button');
            recordButton.className = 'ekyct-btn ekyct-record-btn';
            recordButton.innerHTML = EkycRecordBtnSVG;
            recordButton.disabled = true;
            footerInner.appendChild(recordButton);
        }
        if (options.enableSwitchCamera) {
            const switchCamButton = document.createElement('button');
            switchCamButton.className = 'ekyct-btn ekyct-switchcam-btn ekyct-dnone';
            switchCamButton.innerHTML = EkycSwitchCamSVG;
            switchCamButton.disabled = true;
            footerInner.appendChild(switchCamButton);
        }
        footer.appendChild(footerInner);
        return footer;
    }

    private instanceOfCaptureEkycToolOptions(object: any) {
        return 'enableFilePicker' in object;
    }

    private createVideoElement(videoConstraints: any): Promise<HTMLVideoElement> {
        return new Promise(resolve => {
            const videoElement = document.createElement("video");
            videoElement.className = 'ekyct-video';
            videoElement.muted = true;
            (<any>videoElement).playsInline = true;
            let onVideoStart = () => {
                videoElement.removeEventListener("playing", onVideoStart);
                resolve(videoElement);
            };
            videoElement.addEventListener('playing', onVideoStart);
            let constraints: MediaStreamConstraints = {
                audio: false,
                video: videoConstraints
            };
            navigator.mediaDevices.getUserMedia(constraints).then(stream => {
                // const [track] = stream.getVideoTracks();
                // const settings = track.getSettings();
                // if ('zoom' in settings) {
                //     const zoomOption = { zoom: 1 } as MediaTrackConstraintSet;
                //     track.applyConstraints({ advanced: [zoomOption] });
                // }
                this.mediaStream = stream;
                videoElement.srcObject = stream;
                videoElement.play();
            });
        })
    }
}