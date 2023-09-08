import { OnErrorCallback, OnStartCallback, OnStopCallback, ResultFactory } from '../core';
import { EkycCaptureBtnSVG } from '../ekyc-asset';
import { Utils } from '../utils';
import { UI, UILoadHandler } from './base';
import { CustomEventNames, UIElementClasses } from './constants';

export class CaptureButton {
    private onStart: OnStartCallback | undefined;
    private onStop: OnStopCallback | undefined;
    private onError: OnErrorCallback | undefined;
    private readonly captureRegion: HTMLElement;

    private constructor(captureRegion: HTMLElement, onStart?: OnStartCallback, onStop?: OnStopCallback, onError?: OnErrorCallback) {
        this.captureRegion = captureRegion;
        this.onStart = onStart;
        this.onStop = onStop;
        this.onError = onError;
    }

    private render(parentElement: HTMLElement, loadHandlers: UILoadHandler[]) {
        Utils.queryByClassName(UIElementClasses.CAPTURE_BTN, parentElement)?.remove();
        const container = Utils.closestByClassName(UIElementClasses.CONTAINER_DIV, parentElement) as HTMLDivElement;
        const captureButton = document.createElement('button');
        captureButton.className = `ekyct-btn ${UIElementClasses.CAPTURE_BTN}`;
        captureButton.innerHTML = EkycCaptureBtnSVG;
        captureButton.addEventListener('click', evt => {
            container.dispatchEvent(new CustomEvent(CustomEventNames.UI_LOADING));
            if (this.onStart) this.onStart();
            evt.preventDefault();
            UI.getCapture(this.captureRegion).then(rs => {
                container.dispatchEvent(new CustomEvent(CustomEventNames.UI_LOADED, {
                    detail: {
                        canvas: Utils.queryByClassName(UIElementClasses.CANVAS, this.captureRegion) as HTMLCanvasElement
                    }
                }));
                if (this.onStop) {
                    if (rs) {
                        this.onStop(ResultFactory.createImageResult(rs))
                    } else this.onStop(null);
                }
            }).catch(err => {
                container.dispatchEvent(new CustomEvent(CustomEventNames.UI_LOADED, { detail: { error: err } }));
                if (this.onError) this.onError(err);
            });
        });
        parentElement.appendChild(captureButton);
        const handleUILoad: UILoadHandler = (loading: boolean) => {
            if (loading) captureButton.disabled = true;
            else captureButton.disabled = false;
        };
        loadHandlers.push(handleUILoad);
    }

    public static create(parentElement: HTMLElement, captureRegion: HTMLElement, loadHandlers: UILoadHandler[], onStart?: OnStartCallback, onStop?: OnStopCallback, onError?: OnErrorCallback) {
        let captureButton = new CaptureButton(captureRegion, onStart, onStop, onError);
        captureButton.render(parentElement, loadHandlers);
        return captureButton;
    }
}