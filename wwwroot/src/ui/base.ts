import { EkycStyleHTML, EkycCloseBtnSVG } from "../ekyc-asset";
import { Utils } from "../utils";
import { CameraFactory } from "../camera/factories";
import { RenderedCamera, RenderingCallbacks } from "../camera/core";
import { EkycToolsStrings } from "../strings";
import { CustomEventNames, UIElementClasses } from './constants';
import { LoaderUI } from "./loader";
import { AlertConfig } from "../core";

export interface UILoadHandler {
    (loading: boolean): void
}

export class UI {
    private static insertAlertTimeout: any = null;
    private static shardBorderLargeSize = 40;
    private static shardBorderSmallSize = 5;
    private static delaySetupUIMs = 50;
    public static createBasicLayout(loadHandlers: UILoadHandler[]) {
        const container = document.createElement('div');
        container.className = UIElementClasses.CONTAINER_DIV;
        const containerInner = document.createElement('div');
        containerInner.className = UIElementClasses.CONTAINER_INNER_DIV;
        containerInner.insertAdjacentHTML('beforeend', EkycStyleHTML);
        container.dataset.version = "1.0.0";
        const captureRegion = document.createElement('div');
        captureRegion.className = UIElementClasses.CAPTURE_REGION_DIV;
        LoaderUI.create(captureRegion, loadHandlers);
        const footer = this.createFooter();
        const body = document.createElement('div');
        body.className = UIElementClasses.BODY_DIV;
        body.appendChild(captureRegion);
        containerInner.appendChild(this.createHeader());
        containerInner.appendChild(body);
        containerInner.appendChild(footer);
        container.appendChild(containerInner);
        return container;
    }

    public static handleOnScreenResize(captureRegion: HTMLDivElement) {
        Utils.closestByClassName(UIElementClasses.CONTAINER_DIV, captureRegion)?.dispatchEvent(new CustomEvent(CustomEventNames.UI_LOADING));
        setTimeout(() => {
            this.setupUI(captureRegion);
        }, this.delaySetupUIMs);
    }

    public static setupCamera(parent: HTMLDivElement, videoConstraints?: boolean | MediaTrackConstraints, renderedCamera: RenderedCamera | null = null)
        : Promise<RenderedCamera> {
        const container = Utils.closestByClassName(UIElementClasses.CONTAINER_DIV, parent);
        container?.dispatchEvent(new CustomEvent(CustomEventNames.UI_LOADING));
        let renderingCallbacks: RenderingCallbacks = {
            onRenderSurfaceReady: () => {
                this.setupUI(parent);
            }
        };
        return new Promise((resolve, reject) => {
            if (renderedCamera) {
                renderedCamera.close()
                    .then(() => this.renderCamera(parent, container, renderingCallbacks, resolve, reject, videoConstraints))
                    .catch(err => {
                        container?.dispatchEvent(new CustomEvent(CustomEventNames.UI_LOADED, { detail: { error: err } }));
                        reject(err);
                    });
            } else this.renderCamera(parent, container, renderingCallbacks, resolve, reject, videoConstraints);
        });
    }

    public static setupUI(parent: HTMLDivElement) {
        const containerInner = Utils.closestByClassName(UIElementClasses.CONTAINER_INNER_DIV, parent) as HTMLDivElement;
        if (containerInner.clientWidth >= containerInner.clientHeight) containerInner.classList.add(UIElementClasses.CONTAINER_INNER_ROTATE_DIV);
        else containerInner.classList.remove(UIElementClasses.CONTAINER_INNER_ROTATE_DIV);
        setTimeout(() => {
            const videoEl = Utils.queryByClassName(UIElementClasses.VIDEO, parent);
            const videoClientWidth = videoEl!.clientWidth;
            const videoClientHeight = videoEl!.clientHeight;
            this.insertShadingElement(parent, videoClientWidth, videoClientHeight);
            this.insertCanvasElement(parent, videoClientWidth, videoClientHeight);
            this.insertCircleRegion(parent, videoClientWidth, videoClientHeight);
        }, this.delaySetupUIMs);
    }

