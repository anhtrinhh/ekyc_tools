import { EkycCaptureBtnSVG } from '../ekyc-asset';
import { Utils } from '../utils';
import { UIElementClasses } from './constants';

export class CaptureButton {
    private canvasElement: HTMLCanvasElement;
    private canvasContext: CanvasRenderingContext2D;

    private constructor(canvasElement: HTMLCanvasElement) {
        this.canvasElement = canvasElement;
        this.canvasContext = (<any>this.canvasElement).getContext("2d", { willReadFrequently: true });
    }

    private render(parentElement: HTMLElement) {
        Utils.queryByClassName(UIElementClasses.CAPTURE_BTN, parentElement)?.remove();
        const captureButton = document.createElement('button');
        captureButton.className = `ekyct-btn ${UIElementClasses.CAPTURE_BTN}`;
        captureButton.innerHTML = EkycCaptureBtnSVG;
        captureButton.addEventListener('click', evt => {
            evt.preventDefault();
            const captureRegion = Utils.closestByClassName(UIElementClasses.CAPTURE_REGION_DIV, this.canvasElement) as HTMLElement;
            const video = Utils.queryByClassName(UIElementClasses.VIDEO, captureRegion) as HTMLVideoElement;
            if (video) {
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
                const canvasWidth = parseInt(this.canvasElement.style.width.slice(0, -2));
                const canvasHeight = parseInt(this.canvasElement.style.height.slice(0, -2));
                this.canvasContext.canvas.width = canvasWidth;
                this.canvasContext.canvas.height = canvasHeight;
                this.canvasContext.drawImage(video, sxOffset, syOffset, sWidthOffset, sHeightOffset, 0, 0, canvasWidth, canvasHeight);
            }
        });
        parentElement.appendChild(captureButton);
    }

    public static create(parentElement: HTMLElement, canvasElement: HTMLCanvasElement) {
        let captureButton = new CaptureButton(canvasElement);
        captureButton.render(parentElement);
        return captureButton;
    }
}