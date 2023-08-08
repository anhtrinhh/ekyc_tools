export class Utils {
    private static insertAlertTimeout: any = null;
    public static shardBorderLargeSize = 40;
    public static shardBorderSmallSize = 5;
    public static handleScreen(containerInnerEl: Element) {
        const container = containerInnerEl as HTMLDivElement;
        if (container.clientWidth >= container.clientHeight) {
            container.classList.add('ekyct-container--rotate');
        } else {
            container.classList.remove('ekyct-container--rotate');
        }
        const captureRegionDiv = container.querySelector('div.ekyct-capture-region');
        if (captureRegionDiv) {
            const captureRegion = captureRegionDiv as HTMLDivElement;
            const ratio = parseFloat(captureRegion.dataset['shadingRatio'] || '0')
            this.insertShadingElement(captureRegion, ratio);
            this.insertCanvasElement(captureRegion);
        }
    }

    public static insertCanvasElement(parent: HTMLDivElement) {
        const shadingEl = parent.querySelector('.ekyct-shading') as HTMLDivElement;
        const videoEl = parent.querySelector('.ekyct-video');
        let borderX = 0, borderY = 0;
        if (shadingEl) {
            borderX = parseFloat(shadingEl.style.borderLeftWidth.slice(0, -2)) * 2;
            borderY = parseFloat(shadingEl.style.borderTopWidth.slice(0, -2)) * 2;
        }
        if (videoEl) {
            parent.querySelector('.ekyct-canvas')?.remove();
            // const widthRatio = videoEl.videoWidth / videoEl.clientWidth;
            // const heightRatio = videoEl.videoHeight / videoEl.clientHeight;
            // const qrRegionWidth = videoEl.clientWidth - borderX;
            // const qrRegionHeight = videoEl.clientHeight - borderY;
            // const width = qrRegionWidth * widthRatio;
            // const height = qrRegionHeight * heightRatio;
            const width = videoEl.clientWidth - borderX;
            const height = videoEl.clientHeight - borderY;
            const canvasElement = document.createElement('canvas');
            canvasElement.className = 'ekyct-canvas';
            canvasElement.style.width = `${width}px`;
            canvasElement.style.height = `${height}px`;
            canvasElement.style.display = "none";
            parent.appendChild(canvasElement);
        }
    }

    public static insertShadingElement(parent: HTMLDivElement, rate: number) {
        const videoEl = parent.querySelector('.ekyct-video') as HTMLVideoElement;
        if (videoEl && rate > 0) {
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
            this.insertCircleRegion(shadingElement);
            parent.appendChild(shadingElement);
        }
    }

    public static insertShaderBorders(
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

    public static getShadingBorderSize(videoEl: HTMLVideoElement, rate: number) {
        let videoWidth = videoEl.clientWidth;
        let videoHeight = videoEl.clientHeight;
        let borderX: number, borderY: number;
        if (videoWidth < 576) {
            borderX = 16;
        } else if (videoWidth < 768) {
            borderX = 32;
        } else {
            borderX = 48;
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

    public static async checkSupportFacingMode(facingMode: string) {
        if (facingMode !== 'environment' && facingMode !== 'user') return false;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    facingMode: {
                        exact: facingMode
                    }
                }
            });
            Utils.clearMediaStream(stream);
            return true;
        } catch (err) {
            return false;
        }
    }

    public static async checkHasBothFrontAndRearCamera() {
        const hasFrontCamera = await Utils.checkSupportFacingMode('user');
        const hasRearCamera = await Utils.checkSupportFacingMode('environment');
        // return hasRearCamera && hasFrontCamera;
        return hasFrontCamera || hasRearCamera;
    }

    public static clearMediaStream(mediaStream: MediaStream | null) {
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => {
                mediaStream?.removeTrack(track);
                track.stop();
            });
        }
    }
}