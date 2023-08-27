import { CameraDevice } from "../camera/core";
import { EkycSwitchCamSVG } from '../ekyc-asset';
import { Utils } from "../utils";
import { UILoadHandler } from "./base";
import { UIElementClasses, CustomEventNames } from './constants';

export class SwitchCameraUI {
    private readonly cameras: CameraDevice[];
    private deviceIndex: number = -1;
    private constructor(cameras: Array<CameraDevice>, deviceId?: string) {
        this.cameras = cameras;
        if (deviceId) {
            this.deviceIndex = cameras.findIndex(camera => camera.id === deviceId);
            if (this.deviceIndex === -1) this.deviceIndex = 0;
        }
    }

    private render(parent: HTMLElement, loadHandlers: UILoadHandler[]) {
        if (this.cameras.length > 1) {
            const container = Utils.closestByClassName(UIElementClasses.CONTAINER_DIV, parent) as HTMLDivElement;
            const switchCamButton = document.createElement('button');
            switchCamButton.className = `ekyct-btn ${UIElementClasses.SWITCH_CAMERA_BTN}`;
            switchCamButton.innerHTML = EkycSwitchCamSVG;
            switchCamButton.disabled = true;
            switchCamButton.addEventListener('click', evt => {
                evt.preventDefault();
                if (this.deviceIndex === this.cameras.length - 1) this.deviceIndex = 0;
                else this.deviceIndex++;
                const switchCamEvent = new CustomEvent(CustomEventNames.SWITCH_CAMERA, {
                    detail: {
                        deviceId: this.cameras[this.deviceIndex].id
                    }
                });
                container.dispatchEvent(switchCamEvent);
            });
            const handleUILoad: UILoadHandler = (loading: boolean) => {
                if (loading) switchCamButton.disabled = true;
                else switchCamButton.disabled = false;
            };
            loadHandlers.push(handleUILoad);
            parent.appendChild(switchCamButton);
        }
    }

    public static create(
        parent: HTMLElement,
        cameras: Array<CameraDevice>,
        loadHandlers: UILoadHandler[],
        deviceId?: string): SwitchCameraUI {
        let cameraSelectUi = new SwitchCameraUI(cameras, deviceId);
        cameraSelectUi.render(parent, loadHandlers);
        return cameraSelectUi;
    }
}