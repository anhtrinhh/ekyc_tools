import { EkycCamErrorSVG, EkycCaptureBtnSVG, EkycCloseBtnSVG, EkycFileBtnSVG, EkycRecordBtnSVG, EkycStyleHTML, EkycSwitchCamSVG } from './ekyc-asset';

export interface EkycToolOptions {
    ratio?: number,
    enableFilePicker?: boolean,
    enableCapture?: boolean,
    enableRecord?: boolean,
    enableSwitchCamera?: boolean
}

export class EkycTools {
    private mediaStream!: MediaStream;
    private shardBorderSmallSize = 5;
    private shardBorderLargeSize = 40;
    private foreverScanTimeout: any;

    public getImage(options: EkycToolOptions = {
        enableCapture: true,
        enableFilePicker: true,
        enableSwitchCamera: true,
        ratio: 0.6
    }): Promise<Blob | null> {
        return new Promise((resolve) => {
            const container = this.createBasicLayout(options);
            container.querySelector('.ekyct-btn')?.addEventListener('click', evt => {
                evt.preventDefault();
                this.closeEkycWindow(container);
                resolve(null);
            });
            document.body.appendChild(container);
            //resolve(new Blob());
        })
    }

    public getVideo(options: EkycToolOptions = {
        enableRecord: true,
        enableSwitchCamera: true
    }): Promise<Blob | null> {
        return new Promise((resolve) => {
            const container = this.createBasicLayout(options);
            container.querySelector('.ekyct-btn')?.addEventListener('click', evt => {
                evt.preventDefault();
                this.closeEkycWindow(container);
                resolve(null);
            });
            document.body.appendChild(container);
            //resolve(new Blob());
        })
    }

    private foreverScan(captureRegionEl: HTMLDivElement) {
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
            let imageEl = document.getElementById('img-id') as HTMLImageElement;
            imageEl.src = canvasElement.toDataURL();
        }
        const triggerNextScan = () => {
            this.foreverScanTimeout = setTimeout(() => {
                this.foreverScan(captureRegionEl);
            }, 100);
        };
        this.scanContext().then(() => {
            triggerNextScan();
        }).catch((error) => {
            console.error("Error happend while scanning context", error);
            triggerNextScan();
        });
    }

    private scanContext(): Promise<boolean> {
        return new Promise(resolve => resolve(true));
    }

    private createBasicLayout(options: EkycToolOptions) {
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
            if (options.enableSwitchCamera && facingMode != 'both') {
                footer.querySelector('.ekyct-switchcam-btn')?.remove();
            }
            if (facingMode) {
                this.insertVideoElement(captureRegion, facingMode).then(() => {
                    this.insertShadingElement(captureRegion, options.ratio!);
                    this.insertCanvasElement(captureRegion);
                    this.foreverScan(captureRegion);
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

    private validateEkycToolOptions(options: EkycToolOptions) {
        if (!options.enableCapture) options.enableCapture = false;
        if (!options.enableFilePicker) options.enableFilePicker = false;
        if (!options.enableRecord) options.enableRecord = false;
        if (!options.enableSwitchCamera) options.enableSwitchCamera = false;
        if (!options.ratio) options.ratio = 1;
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
                return device.kind == 'videoinput';
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
            const videoEl = await this.createVideoElement({ facingMode: currentFacingMode });
            parentEl.appendChild(videoEl);
            return {
                videoWidth: videoEl.clientWidth,
                videoHeight: videoEl.clientHeight
            };
        }
        return null;
    }

    private closeEkycWindow(container: HTMLDivElement) {
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => {
                this.mediaStream.removeTrack(track);
                track.stop();
            });
        }
        if (this.foreverScanTimeout) {
            clearTimeout(this.foreverScanTimeout);
        }
        document.body.removeChild(container);
    }

    private createHeader() {
        const header = document.createElement('div');
        header.className = 'ekyct-header';
        const headerInner = document.createElement('div');
        headerInner.className = 'ekyct-header--inner';
        const closeButton = document.createElement('button');
        closeButton.className = 'ekyct-btn';
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
            fileButton.className = 'ekyct-btn';
            fileButton.innerHTML = EkycFileBtnSVG;
            footerInner.appendChild(fileButton);
        }
        if (options.enableCapture) {
            const captureButton = document.createElement('button');
            captureButton.className = 'ekyct-btn ekyct-capture-btn';
            captureButton.innerHTML = EkycCaptureBtnSVG;
            footerInner.appendChild(captureButton);
        }
        if (options.enableRecord) {
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