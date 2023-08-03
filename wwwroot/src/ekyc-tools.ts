import { EkycCamErrorSVG, EkycCaptureBtnSVG, EkycCloseBtnSVG, EkycFileBtnSVG, EkycRecordBtnSVG, EkycStyleHTML, EkycSwitchCamSVG } from './ekyc-asset';
import { Utils } from './utils';
import { createDetector, SupportedModels, FaceDetector, MediaPipeFaceDetectorMediaPipeModelConfig } from '@tensorflow-models/face-detection';

interface BaseEkycToolOptions {
    width?: any;
    height?: any;
    frameRate?: any;
    aspectRatio?: number,
    shadingRatio?: number,
    enableSwitchCamera?: boolean,
    enableAlert?: boolean,
    enableValidation?: boolean,
    facingMode?: ConstrainDOMString,
    mimeType?: string
}

interface CaptureEkycToolOptions extends BaseEkycToolOptions {
    enableFilePicker?: boolean,
    quality?: number
}

interface RecordEkycToolOptions extends BaseEkycToolOptions {
    recordMs?: number,
    videoBitsPerSecond?: number
}

interface EkycToolResult {
    blob: Blob | null,
    contentName: string,
    contentType: string,
    contentLength: number
}

interface EkycRecordResult extends EkycToolResult {
    posterBlob: Blob | null
}

type OnBlob = (file: EkycToolResult) => void;

export class EkycTools {
    public static VERSION = '1.0.0';
    public static FACE_DETECTION_WARNING_01 = 'Vui lòng đưa camera ra xa một chút!';
    public static FACE_DETECTION_WARNING_02 = 'Vui lòng đưa camera lại gần một chút!';
    public static FACE_DETECTION_WARNING_03 = 'Vui lòng đưa khuôn mặt vào giữa vùng chọn!';
    public static FACE_DETECTION_WARNING_04 = 'Không thể phát hiện khuôn mặt trong vùng chọn!';
    public static CAMERA_NOT_FOUND_WARNING = 'Không thể tìm thấy máy ảnh trên thiết bị của bạn!';

    private mediaStream: MediaStream | null = null;
    private scanFaceRunning: boolean = false;
    private currentFacingMode: ConstrainDOMString | undefined = 'environment';
    private readonly defaultGetImageOptions: CaptureEkycToolOptions = {
        enableFilePicker: true,
        enableSwitchCamera: true,
        enableAlert: true,
        enableValidation: false,
        shadingRatio: 0.6,
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
        options = { ...this.defaultGetImageOptions, ...options };
        return new Promise(resolve => {
            const container = this.createBasicLayout(options);
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
            document.body.appendChild(container);
        })
    }