    public static getCapture(captureRegion: HTMLElement): Promise<Blob | null> {
        return new Promise((resolve, reject) => {
            const canvas = Utils.queryByClassName(UIElementClasses.CANVAS, captureRegion) as HTMLCanvasElement;
            const video = Utils.queryByClassName(UIElementClasses.VIDEO, captureRegion) as HTMLVideoElement;
            if (video && canvas) {
                const canvasContext = (<any>canvas).getContext("2d", { willReadFrequently: true });
                const shadingEl = Utils.queryByClassName(UIElementClasses.SHADING_DIV, captureRegion) as HTMLDivElement;
                let borderX = 0, borderY = 0, baseWidth = video.clientWidth,
                    baseHeight = captureRegion.clientHeight > video.clientHeight ? video.clientHeight : captureRegion.clientHeight;
                if (shadingEl) {
                    borderX = parseFloat(shadingEl.style.borderLeftWidth.slice(0, -2));
                    borderY = parseFloat(shadingEl.style.borderTopWidth.slice(0, -2));
                    baseWidth = parseFloat(shadingEl.style.width.slice(0, -2));
                    baseHeight = parseFloat(shadingEl.style.height.slice(0, -2));
                }
                const qrRegionWidth = baseWidth - borderX * 2;
                const qrRegionHeight = baseHeight - borderY * 2;
                const widthRatio = video.videoWidth / video.clientWidth;
                const heightRatio = video.videoHeight / video.clientHeight;
                let offsetY = 0;
                if (video.clientHeight > baseHeight) offsetY = (video.clientHeight - baseHeight) / 2
                const sxOffset = Math.round(borderX * widthRatio);
                const syOffset = Math.round((borderY + offsetY) * heightRatio);
                let sWidthOffset = Math.round(qrRegionWidth * widthRatio);
                let sHeightOffset = Math.round(qrRegionHeight * heightRatio);
                if (sWidthOffset % 2 !== 0) sWidthOffset -= 1;
                if (sHeightOffset % 2 !== 0) sHeightOffset -= 1;
                const canvasWidth = parseInt(canvas.style.width.slice(0, -2));
                const canvasHeight = parseInt(canvas.style.height.slice(0, -2));
                canvasContext.canvas.width = canvasWidth;
                canvasContext.canvas.height = canvasHeight;
                canvasContext.drawImage(video, sxOffset, syOffset, sWidthOffset, sHeightOffset, 0, 0, canvasWidth, canvasHeight);
                this.getBlobFromCanvas(canvas, 'image/png').then(rs => {
                    resolve(rs);
                }).catch(err => {
                    reject(err);
                })
            } else reject('Video element is not exists.');
        });
    }

    public static getBlobFromCanvas(canvasElement: HTMLCanvasElement, mimeType: string): Promise<Blob | null> {
        return new Promise(resolve => {
            canvasElement.toBlob(blob => resolve(blob), mimeType);
        })
    }

    public static addAlert(container: HTMLElement, config: AlertConfig) {
        let parentEl = Utils.queryByClassName(UIElementClasses.CAPTURE_REGION_DIV, container);
        if (config.parentSelector) {
            let newParent = container.querySelector(config.parentSelector);
            if (newParent) parentEl = newParent;
        }
        if (parentEl) {
            let alertEl = parentEl.querySelector('.ekyct-alert');
            if (alertEl) {
                if (this.getAlertContent(alertEl) !== config.content) {
                    if (alertEl.classList.contains('active') && !this.insertAlertTimeout) alertEl.classList.remove('active');
                    if (!this.insertAlertTimeout) {
                        this.setAlertContent(alertEl, config.content);
                        if (typeof config.displayTimeout === 'number' && config.displayTimeout >= 1000) this.setInsertAlertTimeout(alertEl, config.displayTimeout + 200, 200);
                        else alertEl.classList.add('active');
                    }
                }
            } else {
                alertEl = this.createAlertElement(config.content, config.title, config.classList, config.enableClose);
                parentEl.appendChild(alertEl);
                if (!alertEl.classList.contains('active') && !this.insertAlertTimeout) {
                    this.setAlertContent(alertEl, config.content);
                    if (typeof config.displayTimeout === 'number' && config.displayTimeout >= 1000) this.setInsertAlertTimeout(alertEl!, config.displayTimeout! + 20, 20);
                    else alertEl.classList.add('active');
                }
            }
        }
    }

    private static createAlertElement(content?: string, title?: string, classList?: string[], allowClose?: boolean) {
        const alertEl = document.createElement('div');
        let classes = ['ekyct-alert'];
        if ((typeof title === 'string' && title.trim().length > 0) || (typeof allowClose === 'boolean' && allowClose)) {
            const alertHeader = document.createElement('div');
            alertHeader.className = 'ekyct-alert-header';
            if (typeof title === 'string') {
                title = title.trim();
                const alertTitle = document.createElement('div');
                alertTitle.className = 'ekyct-alert-title';
                alertHeader.appendChild(alertTitle);
                alertTitle.innerHTML = title;
                classes.push('ekyct-alert-column');
            }
            if (typeof allowClose === 'boolean' && allowClose) {
                const closeButton = document.createElement('button');
                closeButton.className = 'ekyct-btn ekyct-alert-close-btn';
                closeButton.innerHTML = EkycCloseBtnSVG;
                closeButton.addEventListener('click', evt => {
                    evt.preventDefault();
                    alertEl.classList.remove('active');
                }, { once: true });
                alertHeader.appendChild(closeButton);
            }
            alertEl.appendChild(alertHeader);
        }
        const alertBody = document.createElement('div');
        alertBody.className = 'ekyct-alert-body';
        alertEl.appendChild(alertBody);
        if (Array.isArray(classList) && classList.length > 0) classes = [...classes, ...classList];
        if (typeof content === 'string' && content.trim().length > 0) {
            content = content.trim();
            alertBody.innerHTML = content;
        }
        alertEl.classList.add(...classes);
        return alertEl;
    }

