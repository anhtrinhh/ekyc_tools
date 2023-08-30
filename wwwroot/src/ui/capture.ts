import { OnErrorCallback, OnStartCallback, OnStopCallback } from '../core';
import { EkycCaptureBtnSVG } from '../ekyc-asset';
import { Utils } from '../utils';
import { UI } from './base';
import { UIElementClasses } from './constants';

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

    private render(parentElement: HTMLElement) {
        Utils.queryByClassName(UIElementClasses.CAPTURE_BTN, parentElement)?.remove();
        const captureButton = document.createElement('button');
        captureButton.className = `ekyct-btn ${UIElementClasses.CAPTURE_BTN}`;
        captureButton.innerHTML = EkycCaptureBtnSVG;
        captureButton.addEventListener('click', evt => {
            if (this.onStart) this.onStart();
            evt.preventDefault();
            UI.getCapture(this.captureRegion).then(rs => {
                if (this.onStop) {
                    if (rs) {
                        this.onStop({
                            blob: rs,
                            contentName: `${Utils.newGuid()}.png`,
                            contentLength: rs.size,
                            contentType: 'image/png'
                        })
                    } else this.onStop(null);
                }
            }).catch(err => {
                if (this.onError) this.onError(err);
            });
        });
        parentElement.appendChild(captureButton);
    }

    public static create(parentElement: HTMLElement, captureRegion: HTMLElement, onStart?: OnStartCallback, onStop?: OnStopCallback, onError?: OnErrorCallback) {
        let captureButton = new CaptureButton(captureRegion, onStart, onStop, onError);
        captureButton.render(parentElement);
        return captureButton;
    }
}