    public getVideo(options: RecordEkycToolOptions = {}): Promise<EkycRecordResult | null> {
        options = { ...this.defaultGetVideoOptions, ...options };
        return new Promise(resolve => {
            const container = this.createBasicLayout(options);
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
            document.body.appendChild(container);
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
                if (options.enableValidation) {
                    const model = SupportedModels.MediaPipeFaceDetector;
                    const detectorConfig: MediaPipeFaceDetectorMediaPipeModelConfig = {
                        runtime: 'mediapipe',
                        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_detection'
                    };
                    promises.push(createDetector(model, detectorConfig));
                }
                const footer = container.querySelector('.ekyct-footer') as HTMLDivElement;
                Utils.toggleLoaderOnCaptureRegion(true, container.querySelector('.ekyct-capture-region'));
                const results = await Promise.all(promises);
                this.enableFooterButtons(footer);
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
        this.disableFooterButtons(container.querySelector('.ekyct-footer') as HTMLDivElement);
        const captureRegionEl = container.querySelector('div.ekyct-capture-region');
        if (captureRegionEl) {
            let data: BlobPart[] = [];
            const captureRegion = captureRegionEl as HTMLDivElement;
            let percent = 0;
            let duration = 0;
            let start = 0;
            const canvasEl = captureRegion.querySelector('canvas.ekyct-canvas') as HTMLCanvasElement;
            if (canvasEl) {
                let mimeType = typeof (options.mimeType) === 'string' && ['video/webm', 'video/mp4'].includes(options.mimeType) ? options.mimeType : 'video/webm';
                let stream = canvasEl.captureStream();
                let recorder: MediaRecorder | undefined;
                let posterBlob: Blob | null = null;
                this.scanFaceRunning = true;
                while (this.scanFaceRunning) {
                    try {
                        this.handleScan(captureRegion);
                        let rs = true;
                        if (options.enableValidation && faceDetector)
                            rs = await this.handleDetectFace(captureRegion, faceDetector, options.enableAlert);
                        if (rs) {
                            if (!recorder) {
                                start = 0;
                                duration = 0;
                                percent = 0;
                                data = [];
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
                                    if (posterBlob == null) posterBlob = await this.getObjectFromCaptureRegion(captureRegion, 'image/png', this.defaultGetImageOptions.quality!);
                                };
                                recorder.start();
                            }
                            let nowTimestamp = performance.now();
                            if (start === 0) start = nowTimestamp;
                            duration = nowTimestamp - start;
                            let ratio = duration / recordMs;
                            percent = ratio >= 1 ? 100 : Math.floor(ratio * 100);
                        } else {
                            await this.stopMediaRecorder(recorder);
                            start = 0;
                            duration = 0;
                            percent = 0;
                            data = [];
                            recorder = undefined;
                            posterBlob = null;
                        }
                        await Utils.delay(10);
                        captureRegionEl.querySelectorAll('.ekyct-circle-region-point').forEach((elm, ix) => {
                            if (ix < percent) elm.classList.add('ekyct-circle-region-point--marked')
                            else elm.classList.remove('ekyct-circle-region-point--marked')
                        });
                    } catch (err) {
                        console.error(err);
                        break;
                    }
                    if (recordMs <= duration) {
                        await this.stopMediaRecorder(recorder);
                        this.clearMediaStream(stream);
                        await Utils.delay(250);
                        break;
                    }
                }
                this.scanFaceRunning = false;
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
                const footer = container.querySelector('.ekyct-footer') as HTMLDivElement;
                Utils.toggleLoaderOnCaptureRegion(true, container.querySelector('.ekyct-capture-region'));
                await this.setupCamera(container, options);
                this.enableFooterButtons(footer);
                captureButton.addEventListener('click', async evt => {
                    evt.preventDefault();
                    const captureRegionEl = container.querySelector('div.ekyct-capture-region');
                    if (captureRegionEl) {
                        const captureRegion = captureRegionEl as HTMLDivElement;
                        this.handleScan(captureRegion);
                        let mimeType = typeof (options.mimeType) === 'string' && ['image/jpeg', 'image/png', 'image/webp'].includes(options.mimeType) ? options.mimeType : this.defaultGetImageOptions.mimeType;
                        let quality = typeof (options.quality) === 'number' && options.quality >= 0 && options.quality <= 1 ? options.quality : this.defaultGetImageOptions.quality;
                        let fileExtension = mimeType === 'image/webp' ? '.webp' : mimeType === 'image/jpeg' ? '.jpg' : '.png';
                        const rs = await this.getObjectFromCaptureRegion(captureRegion, mimeType!, quality!);
                        if (rs) resolve({
                            blob: rs,
                            contentLength: rs.size,
                            contentName: `${Utils.newGuid()}${fileExtension}`,
                            contentType: mimeType!
                        });
                        else resolve(null);
                    } else reject('Capture region not exists!');
                });
                Utils.toggleLoaderOnCaptureRegion(false, container.querySelector('.ekyct-capture-region'));
            } else {
                reject('Capture button not exists!');
            }
        });
    }