    private static getAlertContent(alertEl: Element) {
        const alertBody = alertEl.querySelector('.ekyct-alert-body');
        if (alertBody) return alertBody.innerHTML;
        return '';
    }

    private static setAlertContent(alertEl: Element, content?: string) {
        if (typeof content === 'string' && content.trim().length > 0) {
            const alertBody = alertEl.querySelector('.ekyct-alert-body');
            if (alertBody) alertBody.innerHTML = content;
        }
    }

    private static setInsertAlertTimeout(alertEl: Element, innerTimeoutms: number, outerTimeoutMs: number) {
        this.insertAlertTimeout = setTimeout(() => {
            alertEl.classList.add('active');
            setTimeout(() => {
                this.clearInsertAlertTimeout();
            }, innerTimeoutms);
        }, outerTimeoutMs);
    }

    private static clearInsertAlertTimeout() {
        if (this.insertAlertTimeout) {
            clearTimeout(this.insertAlertTimeout);
            this.insertAlertTimeout = null;
        }
    }

    private static renderCamera(parent: HTMLDivElement,
        container: Element | null,
        renderingCallbacks: RenderingCallbacks,
        resolve: (value: RenderedCamera | PromiseLike<RenderedCamera>) => void,
        reject: (reason?: any) => void,
        videoConstraints?: boolean | MediaTrackConstraints) {
        CameraFactory.failIfNotSupported().then(factory => {
            factory.create(videoConstraints).then(camera => {
                camera.render(parent, renderingCallbacks).then(rCam => {
                    resolve(rCam);
                }).catch(err => {
                    container?.dispatchEvent(new CustomEvent(CustomEventNames.UI_LOADED, { detail: { error: err } }));
                    reject(err);
                });
            }).catch(err => {
                container?.dispatchEvent(new CustomEvent(CustomEventNames.UI_LOADED, { detail: { error: err } }));
                reject(EkycToolsStrings.errorGettingUserMedia(err));
            });
        }).catch(err => {
            container?.dispatchEvent(new CustomEvent(CustomEventNames.UI_LOADED, { detail: { error: err } }));
            reject(EkycToolsStrings.cameraStreamingNotSupported());
        });
    }

    private static insertShadingElement(parent: HTMLDivElement, videoClientWidth: number, videoClientHeight: number) {
        const isRecord = parent.dataset.isRecord;
        if (isRecord === 'false') {
            let ratio = parseFloat(parent.dataset.shadingRatio ?? '0');
            if (isNaN(ratio) || ratio < 0) ratio = 0;
            if (ratio > 0) {
                Utils.queryByClassName(UIElementClasses.SHADING_DIV, parent)?.remove();
                let baseHeight = parent.clientHeight > videoClientHeight ? videoClientHeight : parent.clientHeight;
                const shadingElement = document.createElement("div");
                shadingElement.className = UIElementClasses.SHADING_DIV;
                shadingElement.style.width = `${videoClientWidth}px`;
                shadingElement.style.height = `${baseHeight}px`;
                const borderSize = this.getShadingBorderSize(videoClientWidth, baseHeight, ratio);
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
                return shadingElement;
            }
        }
        return null;
    }

