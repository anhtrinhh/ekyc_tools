import { CameraCapabilities, RenderedCamera } from "./camera/core";
import { CameraRetriever } from "./camera/retriever";
import { BaseConfig, BaseLoggger, Logger } from "./core";
import { UI, UILoadHandler } from "./ui/base";
import { CustomEventNames, UIElementClasses } from "./ui/constants";
import { FilePickerUI } from "./ui/file-picker";
import { SwitchCameraUI } from "./ui/switch-camera";
import { FlashButton } from "./ui/flash";
import { ZoomUI } from "./ui/zoom";
import { Utils } from "./utils";

export class EkycTools {
    private readonly verbose: boolean;
    private readonly logger: Logger;
    private loadHandlers: UILoadHandler[] = [];
    private flashButton: FlashButton | null = null;
    private zoomInput: ZoomUI | null = null;
    public element: HTMLDivElement | null = null;
    private renderedCamera: RenderedCamera | null = null;
    constructor(verbose?: boolean) {
        this.verbose = verbose === true;
        this.logger = new BaseLoggger(this.verbose);
    }

    public static getCameraDevices() {
        return CameraRetriever.retrieve();
    }

    public getImage(config: BaseConfig) {
        this.element = UI.createBasicLayout(this.loadHandlers);
        document.body.appendChild(this.element);
        this.createSectionControlPanel(config);
    }

    public close() {
        if (this.flashButton) {
            this.flashButton.reset();
            this.flashButton.hide();
        }
        if (this.zoomInput) {
            this.zoomInput.removeOnCameraZoomValueChangeCallback();
            this.zoomInput.hide();
        }
        return new Promise((resolve, reject) => {
            if (this.renderedCamera) {
                this.renderedCamera.close().then(() => {
                    if (this.element) document.body.removeChild(this.element);
                    resolve(null);
                }).catch(err => {
                    reject(err);
                });
            } else {
                if (this.element) document.body.removeChild(this.element);
                resolve(null);
            }
        })
    }

    private createSectionControlPanel(config: BaseConfig) {
        const captureRegion = Utils.queryByClassName(UIElementClasses.CAPTURE_REGION_DIV, this.element!) as HTMLDivElement;
        const footerInner = Utils.queryByClassName(UIElementClasses.FOOTER_INNER_DIV, this.element!) as HTMLDivElement;
        const closeBtn = Utils.queryByClassName(UIElementClasses.CLOSE_BTN, this.element!) as HTMLButtonElement;
        const handleCloseBtnUILoad: UILoadHandler = (loading: boolean) => {
            if (loading) closeBtn.disabled = true;
            else closeBtn.disabled = false;
        };
        this.loadHandlers.push(handleCloseBtnUILoad);
        closeBtn.addEventListener('click', evt => {
            evt.preventDefault();
            this.close();
        })
        let accept = 'image/jpeg,image/png,image/webp';
        if (Utils.instanceOfGetVideoConfig(config)) {
            accept = 'video/mp4,video/webm,video/mov';
        } else {

        }
        if (config.enableFilePicker) FilePickerUI.create(footerInner, accept, this.loadHandlers, config.onStart, config.onStop);
        let videoConstraints: MediaTrackConstraints = {

        }
        if (config.enableSwitchCamera) {
            CameraRetriever.retrieve().then(devices => {
                UI.setupCamera(captureRegion, videoConstraints).then(renderedCamera => {
                    this.setRenderedCamera(renderedCamera, config.enableFlash, config.zoom);
                    let { deviceId } = renderedCamera.getRunningTrackSettings();
                    SwitchCameraUI.create(footerInner, devices, this.loadHandlers, deviceId);
                    this.element!.addEventListener(CustomEventNames.SWITCH_CAMERA, evt => {
                        const customEvent = evt as CustomEvent;
                        videoConstraints.deviceId = { exact: customEvent.detail.deviceId };
                        UI.setupCamera(captureRegion, videoConstraints, this.renderedCamera)
                            .then(renderedCamera => this.setRenderedCamera(renderedCamera, config.enableFlash, config.zoom))
                            .catch(err => this.logger.logError(err));
                    })
                }).catch(err => this.logger.logError(err));
            }).catch(err => {
                this.element?.dispatchEvent(new CustomEvent(CustomEventNames.UI_LOADED));
                this.logger.logError(err);
            });
        } else {
            UI.setupCamera(captureRegion, videoConstraints)
                .then(renderedCamera => this.setRenderedCamera(renderedCamera, config.enableFlash, config.zoom))
                .catch(err => this.logger.logError(err));
        }
    }

    private setRenderedCamera(renderedCamera: RenderedCamera, enableFlash?: boolean, zoom?: number) {
        this.renderedCamera = renderedCamera;
        const cameraCapabilities = renderedCamera.getCapabilities();
        if (enableFlash) this.createAndShowFlashButtonIfSupported(cameraCapabilities)
        this.renderCameraZoomUiIfSupported(cameraCapabilities, zoom);
    }

    private createAndShowFlashButtonIfSupported(cameraCapabilities: CameraCapabilities) {
        if (!cameraCapabilities.flashFeature().isSupported()) {
            // flash not supported, ignore.
            if (this.flashButton) {
                this.flashButton.hide();
            }
            return;
        }
        if (!this.flashButton) {
            const footerInner = Utils.queryByClassName(UIElementClasses.FOOTER_INNER_DIV, this.element!) as HTMLDivElement;
            this.flashButton = FlashButton.create(
                footerInner,
                cameraCapabilities.flashFeature(),
                // Callback in case of flash action failure.
                err => {
                    this.logger.logError(err)
                },
                this.loadHandlers
            );
        } else {
            this.flashButton.updateFlashCapability(cameraCapabilities.flashFeature());
        }
        this.flashButton.show();
    }

    private renderCameraZoomUiIfSupported(cameraCapabilities: CameraCapabilities, zoom?: number) {
        let zoomCapability = cameraCapabilities.zoomFeature();
        if (!zoomCapability.isSupported()) {
            return;
        }
        if (!this.zoomInput) {
            const captureRegion = Utils.queryByClassName(UIElementClasses.CAPTURE_REGION_DIV, this.element!) as HTMLDivElement;
            this.zoomInput = ZoomUI.create(captureRegion);
        }
        // Supported.
        this.zoomInput!.setOnCameraZoomValueChangeCallback((zoomValue) => {
            zoomCapability.apply(zoomValue);
        });
        let defaultZoom = 1;
        if (zoom && zoom > 0) {
            defaultZoom = zoom;
        }
        defaultZoom = Utils.clip(defaultZoom, zoomCapability.min(), zoomCapability.max());
        this.zoomInput!.setValues(
            zoomCapability.min(),
            zoomCapability.max(),
            defaultZoom,
            zoomCapability.step(),
        );
        this.zoomInput!.show();
    }
}