    private async getObjectFromCaptureRegion(captureRegionEl: HTMLDivElement, mimeType: string, quality: number): Promise<Blob | null> {
        const canvasEl = captureRegionEl.querySelector('canvas.ekyct-canvas');
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

    private async handleDetectFace(captureRegionEl: HTMLDivElement, faceDetector: FaceDetector, enableAlert?: boolean) {
        const canvasEl = captureRegionEl.querySelector('.ekyct-canvas') as HTMLCanvasElement;
        const videoEl = captureRegionEl.querySelector('.ekyct-video') as HTMLVideoElement;
        const shadingEl = captureRegionEl.querySelector('.ekyct-shading') as HTMLDivElement;
        if (videoEl && canvasEl) {
            const faces = await faceDetector.estimateFaces(canvasEl);
            if (faces.length === 1) {
                let borderX = 0;
                if (shadingEl) borderX = parseFloat(shadingEl.style.borderLeftWidth.slice(0, -2));
                const face = faces[0];
                const faceWidth = face.box.width;
                const noseTipKeypoint = face.keypoints.find(kp => kp.name === 'noseTip');
                const widthRatio = videoEl.videoWidth / videoEl.clientWidth;
                const qrRegionWidth = videoEl.clientWidth - borderX * 2;
                const canvasContextWidth = qrRegionWidth * widthRatio;
                if (noseTipKeypoint && noseTipKeypoint.x && noseTipKeypoint.y) {
                    let rs = true;
                    if (faceWidth < canvasContextWidth * 0.3) {
                        rs = false;
                        if (enableAlert) Utils.insertAlert(captureRegionEl, EkycTools.FACE_DETECTION_WARNING_02);
                    }
                    if (faceWidth > canvasContextWidth * 0.6) {
                        rs = false;
                        if (enableAlert) Utils.insertAlert(captureRegionEl, EkycTools.FACE_DETECTION_WARNING_01);
                    }
                    if (noseTipKeypoint.y < canvasContextWidth * 0.35 || noseTipKeypoint.y > canvasContextWidth * 0.65
                        || noseTipKeypoint.x < canvasContextWidth * 0.35 || noseTipKeypoint.x > canvasContextWidth * 0.65) {
                        rs = false;
                        if (enableAlert) Utils.insertAlert(captureRegionEl, EkycTools.FACE_DETECTION_WARNING_03);
                    }
                    if (rs && enableAlert) Utils.cleanAlert(captureRegionEl);
                    return rs;
                }
            }
        }
        if (enableAlert) Utils.insertAlert(captureRegionEl, EkycTools.FACE_DETECTION_WARNING_04);
        return false;
    }

    private handleScan(captureRegionEl: HTMLDivElement) {
        const shadingEl = captureRegionEl.querySelector('.ekyct-shading') as HTMLDivElement;
        const videoEl = captureRegionEl.querySelector('.ekyct-video') as HTMLVideoElement;
        const canvasEl = captureRegionEl.querySelector('.ekyct-canvas') as HTMLCanvasElement;
        let borderX = 0, borderY = 0;
        if (shadingEl) {
            borderX = parseFloat(shadingEl.style.borderLeftWidth.slice(0, -2));
            borderY = parseFloat(shadingEl.style.borderTopWidth.slice(0, -2));
        }
        if (videoEl && canvasEl) {
            const widthRatio = videoEl.videoWidth / videoEl.clientWidth;
            const heightRatio = videoEl.videoHeight / videoEl.clientHeight;
            const qrRegionWidth = videoEl.clientWidth - borderX * 2;
            const qrRegionHeight = videoEl.clientHeight - borderY * 2;
            const sWidthOffset = qrRegionWidth * widthRatio;
            const sHeightOffset = qrRegionHeight * heightRatio;
            const sxOffset = borderX * widthRatio;
            const syOffset = borderY * heightRatio;
            const contextAttributes: any = { willReadFrequently: true };
            const context: CanvasRenderingContext2D = (<any>canvasEl).getContext("2d", contextAttributes)!;
            context.canvas.width = sWidthOffset;
            context.canvas.height = sHeightOffset;
            context.drawImage(videoEl, sxOffset, syOffset, sWidthOffset, sHeightOffset, 0, 0, sWidthOffset, sHeightOffset);
        }
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
        containerInner.appendChild(this.createHeader());
        containerInner.appendChild(captureRegion);
        containerInner.appendChild(footer);
        container.appendChild(containerInner);
        return container;
    }

    private async setupCamera(container: HTMLDivElement, options: BaseEkycToolOptions) {
        const footer = container.querySelector('.ekyct-footer') as HTMLDivElement;
        const captureRegion = container.querySelector('.ekyct-capture-region') as HTMLDivElement;
        const containerInner = container.querySelector('.ekyct-container--inner') as HTMLDivElement;
        let numberOfCameras = (await EkycTools.getCameraDevices()).length;
        let videoConstraints = {
            width: options.width,
            height: options.height,
            aspectRatio: options.aspectRatio,
            frameRate: options.frameRate,
            facingMode: options.facingMode
        };
        if (numberOfCameras > 0) {
            this.disableFooterButtons(footer);
            await this.insertVideoElement(captureRegion, this.getVideoConstraints(2, videoConstraints));
            Utils.handleScreen(containerInner);
            numberOfCameras = (await EkycTools.getCameraDevices()).length;
            const switchCamBtn = footer.querySelector('.ekyct-switchcam-btn');
            if (options.enableSwitchCamera && numberOfCameras > 1) {
                switchCamBtn?.classList.remove('ekyct-dnone');
                switchCamBtn?.addEventListener('click', evt => {
                    evt.preventDefault();
                    this.disableFooterButtons(footer);
                    this.toggleFacingMode();
                    videoConstraints.facingMode = this.currentFacingMode;
                    this.insertVideoElement(captureRegion, this.getVideoConstraints(numberOfCameras, videoConstraints))
                        .then(() => this.enableFooterButtons(footer));
                });
            } else switchCamBtn?.remove();
        } else {
            footer.querySelector('.ekyct-capture-btn')?.remove();
            footer.querySelector('.ekyct-record-btn')?.remove();
            captureRegion.appendChild(this.createNotHasCamElement());
        }
    }

    private enableFooterButtons(footer: HTMLDivElement) {
        if (footer) {
            const switchcamBtn = footer.querySelector('.ekyct-switchcam-btn');
            const captureBtn = footer.querySelector('.ekyct-capture-btn');
            const recordBtn = footer.querySelector('.ekyct-record-btn');
            if (switchcamBtn) (switchcamBtn as HTMLButtonElement).disabled = false;
            if (captureBtn) (captureBtn as HTMLButtonElement).disabled = false;
            if (recordBtn) (recordBtn as HTMLButtonElement).disabled = false;
        }
    }

    private disableFooterButtons(footer: HTMLDivElement) {
        if (footer) {
            const switchcamBtn = footer.querySelector('.ekyct-switchcam-btn');
            const captureBtn = footer.querySelector('.ekyct-capture-btn');
            const recordBtn = footer.querySelector('.ekyct-record-btn');
            if (switchcamBtn) (switchcamBtn as HTMLButtonElement).disabled = true;
            if (captureBtn) (captureBtn as HTMLButtonElement).disabled = true;
            if (recordBtn) (recordBtn as HTMLButtonElement).disabled = true;
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
        if (!options.facingMode) options.facingMode = 'environment';
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
        this.clearMediaStream(this.mediaStream);
        parentEl.querySelector('.ekyct-video')?.remove();
        const videoEl = await this.createVideoElement(videoConstraints);
        this.currentFacingMode = videoConstraints.facingMode;
        parentEl.appendChild(videoEl);
        return {
            videoWidth: videoEl.clientWidth,
            videoHeight: videoEl.clientHeight
        };
    }

    private getVideoConstraints(numberOfCameras: number, options: {
        width?: any;
        height?: any;
        frameRate?: any;
        aspectRatio?: number,
        facingMode?: ConstrainDOMString
    }) {
        let facingMode = this.currentFacingMode === options.facingMode || numberOfCameras > 1 ? options.facingMode : this.currentFacingMode;
        let constraints: MediaTrackConstraints = {
            facingMode
        };
        if (options.width) constraints.width = options.width;
        if (options.height) constraints.height = options.height;
        if (options.frameRate) constraints.frameRate = options.frameRate;
        if (typeof options.aspectRatio === 'number' && options.aspectRatio > 0) constraints.aspectRatio = options.aspectRatio;
        return constraints;
    }

    private closeEkycWindow(container: HTMLDivElement) {
        this.clearMediaStream(this.mediaStream);
        this.scanFaceRunning = false;
        if (document.body.contains(container)) document.body.removeChild(container);
    }

    private clearMediaStream(mediaStream: MediaStream | null) {
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => {
                mediaStream?.removeTrack(track);
                track.stop();
            });
        }
    }

