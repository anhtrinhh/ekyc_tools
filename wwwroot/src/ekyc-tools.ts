import { EkycCamErrorSVG, EkycCaptureBtnSVG, EkycCloseBtnSVG, EkycFileBtnSVG, EkycRecordBtnSVG, EkycStyleHTML, EkycSwitchCamSVG } from './ekyc-asset';
import { Utils } from './utils';
import '@mediapipe/face_detection';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as faceDetection from '@tensorflow-models/face-detection';
import { FaceDetector, MediaPipeFaceDetectorMediaPipeModelConfig } from '@tensorflow-models/face-detection';

export interface EkycToolOptions {
    ratio?: number,
    enableFilePicker?: boolean,
    enableCapture?: boolean,
    enableRecord?: boolean,
    enableSwitchCamera?: boolean,
    facingMode?: string
}

type OnBlob = (file: Blob) => void;
type ScanCallback = (scanWrapperEl: HTMLDivElement) => Promise<boolean>;

export class EkycTools {
    private mediaStream: (MediaStream | null) = null;
    private foreverScanTimeout: any;
    private currentFacingMode: string = 'environment';
    private latestBlob: (Blob | null) = null;
    private readonly hasCheckIDCard: boolean = false;
    private faceDetector: (FaceDetector | null) = null;

    public constructor(idCardModelUrl?: string) {
        if (idCardModelUrl) this.hasCheckIDCard = true;
    }

    public getImage(options: EkycToolOptions = {
        enableCapture: true,
        enableFilePicker: true,
        enableSwitchCamera: true,
        ratio: 0.6,
        facingMode: 'environment'
    }): Promise<Blob | null> {
        return new Promise((resolve) => {
            const container = this.createBasicLayout(options, this.handleDetectObject.bind(this));
            container.querySelector('.ekyct-close-btn')?.addEventListener('click', evt => {
                evt.preventDefault();
                this.closeEkycWindow(container);
                resolve(null);
            });
            if (options.enableFilePicker) {
                this.handleFilePicker(container, 'image/png,image/jpeg', file => {
                    resolve(file);
                });
            }
            if (options.enableCapture) {
                this.handleCapture(container, file => {
                    this.closeEkycWindow(container);
                    resolve(file)
                });
            }
            document.body.appendChild(container);
        })
    }

