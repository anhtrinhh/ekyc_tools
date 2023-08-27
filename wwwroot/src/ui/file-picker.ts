import { OnStartCallback, OnStopCallback } from '../core';
import { EkycFileBtnSVG } from '../ekyc-asset';
import { Utils } from '../utils';
import { UILoadHandler } from './base';
import { UIElementClasses } from './constants';

export class FilePickerUI {
    private constructor(parent: HTMLDivElement, accept: string, loadHandlers: UILoadHandler[], onStart?: OnStartCallback, onStop?: OnStopCallback) {
        const fileButton = document.createElement('button');
        fileButton.className = `ekyct-btn ${UIElementClasses.FILE_PICKER_BTN}`;
        fileButton.innerHTML = EkycFileBtnSVG;
        fileButton.disabled = true;
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = accept;
        fileInput.onchange = () => {
            if (fileInput.files) {
                const file = fileInput.files[0];
                if (onStop) {
                    onStop({
                        blob: file,
                        contentName: `${Utils.newGuid()}.png`,
                        contentLength: file.size,
                        contentType: file.type
                    });
                }
            }
        };
        fileButton.addEventListener('click', evt => {
            evt.preventDefault();
            fileInput.click();
            if (onStart) onStart();
        });
        const handleUILoad: UILoadHandler = (loading: boolean) => {
            if (loading) fileButton.disabled = true;
            else fileButton.disabled = false;
        };
        loadHandlers.push(handleUILoad);
        parent.appendChild(fileButton);
    }

    public static create(parent: HTMLDivElement, accept: string, loadHandlers: UILoadHandler[], onStart?: OnStartCallback, onStop?: OnStopCallback): FilePickerUI {
        let button = new FilePickerUI(parent, accept, loadHandlers, onStart, onStop);
        return button;
    }
}