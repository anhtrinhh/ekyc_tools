import { createDetector, SupportedModels, MediaPipeFaceDetectorMediaPipeModelConfig } from '@tensorflow-models/face-detection';

export class Utils {
    private static insertAlertTimeout: any = null;
    public static shardBorderLargeSize = 40;
    public static shardBorderSmallSize = 5;
    public static handleScreen(captureRegion: HTMLDivElement) {
        const container = captureRegion.closest('.ekyct-container--inner') as HTMLDivElement;
        if (container.clientWidth >= container.clientHeight) container.classList.add('ekyct-container--rotate');
        else container.classList.remove('ekyct-container--rotate');
        if (captureRegion) {
            const ratio = parseFloat(captureRegion.dataset['shadingRatio'] || '0')
            const shardingEl = this.insertShadingElement(captureRegion, ratio);
            this.insertCanvasElement(captureRegion);
            if (shardingEl) {
                const header = container.querySelector('.ekyct-header') as HTMLDivElement;
                const shadingElHeight = parseFloat(shardingEl.style.height.slice(0, -2))
                if (header && container.classList.contains('ekyct-container--rotate')) header.style.height = `${shadingElHeight}px`;
                else header.style.height = 'unset';
            }
        }
    }

    private static insertCanvasElement(parent: HTMLDivElement) {
        const shadingEl = parent.querySelector('.ekyct-shading') as HTMLDivElement;
        const videoEl = parent.querySelector('.ekyct-video');
        if (videoEl) {
            let borderX = 0, borderY = 0, baseWidth = parent.clientWidth,
                baseHeight = this.getCaptureRegionHeight(parent);
            if (shadingEl) {
                borderX = parseFloat(shadingEl.style.borderLeftWidth.slice(0, -2)) * 2;
                borderY = parseFloat(shadingEl.style.borderTopWidth.slice(0, -2)) * 2;
                baseWidth = parseFloat(shadingEl.style.width.slice(0, -2));
                baseHeight = parseFloat(shadingEl.style.height.slice(0, -2));
            }
            parent.querySelector('.ekyct-canvas')?.remove();
            const width = baseWidth - borderX;
            const height = baseHeight - borderY;
            const canvasElement = document.createElement('canvas');
            canvasElement.className = 'ekyct-canvas';
            canvasElement.style.width = `${width}px`;
            canvasElement.style.height = `${height}px`;
            canvasElement.style.display = "none";
            parent.appendChild(canvasElement);
            return canvasElement;
        }
        return null;
    }

    private static insertShadingElement(parent: HTMLDivElement, rate: number) {
        const videoEl = parent.querySelector('.ekyct-video') as HTMLVideoElement;
        if (videoEl && rate > 0) {
            parent.querySelector('.ekyct-shading')?.remove();
            let baseWidth = videoEl.clientWidth;
            let baseHeight = this.getCaptureRegionHeight(parent);
            const shadingElement = document.createElement("div");
            shadingElement.className = 'ekyct-shading';
            shadingElement.style.width = `${baseWidth}px`;
            shadingElement.style.height = `${baseHeight}px`;
            const borderSize = this.getShadingBorderSize(baseWidth, baseHeight, rate);
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
            this.insertCircleRegion(shadingElement);
            parent.appendChild(shadingElement);
            return shadingElement;
        }
        return null;
    }

