import { EkycCamErrorSVG, EkycCaptureBtnSVG, EkycCloseBtnSVG, EkycFileBtnSVG, EkycRecordBtnSVG, EkycStyleHTML, EkycSwitchCamSVG } from './ekyc-asset';
import { Utils } from './utils';
import { createDetector, SupportedModels, FaceDetector, MediaPipeFaceDetectorMediaPipeModelConfig } from '@tensorflow-models/face-detection';

export interface BaseEkycToolOptions {
    ratio?: number,
    enableSwitchCamera?: boolean,
    enableAlert?: boolean,
    enableValidation?: boolean,
    facingMode?: string
}

export interface CaptureEkycToolOptions extends BaseEkycToolOptions {
    enableFilePicker?: boolean
}

export interface RecordEkycToolOptions extends BaseEkycToolOptions { }

type OnBlob = (file: Blob) => void;

export class EkycTools {
    private mediaStream: (MediaStream | null) = null;
    private scanFaceRunning: boolean = false;
    private currentFacingMode: string = 'environment';
    private readonly hasCheckIDCard: boolean = false;
    private faceDetector: (FaceDetector | null) = null;
    private readonly defaultGetImageOptions: CaptureEkycToolOptions = {
        enableFilePicker: true,
        enableSwitchCamera: true,
        enableAlert: true,
        enableValidation: true,
        ratio: 0.6,
        facingMode: 'environment'
    };
    private readonly defaultGetVideoOptions: RecordEkycToolOptions = {
        enableAlert: true,
        enableSwitchCamera: true,
        enableValidation: true,
        facingMode: 'user'
    };