    private static insertCanvasElement(parent: HTMLDivElement, videoClientWidth: number, videoClientHeight: number) {
        let canvasMaxWidth = parseFloat(parent.dataset.canvasMaxWidth ?? '0');
        if (isNaN(canvasMaxWidth) || canvasMaxWidth < 0) canvasMaxWidth = 0;
        if (canvasMaxWidth % 2 !== 0) canvasMaxWidth -= 1;
        let canvasMinWidth = parseFloat(parent.dataset.canvasMinWidth ?? '0');
        if (isNaN(canvasMinWidth) || canvasMinWidth < 0) canvasMinWidth = 0;
        if (canvasMinWidth % 2 !== 0) canvasMinWidth += 1;
        const shadingEl = Utils.queryByClassName(UIElementClasses.SHADING_DIV, parent) as HTMLDivElement;
        let borderX = 0, borderY = 0, baseWidth = videoClientWidth,
            baseHeight = parent.clientHeight > videoClientHeight ? videoClientHeight : parent.clientHeight;
        if (shadingEl) {
            borderX = parseFloat(shadingEl.style.borderLeftWidth.slice(0, -2)) * 2;
            borderY = parseFloat(shadingEl.style.borderTopWidth.slice(0, -2)) * 2;
            baseWidth = parseFloat(shadingEl.style.width.slice(0, -2));
            baseHeight = parseFloat(shadingEl.style.height.slice(0, -2));
        }
        Utils.queryByClassName(UIElementClasses.CANVAS, parent)?.remove();
        let width = baseWidth - borderX;
        let height = baseHeight - borderY;
        if (canvasMaxWidth > 0 && width > canvasMaxWidth) width = canvasMaxWidth;
        else if (canvasMinWidth > 0 && width < canvasMinWidth) width = canvasMinWidth;
        width = Math.floor(width);
        if (width % 2 !== 0) width += 1;
        if (width === canvasMaxWidth || width === canvasMinWidth) height = width * height / (baseWidth - borderX);
        height = Math.floor(height);
        if (height % 2 !== 0) height += 1;
        const canvasElement = document.createElement('canvas');
        canvasElement.className = UIElementClasses.CANVAS;
        canvasElement.style.width = `${width}px`;
        canvasElement.style.height = `${height}px`;
        canvasElement.style.display = "none";
        parent.appendChild(canvasElement);
        Utils.closestByClassName(UIElementClasses.CONTAINER_DIV, parent)?.dispatchEvent(new CustomEvent(CustomEventNames.UI_LOADED, { detail: { canvas: canvasElement } }));
        return canvasElement;
    }

    private static insertCircleRegion(parentEl: HTMLDivElement, videoClientWidth: number, videoClientHeight: number) {
        const isRecord = parentEl.dataset.isRecord;
        if (isRecord === 'true') {
            let circleRegion = Utils.queryByClassName(UIElementClasses.CIRCULAR_PROGRESS_DIV, parentEl) as HTMLElement;
            const parentWidth = parentEl.clientWidth;
            const parentHeight = parentEl.clientHeight;
            const parentSize = parentWidth < parentHeight ? parentWidth : parentHeight;
            const videoSize = videoClientWidth < videoClientHeight ? videoClientWidth : videoClientHeight;
            const width = parentSize < videoSize ? parentSize - 40 : videoSize - 40;
            if (circleRegion) {
                Utils.queryAllByClassName(UIElementClasses.CIRCULAR_PROGRESS_POINT_DIV).forEach((elm, i) => {
                    const pointEl = elm as HTMLElement;
                    pointEl.style.transform = `rotate(${i * 3.6}deg) translateY(${width / 2 - 10}px)`;
                });
            } else {
                circleRegion = document.createElement('div');
                circleRegion.className = UIElementClasses.CIRCULAR_PROGRESS_DIV;
                for (let i = 0; i < 100; i++) {
                    const pointEl = document.createElement('div');
                    pointEl.className = UIElementClasses.CIRCULAR_PROGRESS_POINT_DIV;
                    circleRegion.appendChild(pointEl);
                    pointEl.style.transform = `rotate(${i * 3.6}deg) translateY(${width / 2 - 10}px)`;
                }
                parentEl.appendChild(circleRegion);
            }
            circleRegion.style.width = `${width}px`;
            circleRegion.style.height = `${width}px`;
        }
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

    private static getShadingBorderSize(baseWidth: number, baseHeight: number, ratio: number) {
        const [width, height] = Utils.adjustExactRatio([baseWidth, baseHeight, ratio]);
        let borderX = (baseWidth - width) / 2;
        let borderY = (baseHeight - height) / 2;
        if (borderY < this.shardBorderSmallSize * 4) {
            borderX += this.shardBorderSmallSize * 4 - borderY;
            borderY = this.shardBorderSmallSize * 4;
        }
        if (borderX < this.shardBorderSmallSize * 4) {
            borderY += this.shardBorderSmallSize * 4 - borderX;
            borderX = this.shardBorderSmallSize * 4;
        }
        return {
            borderX,
            borderY
        };
    }

    private static createHeader() {
        const header = document.createElement('div');
        header.className = 'ekyct-header';
        const headerInner = document.createElement('div');
        headerInner.className = 'ekyct-header--inner';
        const closeButton = document.createElement('button');
        closeButton.className = `ekyct-btn ${UIElementClasses.CLOSE_BTN}`;
        closeButton.disabled = true;
        closeButton.innerHTML = EkycCloseBtnSVG;
        headerInner.appendChild(closeButton);
        header.appendChild(headerInner);
        return header;
    }

    private static createFooter() {
        const footer = document.createElement('div');
        footer.className = UIElementClasses.FOOTER_DIV;
        const footerInner = document.createElement('div');
        footerInner.className = UIElementClasses.FOOTER_INNER_DIV;
        footer.appendChild(footerInner);
        return footer;
    }
}