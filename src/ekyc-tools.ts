import { EkycCamErrorSVG, EkycCaptureBtnSVG, EkycCloseBtnSVG, EkycFileBtnSVG, EkycRecordBtnSVG, EkycStyleHTML, EkycSwitchCamSVG } from './ekyc-asset';
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
    private shardBorderSmallSize = 5;
    private shardBorderLargeSize = 40;
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
            const container = this.createBasicLayout(options, this.handleDetectFace.bind(this));
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

    private async handleDetectFace(captureRegionEl: HTMLDivElement) {
        if (this.faceDetector) {
            const canvasEl = captureRegionEl.querySelector('.ekyct-canvas');
            if (canvasEl) {
                const canvasElement = canvasEl as HTMLCanvasElement;
                const faces = await this.faceDetector.estimateFaces(canvasElement);
                if(faces.length === 1) {
                    const face = faces[0];
                    const width = face.box.width;
                    const height = face.box.height;
                    const eyeKeypoints = face.keypoints.filter(kp => kp.name == 'rightEye' || kp.name == 'leftEye');
                    let rs = true;
                    eyeKeypoints.forEach(kp => {
                        if(kp.x >= width || kp.x <= 20
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
        container.insertAdjacentHTML('beforeend', EkycStyleHTML);
        container.className = 'ekyct-container';
        const captureRegion = document.createElement('div');
        captureRegion.className = "ekyct-capture-region";
        const footer = this.createFooter(options);
        container.appendChild(this.createHeader());
        container.appendChild(captureRegion);
        container.appendChild(footer);
        this.getFacingMode().then(facingMode => {
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
                    this.insertShadingElement(captureRegion, options.ratio!);
                    this.insertCanvasElement(captureRegion);
                    this.foreverScan(captureRegion, scanCallback);
                    this.enableFooterButtons(footer);
                });
            } else {
                if (options.enableCapture) footer.querySelector('.ekyct-capture-btn')?.remove();
                if (options.enableRecord) footer.querySelector('.ekyct-record-btn')?.remove();
                captureRegion.appendChild(this.createNotHasCamElement());
            }
        });
        window.addEventListener('resize', () => {
            this.insertShadingElement(captureRegion, options.ratio!);
            this.insertCanvasElement(captureRegion);
        })
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

    private insertShadingElement(parent: HTMLDivElement, rate: number) {
        const videoEl = parent.querySelector('.ekyct-video') as HTMLVideoElement;
        if (videoEl) {
            parent.querySelector('.ekyct-shading')?.remove();
            const videoWidth = videoEl.clientWidth;
            const videoHeight = videoEl.clientHeight;
            const shadingElement = document.createElement("div");
            shadingElement.className = 'ekyct-shading';
            shadingElement.style.width = `${videoWidth}px`;
            shadingElement.style.height = `${videoHeight}px`;
            const left = (parent.clientWidth - videoWidth) / 2 + 'px';
            const top = (parent.clientHeight - videoHeight) / 2 + 'px'
            shadingElement.style.top = top;
            shadingElement.style.left = left;
            const borderSize = this.getShadingBorderSize(videoEl, rate);
            shadingElement.style.borderLeftWidth = `${borderSize.borderX}px`;
            shadingElement.style.borderRightWidth = `${borderSize.borderX}px`;
            shadingElement.style.borderTopWidth = `${borderSize.borderY}px`;
            shadingElement.style.borderBottomWidth = `${borderSize.borderY}px`;
            this.insertShaderBorders(shadingElement, this.shardBorderLargeSize, this.shardBorderSmallSize, -this.shardBorderSmallSize, null, 0, true);
            this.insertShaderBorders(shadingElement, this.shardBorderLargeSize, this.shardBorderSmallSize, -this.shardBorderSmallSize, null, 0, false);
            this.insertShaderBorders(shadingElement, this.shardBorderLargeSize, this.shardBorderSmallSize, null, -this.shardBorderSmallSize, 0, true);
            this.insertShaderBorders(shadingElement, this.shardBorderLargeSize, this.shardBorderSmallSize, null, -this.shardBorderSmallSize, 0, false);
            this.insertShaderBorders(shadingElement, this.shardBorderSmallSize, this.shardBorderLargeSize + this.shardBorderSmallSize, -this.shardBorderSmallSize, null, -this.shardBorderSmallSize, true);
            this.insertShaderBorders(shadingElement, this.shardBorderSmallSize, this.shardBorderLargeSize + this.shardBorderSmallSize, null, -this.shardBorderSmallSize, -this.shardBorderSmallSize, true);
            this.insertShaderBorders(shadingElement, this.shardBorderSmallSize, this.shardBorderLargeSize + this.shardBorderSmallSize, -this.shardBorderSmallSize, null, -this.shardBorderSmallSize, false);
            this.insertShaderBorders(shadingElement, this.shardBorderSmallSize, this.shardBorderLargeSize + this.shardBorderSmallSize, null, -this.shardBorderSmallSize, -this.shardBorderSmallSize, false);
            parent.appendChild(shadingElement);
        }
    }

    private getShadingBorderSize(videoEl: HTMLVideoElement, rate: number) {
        let videoWidth = videoEl.clientWidth;
        let videoHeight = videoEl.clientHeight;
        let borderX: number, borderY: number;
        if (videoWidth < 576) {
            borderX = 20;
        } else if (videoWidth < 768) {
            borderX = 40;
        } else {
            borderX = 60;
        }
        let width = videoWidth - 2 * borderX;
        let height = width * rate;
        if (height > videoHeight) {
            height = videoHeight;
            width = height / rate;
            borderX = (videoWidth - width) / 2;
        }
        borderY = (videoHeight - height) / 2;
        if (borderX < this.shardBorderSmallSize) {
            borderX = this.shardBorderSmallSize;
            width = videoWidth - borderX * 2;
            borderY = (videoHeight - (width * rate)) / 2;
        }
        if (borderY < this.shardBorderSmallSize) {
            borderY = this.shardBorderSmallSize;
            height = videoHeight - borderY * 2;
            borderX = (videoWidth - (height / rate)) / 2;
        }
        return {
            borderX,
            borderY
        };
    }

    private insertShaderBorders(
        shaderElem: HTMLDivElement,
        width: number,
        height: number,
        top: number | null,
        bottom: number | null,
        side: number,
        isLeft: boolean) {
        const elem = document.createElement("div");
        elem.className = 'ekyct-shader-border';
        elem.style.width = `${width}px`;
        elem.style.height = `${height}px`;
        if (top !== null) {
            elem.style.top = `${top}px`;
        }
        if (bottom !== null) {
            elem.style.bottom = `${bottom}px`;
        }
        if (isLeft) {
            elem.style.left = `${side}px`;
        } else {
            elem.style.right = `${side}px`;
        }
        shaderElem.appendChild(elem);
    }

    private insertCanvasElement(parent: HTMLDivElement) {
        const shadingEl = parent.querySelector('.ekyct-shading');
        const videoEl = parent.querySelector('.ekyct-video');
        if (videoEl && shadingEl) {
            parent.querySelector('.ekyct-canvas')?.remove();
            const shadingDivEl = shadingEl as HTMLDivElement;
            const width = videoEl.clientWidth - parseInt(shadingDivEl.style.borderLeftWidth.slice(0, -2)) * 2;
            const height = videoEl.clientHeight - parseInt(shadingDivEl.style.borderTopWidth.slice(0, -2)) * 2;
            const canvasElement = document.createElement('canvas');
            canvasElement.className = 'ekyct-canvas';
            canvasElement.style.width = `${width}px`;
            canvasElement.style.height = `${height}px`;
            canvasElement.style.display = "none";
            parent.appendChild(canvasElement);
        }
    }

    private async getFacingMode() {
        try {
            let devices = await navigator.mediaDevices.enumerateDevices();
            let cameras = devices.filter(function (device) {
                return device.kind == 'videoinput' && device.label;
            });
            if (cameras.length > 0) {
                let hasFrontCamera = cameras.some(function (camera) {
                    return camera.label.toLowerCase().includes('front') || camera.label.toLowerCase().includes('selfie');
                });
                let hasBackCamera = cameras.some(function (camera) {
                    return camera.label.toLowerCase().includes('back') || camera.label.toLowerCase().includes('rear');
                });
                if (hasFrontCamera && hasBackCamera) {
                    return 'both';
                } else if (hasBackCamera) {
                    return 'environment';
                } else {
                    return 'user';
                }
            }
            return null;
        } catch (err) {
            console.error(err);
            return null;
        }
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
            videoElement.style.width = '100%';
            videoElement.style.display = "block";
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