    public constructor(idCardModelUrl?: string) {
        if (idCardModelUrl) this.hasCheckIDCard = true;
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

    public getImage(options: CaptureEkycToolOptions = {}): Promise<Blob | null> {
        options = { ...this.defaultGetImageOptions, ...options };
        return new Promise((resolve) => {
            const container = this.createBasicLayout(options);
            container.querySelector('.ekyct-close-btn')?.addEventListener('click', evt => {
                evt.preventDefault();
                this.closeEkycWindow(container);
                resolve(null);
            });
            if (options.enableFilePicker) {
                this.handleFilePicker(container, 'image/png,image/jpeg', file => {
                    this.closeEkycWindow(container);
                    resolve(file);
                });
            }
            this.handleCapture(container).then(blob => {
                if (blob) {
                    this.closeEkycWindow(container);
                    resolve(blob);
                }
            });
            document.body.appendChild(container);
        })
    }

    public getVideo(recordMs = 3000, options: RecordEkycToolOptions = {}): Promise<Blob | null> {
        options = { ...this.defaultGetVideoOptions, ...options };
        return new Promise((resolve) => {
            const model = SupportedModels.MediaPipeFaceDetector;
            const detectorConfig: MediaPipeFaceDetectorMediaPipeModelConfig = {
                runtime: 'mediapipe',
                solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_detection'
            };
            createDetector(model, detectorConfig).then(detector => {
                this.faceDetector = detector;
            });
            const container = this.createBasicLayout(options);
            container.querySelector('.ekyct-capture-region')?.classList.add('ekyct-hide-shader-border');
            container.querySelector('.ekyct-close-btn')?.addEventListener('click', evt => {
                evt.preventDefault();
                this.closeEkycWindow(container);
                resolve(null);
            });
            this.handleRecord(recordMs, container).then(blob => {
                if (blob) {
                    this.closeEkycWindow(container);
                    resolve(blob);
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
                callback(fileInput.files[0])
            }
        };
        container.querySelector('.ekyct-filepicker-btn')?.addEventListener('click', evt => {
            evt.preventDefault();
            fileInput.click();
        });
    }

    private handleRecord(recordMs: number, container: HTMLDivElement): Promise<Blob | null> {
        return new Promise((resolve, reject) => {
            const recordButton = container.querySelector('.ekyct-record-btn');
            if (recordButton) {
                recordButton.addEventListener('click', async evt => {
                    evt.preventDefault();
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
                            let stream = canvasEl.captureStream();
                            let recorder: MediaRecorder | undefined;
                            this.scanFaceRunning = true;
                            while (this.scanFaceRunning) {
                                try {
                                    this.handleScan(captureRegion);
                                    let rs = await this.handleDetectFace(captureRegion);
                                    if (rs) {
                                        if (!recorder) {
                                            start = 0;
                                            duration = 0;
                                            percent = 0;
                                            data = [];
                                            recorder = new MediaRecorder(stream);
                                            recorder.ondataavailable = event => data.push(event.data);
                                            recorder.start();
                                        }
                                        let nowTimestamp = new Date().getTime();
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
                            if (data.length > 0) resolve(new Blob(data, { type: "video/webm" }))
                            else resolve(null);
                        } else reject('Canvas not exists!');
                    } else reject('Capture region not exists!');
                });
            } else reject('Record button not exists!');
        })
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

    private handleCapture(container: HTMLDivElement): Promise<Blob | null> {
        return new Promise((resolve, reject) => {
            const captureButton = container.querySelector('.ekyct-capture-btn');
            if (captureButton) {
                captureButton.addEventListener('click', async evt => {
                    evt.preventDefault();
                    const captureRegionEl = container.querySelector('div.ekyct-capture-region');
                    if (captureRegionEl) {
                        const captureRegion = captureRegionEl as HTMLDivElement;
                        this.handleScan(captureRegion);
                        const rs = await this.getObjectFromCaptureRegion(captureRegion);
                        resolve(rs);
                    } else reject('Capture region not exists!');
                });
            } else {
                reject('Capture button not exists!');
            }
        });
    }



    private async getObjectFromCaptureRegion(captureRegionEl: HTMLDivElement): Promise<Blob | null> {
        const canvasEl = captureRegionEl.querySelector('canvas.ekyct-canvas');
        if (canvasEl) {
            return await this.getBlobFromCanvas(canvasEl as HTMLCanvasElement);
        }
        return null;
    }

    private getBlobFromCanvas(canvas: HTMLCanvasElement): Promise<Blob | null> {
        return new Promise(resolve => {
            canvas.toBlob(blob => resolve(blob));
        })
    }

    private async handleDetectFace(captureRegionEl: HTMLDivElement) {
        if (this.faceDetector) {
            const canvasEl = captureRegionEl.querySelector('.ekyct-canvas');
            if (canvasEl) {
                const canvasElement = canvasEl as HTMLCanvasElement;
                const faces = await this.faceDetector.estimateFaces(canvasElement);
                if (faces.length === 1) {
                    const face = faces[0];
                    const faceWidth = face.box.width;
                    const canvasWidth = parseFloat(canvasElement.style.width.slice(0, -2));
                    const noseTipKeypoint = face.keypoints.find(kp => kp.name === 'noseTip');
                    if (noseTipKeypoint && noseTipKeypoint.x && noseTipKeypoint.y) {
                        let rs = true;
                        if (faceWidth < canvasWidth * 0.4) {
                            rs = false;
                            Utils.insertAlert(captureRegionEl, 'Vui lòng đưa camera lại gần một chút!');
                        }
                        if (faceWidth > canvasWidth * 0.65) {
                            rs = false;
                            Utils.insertAlert(captureRegionEl, 'Vui lòng đưa camera ra xa một chút!');
                        }
                        if (noseTipKeypoint.y < canvasWidth * 0.4 || noseTipKeypoint.y > canvasWidth * 0.65
                            || noseTipKeypoint.x < canvasWidth * 0.4 || noseTipKeypoint.x > canvasWidth * 0.65) {
                            rs = false;
                            Utils.insertAlert(captureRegionEl, 'Vui lòng đưa mặt vào giữa vùng chọn!');
                        }
                        if (rs) Utils.cleanAlert(captureRegionEl);
                        return rs;
                    }
                }
            }
        }
        Utils.insertAlert(captureRegionEl, 'Không thể phát hiện khuôn mặt trong vùng chọn!');
        return false;
    }

    private handleScan(captureRegionEl: HTMLDivElement) {
        const shadingEl = captureRegionEl.querySelector('.ekyct-shading');
        const videoEl = captureRegionEl.querySelector('.ekyct-video');
        const canvasEl = captureRegionEl.querySelector('.ekyct-canvas');
        if (shadingEl && videoEl && canvasEl) {
            const videoElement = videoEl as HTMLVideoElement;
            const shadingElement = shadingEl as HTMLDivElement;
            const canvasElement = canvasEl as HTMLCanvasElement;
            const widthRatio = videoElement.videoWidth / videoElement.clientWidth;
            const heightRatio = videoElement.videoHeight / videoElement.clientHeight;
            const borderX = parseFloat(shadingElement.style.borderLeftWidth.slice(0, -2));
            const borderY = parseFloat(shadingElement.style.borderTopWidth.slice(0, -2));
            const qrRegionWidth = videoElement.clientWidth - borderX * 2;
            const qrRegionHeight = videoElement.clientHeight - borderY * 2;
            const sWidthOffset = qrRegionWidth * widthRatio;
            const sHeightOffset = qrRegionHeight * heightRatio;
            const sxOffset = borderX * widthRatio;
            const syOffset = borderY * heightRatio;
            const contextAttributes: any = { willReadFrequently: true };
            const context: CanvasRenderingContext2D = (<any>canvasElement).getContext("2d", contextAttributes)!;
            context.canvas.width = qrRegionWidth;
            context.canvas.height = qrRegionHeight;
            context.drawImage(videoElement, sxOffset, syOffset, sWidthOffset, sHeightOffset, 0, 0, qrRegionWidth, qrRegionHeight);
            // let imageEl = document.getElementById('img-id') as HTMLImageElement;
            // imageEl.src = canvasElement.toDataURL();
        }
        // scanCallback(captureRegionEl).then(rs => {
        //     if (rs) {
        //         const canvasEl = captureRegionEl.querySelector('.ekyct-canvas');
        //         if (canvasEl) {
        //             (canvasEl as HTMLCanvasElement).toBlob(blob => this.latestBlob = blob);
        //         }
        //     };
        //     this.foreverScanTimeout = setTimeout(() => {
        //         this.foreverScan(captureRegionEl);
        //     }, 100);
        // });
    }

    private createBasicLayout(options: BaseEkycToolOptions) {
        this.validateEkycToolOptions(options);
        const container = document.createElement('div');
        const containerInner = document.createElement('div');
        containerInner.className = 'ekyct-container--inner';
        containerInner.insertAdjacentHTML('beforeend', EkycStyleHTML);
        container.className = 'ekyct-container';
        const captureRegion = document.createElement('div');
        captureRegion.dataset['ratio'] = options.ratio?.toString();
        captureRegion.className = 'ekyct-capture-region';
        const footer = this.createFooter(options);
        containerInner.appendChild(this.createHeader());
        containerInner.appendChild(captureRegion);
        containerInner.appendChild(footer);
        container.appendChild(containerInner);

        EkycTools.getCameraDevices().then(cameraDevices => {
            const numberOfCameras = cameraDevices.length;
            if (options.enableSwitchCamera && numberOfCameras > 1) {
                footer.querySelector('.ekyct-switchcam-btn')?.addEventListener('click', evt => {
                    evt.preventDefault();
                    this.disableFooterButtons(footer);
                    this.toggleFacingMode();
                    this.insertVideoElement(captureRegion, numberOfCameras, this.currentFacingMode).then(() => {
                        this.enableFooterButtons(footer);
                    });
                })
            } else {
                footer.querySelector('.ekyct-switchcam-btn')?.remove();
            }

            if (numberOfCameras > 0) {
                this.disableFooterButtons(footer);
                this.insertVideoElement(captureRegion, numberOfCameras, options.facingMode).then(() => {
                    Utils.handleScreen(containerInner);
                    this.enableFooterButtons(footer);
                });
            } else {
                footer.querySelector('.ekyct-capture-btn')?.remove();
                footer.querySelector('.ekyct-record-btn')?.remove();
                captureRegion.appendChild(this.createNotHasCamElement());
            }
        })
        // screen.orientation.addEventListener('change', this.handleOrientationChange);
        //window.addEventListener('orientationchange', this.handleOrientationChange);
        return container;
    }

    private enableFooterButtons(footer: HTMLDivElement) {
        const switchcamBtn = footer.querySelector('.ekyct-switchcam-btn');
        const captureBtn = footer.querySelector('.ekyct-capture-btn');
        const recordBtn = footer.querySelector('.ekyct-record-btn');
        if (switchcamBtn) {
            (switchcamBtn as HTMLButtonElement).disabled = false;
        }
        if (!this.hasCheckIDCard && captureBtn) {
            (captureBtn as HTMLButtonElement).disabled = false;
        }
        if (recordBtn) {
            (recordBtn as HTMLButtonElement).disabled = false;
        }
    }

    private disableFooterButtons(footer: HTMLDivElement) {
        const switchcamBtn = footer.querySelector('.ekyct-switchcam-btn');
        const captureBtn = footer.querySelector('.ekyct-capture-btn');
        const recordBtn = footer.querySelector('.ekyct-record-btn');
        if (switchcamBtn) {
            (switchcamBtn as HTMLButtonElement).disabled = true;
        }
        if (!this.hasCheckIDCard && captureBtn) {
            (captureBtn as HTMLButtonElement).disabled = true;
        }
        if (recordBtn) {
            (recordBtn as HTMLButtonElement).disabled = true;
        }
    }

    private toggleFacingMode() {
        this.currentFacingMode = this.currentFacingMode === 'environment' ? 'user' : 'environment';
    }

    private validateEkycToolOptions(options: BaseEkycToolOptions) {
        if (!options.enableSwitchCamera) options.enableSwitchCamera = false;
        if (!options.enableAlert) options.enableAlert = false;
        if (!options.ratio) options.ratio = 1;
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
        pEl2.innerText = 'Không thể tìm thấy máy ảnh trên thiết bị của bạn!';
        elInner.append(pEl1, pEl2);
        el.appendChild(elInner);
        return el;
    }

    private async insertVideoElement(parentEl: HTMLDivElement, numberOfCameras: number, desiredFacingMode = 'environment') {
        if (numberOfCameras > 0) {
            let facingMode = this.currentFacingMode === desiredFacingMode || numberOfCameras > 1 ? desiredFacingMode : this.currentFacingMode;
            this.clearMediaStream(this.mediaStream);
            parentEl.querySelector('.ekyct-video')?.remove();
            const videoEl = await this.createVideoElement({ facingMode });
            this.currentFacingMode = facingMode;
            parentEl.appendChild(videoEl);
            return {
                videoWidth: videoEl.clientWidth,
                videoHeight: videoEl.clientHeight
            };
        }
        return null;
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
            switchCamButton.className = 'ekyct-btn ekyct-switchcam-btn';
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