    private createHeader() {
        const header = document.createElement('div');
        header.className = 'ekyct-header';
        const headerInner = document.createElement('div');
        headerInner.className = 'ekyct-header--inner';
        const closeButton = document.createElement('button');
        closeButton.className = 'ekyct-btn ekyct-close-btn';
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
            footerInner.appendChild(fileButton);
        }
        if (this.instanceOfCaptureEkycToolOptions(options)) {
            const captureButton = document.createElement('button');
            captureButton.className = 'ekyct-btn ekyct-capture-btn';
            captureButton.innerHTML = EkycCaptureBtnSVG;
            footerInner.appendChild(captureButton);
        } else {
            const recordButton = document.createElement('button');
            recordButton.className = 'ekyct-btn ekyct-record-btn';
            recordButton.innerHTML = EkycRecordBtnSVG;
            footerInner.appendChild(recordButton);
        }
        if (options.enableSwitchCamera) {
            const switchCamButton = document.createElement('button');
            switchCamButton.className = 'ekyct-btn ekyct-switchcam-btn ekyct-dnone';
            switchCamButton.innerHTML = EkycSwitchCamSVG;
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
            videoElement.setAttribute("muted", "true");
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
                this.mediaStream = stream;
                videoElement.srcObject = stream;
                videoElement.play();
            });
        })
    }
}