    public getVideo(options: EkycToolOptions = {
        enableRecord: true,
        enableSwitchCamera: true,
        facingMode: 'user'
    }): Promise<Blob | null> {
        return new Promise((resolve) => {
            const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
            const detectorConfig: MediaPipeFaceDetectorMediaPipeModelConfig = {
                runtime: 'mediapipe',
                solutionPath: '../node_modules/@mediapipe/face_detection'
            };
            faceDetection.createDetector(model, detectorConfig).then(detector => {
                this.faceDetector = detector;
                console.log(detector);
            });
            const container = this.createBasicLayout(options, this.handleDetectFace.bind(this));
            container.querySelector('.ekyct-close-btn')?.addEventListener('click', evt => {
                evt.preventDefault();
                this.closeEkycWindow(container);
                resolve(null);
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

    private handleCapture(container: HTMLDivElement, callback: OnBlob) {
        container.querySelector('.ekyct-capture-btn')?.addEventListener('click', evt => {
            evt.preventDefault();
            if (this.latestBlob) {
                callback(this.latestBlob)
            }
        });
    }

    private async handleDetectObject(captureRegionEl: HTMLDivElement) {
        const canvasEl = captureRegionEl.querySelector('.ekyct-canvas');
        if (canvasEl) {
            return true;
        }
        return false;
    }

    private async handleDetectFace(captureRegionEl: HTMLDivElement) {
        if (this.faceDetector) {
            const canvasEl = captureRegionEl.querySelector('.ekyct-canvas');
            if (canvasEl) {
                const canvasElement = canvasEl as HTMLCanvasElement;
                const faces = await this.faceDetector.estimateFaces(canvasElement);
                if (faces.length === 1) {
                    const face = faces[0];
                    const width = face.box.width;
                    const height = face.box.height;
                    const eyeKeypoints = face.keypoints.filter(kp => kp.name == 'rightEye' || kp.name == 'leftEye');
                    let rs = true;
                    eyeKeypoints.forEach(kp => {
                        if (kp.x >= width || kp.x <= 20
                            || kp.y >= (height / 2) || kp.y <= 20) {
                            rs = false;
                        }
                    });
                    console.log(face, rs);
                    return rs;
                }
                return true;
            }
        }
        return false;
    }

    private foreverScan(captureRegionEl: HTMLDivElement, scanCallback: ScanCallback) {
        const shadingEl = captureRegionEl.querySelector('.ekyct-shading');
        const videoEl = captureRegionEl.querySelector('.ekyct-video');
        const canvasEl = captureRegionEl.querySelector('.ekyct-canvas');
        if (shadingEl && videoEl && canvasEl) {
            const videoElement = videoEl as HTMLVideoElement;
            const shadingElement = shadingEl as HTMLDivElement;
            const canvasElement = canvasEl as HTMLCanvasElement;
            const widthRatio = videoElement.videoWidth / videoElement.clientWidth;
            const heightRatio = videoElement.videoHeight / videoElement.clientHeight;
            const borderX = parseInt(shadingElement.style.borderLeftWidth.slice(0, -2));
            const borderY = parseInt(shadingElement.style.borderTopWidth.slice(0, -2));
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
        scanCallback(captureRegionEl).then(rs => {
            if (rs) {
                const canvasEl = captureRegionEl.querySelector('.ekyct-canvas');
                if (canvasEl) {
                    (canvasEl as HTMLCanvasElement).toBlob(blob => this.latestBlob = blob);
                }
            };
            this.foreverScanTimeout = setTimeout(() => {
                this.foreverScan(captureRegionEl, scanCallback);
            }, 100);
        });
    }

    private createBasicLayout(options: EkycToolOptions, scanCallback: ScanCallback) {
        this.validateEkycToolOptions(options);
        const container = document.createElement('div');
        const containerInner = document.createElement('div');
        containerInner.className = 'ekyct-container--inner';
        containerInner.insertAdjacentHTML('beforeend', EkycStyleHTML);
        container.className = 'ekyct-container';
        const captureRegion = document.createElement('div');
        captureRegion.dataset['ratio'] = options.ratio?.toString();
        captureRegion.className = "ekyct-capture-region";
        const footer = this.createFooter(options);
        containerInner.appendChild(this.createHeader());
        containerInner.appendChild(captureRegion);
        containerInner.appendChild(footer);
        container.appendChild(containerInner);
        this.getFacingMode().then(facingMode => {
            console.log('facing mode is: ' + facingMode);
            if (options.enableSwitchCamera && facingMode == 'both') {
                footer.querySelector('.ekyct-switchcam-btn')?.addEventListener('click', evt => {
                    evt.preventDefault();
                    this.clearScanTimeout();
                    this.disableFooterButtons(footer);
                    this.toggleFacingMode();
                    this.insertVideoElement(captureRegion, facingMode, this.currentFacingMode).then(() => {
                        this.foreverScan(captureRegion, scanCallback);
                        this.enableFooterButtons(footer);
                    });
                })
            } else {
                footer.querySelector('.ekyct-switchcam-btn')?.remove();
            }
            if (facingMode) {
                this.insertVideoElement(captureRegion, facingMode, options.facingMode).then(() => {
                    Utils.handleScreen(containerInner);
                    this.foreverScan(captureRegion, scanCallback);
                    this.enableFooterButtons(footer);
                });
            } else {
                if (options.enableCapture) footer.querySelector('.ekyct-capture-btn')?.remove();
                if (options.enableRecord) footer.querySelector('.ekyct-record-btn')?.remove();
                captureRegion.appendChild(this.createNotHasCamElement());
            }
        });
        // screen.orientation.addEventListener('change', this.handleOrientationChange);
        //window.addEventListener('orientationchange', this.handleOrientationChange);
        return container;
    }

    private enableFooterButtons(footer: HTMLDivElement) {
        const switchcamBtn = footer.querySelector('.ekyct-switchcam-btn');
        const captureBtn = footer.querySelector('.ekyct-capture-btn');
        if (switchcamBtn) {
            (switchcamBtn as HTMLButtonElement).disabled = false;
        }
        if (!this.hasCheckIDCard && captureBtn) {
            (captureBtn as HTMLButtonElement).disabled = false;
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

    private validateEkycToolOptions(options: EkycToolOptions) {
        if (!options.enableCapture) options.enableCapture = false;
        if (!options.enableFilePicker) options.enableFilePicker = false;
        if (!options.enableRecord) options.enableRecord = false;
        if (!options.enableSwitchCamera) options.enableSwitchCamera = false;
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

    private async getFacingMode() {
        try {
            let devices = await navigator.mediaDevices.enumerateDevices();
            console.log(devices)
            let cameras = devices.filter(function (device) {
                return device.kind == 'videoinput';
            });
            if (cameras.length > 1) {
                return 'both';
            }
            if (cameras.length > 0) {
                return 'user';
            }
            return null;
        } catch (err) {
            console.error(err);
            return null;
        }
        //return 'both';
    }

    private async insertVideoElement(parentEl: HTMLDivElement, currentFacingMode?: string, facingMode = 'environment') {
        if (currentFacingMode) {
            currentFacingMode = currentFacingMode == facingMode || currentFacingMode == 'both' ? facingMode : currentFacingMode;
            this.clearMediaStream();
            parentEl.querySelector('.ekyct-video')?.remove();
            const videoEl = await this.createVideoElement({ facingMode: currentFacingMode });
            this.currentFacingMode = currentFacingMode;
            parentEl.appendChild(videoEl);
            return {
                videoWidth: videoEl.clientWidth,
                videoHeight: videoEl.clientHeight
            };
        }
        return null;
    }

    private closeEkycWindow(container: HTMLDivElement) {
        this.clearMediaStream();
        this.clearScanTimeout();
        document.body.removeChild(container);
    }

    private clearMediaStream() {
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => {
                this.mediaStream?.removeTrack(track);
                track.stop();
            });
        }
    }

    private clearScanTimeout() {
        if (this.foreverScanTimeout) {
            clearTimeout(this.foreverScanTimeout);
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

    private createFooter(options: EkycToolOptions) {
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
        if (options.enableCapture) {
            const captureButton = document.createElement('button');
            captureButton.disabled = true;
            captureButton.className = 'ekyct-btn ekyct-capture-btn';
            captureButton.innerHTML = EkycCaptureBtnSVG;
            footerInner.appendChild(captureButton);
        }
        if (options.enableRecord) {
            const recordButton = document.createElement('button');
            recordButton.disabled = true;
            recordButton.className = 'ekyct-btn ekyct-record-btn';
            recordButton.innerHTML = EkycRecordBtnSVG;
            footerInner.appendChild(recordButton);
        }
        if (options.enableSwitchCamera) {
            const switchCamButton = document.createElement('button');
            switchCamButton.disabled = true;
            switchCamButton.className = 'ekyct-btn ekyct-switchcam-btn';
            switchCamButton.innerHTML = EkycSwitchCamSVG;
            footerInner.appendChild(switchCamButton);
        }
        footer.appendChild(footerInner);
        return footer;
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