    private static insertShaderBorders(
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

    private static getShadingBorderSize(baseWidth: number, baseHeight: number, rate: number) {
        const [width, height] = Utils.adjustExactRatio([baseWidth, baseHeight, rate]);
        let borderX = (baseWidth - width) / 2;
        let borderY = (baseHeight - height) / 2;
        if (borderY < this.shardBorderSmallSize * 3) {
            borderX += this.shardBorderSmallSize * 3 - borderY;
            borderY = this.shardBorderSmallSize * 3;
        }
        if (borderX < this.shardBorderSmallSize * 3) {
            borderY += this.shardBorderSmallSize * 3 - borderX;
            borderX = this.shardBorderSmallSize * 3;
        }
        return {
            borderX,
            borderY
        };
    }

    public static insertAlert(parentEl: HTMLDivElement, text: string, type = 'warning') {
        if (parentEl) {
            let alertEl = parentEl.querySelector('.ekyct-alert');
            if (alertEl) {
                if (alertEl.innerHTML !== text) {
                    if (alertEl.classList.contains('active') && !Utils.insertAlertTimeout) alertEl.classList.remove('active');
                    if (!Utils.insertAlertTimeout) Utils.setInsertAlertTimeout(alertEl, text, 2200, 200);
                }
            } else {
                alertEl = document.createElement('div');
                alertEl.className = `ekyct-alert ${type}`;
                parentEl.appendChild(alertEl);
                if (!alertEl.classList.contains('active') && !Utils.insertAlertTimeout) Utils.setInsertAlertTimeout(alertEl, text, 2020, 20);
            }
        }
    }

    public static cleanAlert(parentEl: HTMLDivElement) {
        let alertEl = parentEl.querySelector('.ekyct-alert');
        if (alertEl && alertEl.classList.contains('active')) {
            if (Utils.insertAlertTimeout) {
                setTimeout(() => {
                    alertEl!.classList.remove('active');
                    setTimeout(() => {
                        alertEl!.remove();
                    }, 200);
                }, 400);
            } else {
                alertEl.classList.remove('active');
                setTimeout(() => {
                    alertEl!.remove();
                }, 200);
            }
        }
    }

    private static setInsertAlertTimeout(alertEl: Element, text: string, innerTimeoutms: number, outerTimeoutMs: number) {
        Utils.insertAlertTimeout = setTimeout(() => {
            alertEl.classList.add('active');
            alertEl.innerHTML = text;
            setTimeout(() => {
                Utils.clearInsertAlertTimeout();
            }, innerTimeoutms);
        }, outerTimeoutMs);
    }

    private static clearInsertAlertTimeout() {
        if (Utils.insertAlertTimeout) {
            clearTimeout(Utils.insertAlertTimeout);
            Utils.insertAlertTimeout = null;
        }
    }

    public static delay(delayInMS: number) {
        return new Promise((resolve) => {
            setTimeout(resolve, delayInMS);
        });
    }

    public static toggleLoader(isOpen = true, parentEl: Element | null = document.body) {
        if (parentEl) {
            const existsLoader = parentEl.querySelector('.ekyct-loader');
            if (existsLoader) existsLoader.remove();
            if (isOpen) {
                const loader = Utils.createLoaderElement();
                parentEl.appendChild(loader);
            }
        }
    }

    public static toggleLoaderOnCaptureRegion(isOpen = true, captureRegion: Element | null) {
        if (captureRegion) {
            if (isOpen) captureRegion.classList.add('ekyct-hide-shading');
            else captureRegion.classList.remove('ekyct-hide-shading');
            this.toggleLoader(isOpen, captureRegion);
        }
    }

    private static insertCircleRegion(parentEl: HTMLDivElement) {
        const circleRegion = document.createElement('div');
        const parentWidth = parseFloat(parentEl.style.width.slice(0, -2));
        const parentBorderXWidth = parseFloat(parentEl.style.borderLeftWidth.slice(0, -2));
        const width = parentWidth - parentBorderXWidth * 2;
        circleRegion.className = 'ekyct-circle-region';
        for (let i = 0; i < 100; i++) {
            const pointEl = document.createElement('div');
            pointEl.className = 'ekyct-circle-region-point';
            circleRegion.appendChild(pointEl);
            pointEl.style.transform = `rotate(${i * 3.6}deg) translateY(${width / 2 - 10}px)`;
        }
        parentEl.appendChild(circleRegion);
    }

    private static createLoaderElement() {
        const loaderDiv = document.createElement('div');
        loaderDiv.className = 'ekyct-loader';
        const loaderContentDiv = document.createElement('div');
        loaderContentDiv.className = 'ekyct-loader-content';
        for (let i = 1; i <= 10; i++) {
            const dotSpan = document.createElement('span');
            dotSpan.setAttribute('style', '--i:' + i);
            loaderContentDiv.appendChild(dotSpan);
        }
        loaderDiv.appendChild(loaderContentDiv);
        return loaderDiv;
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

    public static async getCapabilitiesOfFacingMode(facingMode: string) {
        if (facingMode !== 'environment' && facingMode !== 'user') return undefined;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    facingMode: {
                        exact: facingMode
                    }
                }
            });
            const [track] = stream.getVideoTracks();
            const capabilities = track.getCapabilities();
            Utils.clearMediaStream(stream);
            return capabilities;
        } catch (err) {
            return undefined;
        }
    }

    public static async getCapabilitiesBothCam() {
        let frontCamCapabilities = await Utils.getCapabilitiesOfFacingMode('user');
        let rearCamCapabilities = await Utils.getCapabilitiesOfFacingMode('environment');
        const hasBoth = frontCamCapabilities !== undefined || rearCamCapabilities !== undefined;
        let mediaStream: MediaStream | null = null;
        if (hasBoth) {
            if (!frontCamCapabilities) {
                mediaStream = await navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: {
                        facingMode: 'user'
                    }
                });
                const [track] = mediaStream.getVideoTracks();
                frontCamCapabilities = track.getCapabilities();
            } else if (!rearCamCapabilities) {
                mediaStream = await navigator.mediaDevices.getUserMedia({
                    audio: false,
                    video: {
                        facingMode: 'environment'
                    }
                });
                const [track] = mediaStream.getVideoTracks();
                rearCamCapabilities = track.getCapabilities();
            }
        } else {
            mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: true
            });
            const [track] = mediaStream.getVideoTracks();
            frontCamCapabilities = track.getCapabilities();
        }
        Utils.clearMediaStream(mediaStream);
        return {
            hasBoth,
            frontCamCapabilities,
            rearCamCapabilities
        }
        // return hasRearCamera && hasFrontCamera;
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

    public static getVideoRatios(videoEl: HTMLVideoElement, maxRatio?: number) {
        const originWidthRatio = videoEl.videoWidth / videoEl.clientWidth;
        const originHeightRatio = videoEl.videoHeight / videoEl.clientHeight;
        let newWidthRatio = originWidthRatio;
        let newHeightRatio = originHeightRatio;
        if (typeof maxRatio === 'number' && maxRatio > 0) {
            if (originWidthRatio >= originHeightRatio) {
                if (originWidthRatio > maxRatio) {
                    const ratio = originWidthRatio / originHeightRatio;
                    newWidthRatio = maxRatio;
                    newHeightRatio = maxRatio / ratio;
                }
            } else {
                if (originHeightRatio > maxRatio) {
                    const ratio = originHeightRatio / originWidthRatio;
                    newHeightRatio = maxRatio;
                    newWidthRatio = maxRatio / ratio;
                }
            }
        }
        return { originWidthRatio, originHeightRatio, newWidthRatio, newHeightRatio };
    }

    public static getCaptureRegionHeight(captureRegionEl: HTMLDivElement) {
        const container = captureRegionEl.closest('.ekyct-container--inner') as HTMLDivElement;
        const videoEl = captureRegionEl.querySelector('.ekyct-video');
        let headerAndFooterHeight = 180;
        if (container.classList.contains('ekyct-container--rotate')) headerAndFooterHeight = 0;
        let baseHeight = window.innerHeight - headerAndFooterHeight;
        if (videoEl) {
            if (baseHeight > videoEl.clientHeight) baseHeight = videoEl.clientHeight;
        }
        return baseHeight;
    }

    public static async createFaceDetector() {
        try {
            const model = SupportedModels.MediaPipeFaceDetector;
            const detectorConfig: MediaPipeFaceDetectorMediaPipeModelConfig = {
                runtime: 'mediapipe',
                solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_detection'
            };
            return await createDetector(model, detectorConfig);
        } catch (err) {
            console.error(err);
            return undefined;
        }
    }

    public static getCanvasContextWidth(videoEl: HTMLVideoElement, shadingEl: HTMLDivElement, captureRegionWidth: number, maxCanvasRatio?: number) {
        let borderX = 0, baseWidth = captureRegionWidth;
        if (shadingEl) {
            borderX = parseFloat(shadingEl.style.borderLeftWidth.slice(0, -2));
            baseWidth = parseFloat(shadingEl.style.width.slice(0, -2));
        }
        const { newWidthRatio } = Utils.getVideoRatios(videoEl, maxCanvasRatio);
        const qrRegionWidth = baseWidth - borderX * 2;
        let canvasContextWidth = Math.round(qrRegionWidth * newWidthRatio);
        /* Fix lỗi một số thiết bị không record được khi canvas width hoặc canvas height là số lẻ */
        if (canvasContextWidth % 2 !== 0) canvasContextWidth -= 1;
        return canvasContextWidth;
    }

    public static getInnerElementsInCaptureDiv(captureRegionEl: HTMLDivElement) {
        const canvasEl = captureRegionEl.querySelector('.ekyct-canvas') as HTMLCanvasElement;
        const videoEl = captureRegionEl.querySelector('.ekyct-video') as HTMLVideoElement;
        const shadingEl = captureRegionEl.querySelector('.ekyct-shading') as HTMLDivElement;
        return {
            canvasEl,
            videoEl,
            shadingEl
        }
    }
}