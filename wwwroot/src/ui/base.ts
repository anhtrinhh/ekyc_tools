import { EkycStyleHTML, EkycCloseBtnSVG } from "../ekyc-asset";
import { Utils } from "../utils";
import { CameraFactory } from "../camera/factories";
import { RenderedCamera, RenderingCallbacks } from "../camera/core";
import { EkycToolsStrings } from "../strings";
import { CustomEventNames, UIElementClasses } from './constants';
import { LoaderUI } from "./loader";

export interface UILoadHandler {
    (loading: boolean): void
}

export class UI {
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
        }, this.delaySetupUIMs);
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