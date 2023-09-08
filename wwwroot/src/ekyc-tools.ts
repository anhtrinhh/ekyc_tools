import { CameraCapabilities, RenderedCamera } from "./camera/core";
import { CameraRetriever } from "./camera/retriever";
import { AlertConfig, BaseConfig, BaseLoggger, Logger } from "./core";
import { UI, UILoadHandler } from "./ui/base";
import { CustomEventNames, UIElementClasses } from "./ui/constants";
import { FilePickerUI } from "./ui/file-picker";
import { SwitchCameraUI } from "./ui/switch-camera";
import { FlashButton } from "./ui/flash";
import { CaptureButton } from "./ui/capture";
import { ZoomUI } from "./ui/zoom";
import { RecordUI } from "./ui/record";
import { Utils } from "./utils";

export class EkycTools {
    private readonly verbose: boolean;
    private readonly logger: Logger;
    private openning: boolean = false;
    private loadHandlers: UILoadHandler[] = [];
    private flashButton: FlashButton | null = null;
    private zoomInput: ZoomUI | null = null;
    private recordUI: RecordUI | null = null;
    public element: HTMLDivElement | null = null;
    private renderedCamera: RenderedCamera | null = null;
    constructor(verbose?: boolean) {
        this.verbose = verbose === true;
        this.logger = new BaseLoggger(this.verbose);
    }

    public static getCameraDevices() {
        return CameraRetriever.retrieve();
    }

    public addAlert(config: AlertConfig) {
        if (this.element) UI.addAlert(this.element, config);
    }

    public open(config: BaseConfig) {
        if (!this.openning) {
            this.openning = true;
            this.element = UI.createBasicLayout(this.loadHandlers);
            document.body.appendChild(this.element);
            if (config.onOpen) config.onOpen();
            this.createSectionControlPanel(config);
        }
    }

    public close() {
        if (this.openning) {
            if (this.flashButton) {
                this.flashButton.reset();
                this.flashButton.hide();
                this.flashButton = null;
            }
            if (this.zoomInput) {
                this.zoomInput.removeOnCameraZoomValueChangeCallback();
                this.zoomInput.hide();
                this.zoomInput = null;
            }
            if (this.recordUI) {
                this.recordUI.hide();
                this.recordUI = null;
            }
        }
        return new Promise((resolve, reject) => {
            if (this.renderedCamera && this.openning) {
                this.renderedCamera.close().then(() => {
                    if (this.element) document.body.removeChild(this.element);
                    this.openning = false;
                    resolve(null);
                }).catch(err => {
                    this.logger.logError(err);
                    this.openning = false;
                    reject(err);
                });
            } else {
                if (this.element) document.body.removeChild(this.element);
                this.openning = false;
                resolve(null);
            }
        })
    }

    private createSectionControlPanel(config: BaseConfig) {
        const captureRegion = Utils.queryByClassName(UIElementClasses.CAPTURE_REGION_DIV, this.element!) as HTMLDivElement;
        const footerInner = Utils.queryByClassName(UIElementClasses.FOOTER_INNER_DIV, this.element!) as HTMLDivElement;
        const closeBtn = Utils.queryByClassName(UIElementClasses.CLOSE_BTN, this.element!) as HTMLButtonElement;
        const isRecordConfig = Utils.instanceOfGetVideoConfig(config);
        captureRegion.dataset.shadingRatio = config.shadingRatio!.toString();
        captureRegion.dataset.canvasMaxWidth = config.canvasMaxWidth!.toString();
        captureRegion.dataset.canvasMinWidth = config.canvasMinWidth!.toString();
        captureRegion.dataset.isRecord = isRecordConfig.toString();
        const handleCloseBtnUILoad: UILoadHandler = (loading: boolean) => {
            if (loading) closeBtn.disabled = true;
            else closeBtn.disabled = false;
        };
        this.loadHandlers.push(handleCloseBtnUILoad);
        closeBtn.addEventListener('click', evt => {
            evt.preventDefault();
            this.close();
        });
        let accept = isRecordConfig ? 'video/mp4,video/webm,video/mov' : 'image/jpeg,image/png,image/webp';
        this.element!.addEventListener(CustomEventNames.UI_LOADING, () => {
            this.loadHandlers.forEach(handler => handler(true));
            if (!isRecordConfig) {
                const captureButton = Utils.queryByClassName(UIElementClasses.CAPTURE_BTN, this.element!) as HTMLButtonElement;
                if (captureButton) captureButton.disabled = true;
            }
        });
        this.element!.addEventListener(CustomEventNames.UI_LOADED, evt => {
            const customEvent = evt as CustomEvent;
            this.loadHandlers.forEach(handler => handler(false));
            if (customEvent.detail) {
                const canvas = customEvent.detail.canvas as HTMLCanvasElement;
                const { error } = customEvent.detail;
                if (canvas && !isRecordConfig) CaptureButton.create(footerInner, captureRegion, this.loadHandlers, config.onStart, config.onStop, config.onError);
                if (error && config.onError) config.onError(error);
            }
        });
        if (config.enableFilePicker) FilePickerUI.create(footerInner, accept, this.loadHandlers, config.onStart, config.onStop);
        if (config.enableSwitchCamera) {
            CameraRetriever.retrieve().then(devices => {
                UI.setupCamera(captureRegion, config.video).then(renderedCamera => {
                    this.setRenderedCamera(renderedCamera, config);
                    let { deviceId } = renderedCamera.getRunningTrackSettings();
                    SwitchCameraUI.create(footerInner, devices, this.loadHandlers, deviceId);
                    this.element!.addEventListener(CustomEventNames.SWITCH_CAMERA, evt => {
                        const customEvent = evt as CustomEvent;
                        if (typeof config.video === 'boolean') config.video = { deviceId: { exact: customEvent.detail.deviceId } };
                        else config.video!.deviceId = { exact: customEvent.detail.deviceId };
                        UI.setupCamera(captureRegion, config.video, this.renderedCamera)
                            .then(renderedCamera => this.setRenderedCamera(renderedCamera, config))
                            .catch(err => {
                                if (config.onError) config.onError(err);
                                this.logger.logError(err)
                            });
                    })
                }).catch(err => {
                    if (config.onError) config.onError(err);
                    this.logger.logError(err);
                });
            }).catch(err => {
                this.element?.dispatchEvent(new CustomEvent(CustomEventNames.UI_LOADED));
                if (config.onError) config.onError(err);
                this.logger.logError(err);
            });
        } else {
            UI.setupCamera(captureRegion, config.video)
                .then(renderedCamera => this.setRenderedCamera(renderedCamera, config))
                .catch(err => {
                    if (config.onError) config.onError(err);
                    this.logger.logError(err);
                });
        }
    }

    private setRenderedCamera(renderedCamera: RenderedCamera, config: BaseConfig) {
        this.renderedCamera = renderedCamera;
        const cameraCapabilities = renderedCamera.getCapabilities();
        if (config.enableFlash) this.createAndShowFlashButtonIfSupported(cameraCapabilities, config.onError)
        this.renderCameraZoomUiIfSupported(cameraCapabilities, config.zoom);
        this.createAndShowRecordUI(renderedCamera.getStream(), config);
    }

    private createAndShowRecordUI(stream: MediaStream, config: BaseConfig) {
        const isRecordConfig = Utils.instanceOfGetVideoConfig(config);
        if (isRecordConfig) {
            if (!this.recordUI) {
                const footerInner = Utils.queryByClassName(UIElementClasses.FOOTER_INNER_DIV, this.element!) as HTMLElement;
                const captureRegion = Utils.queryByClassName(UIElementClasses.CAPTURE_REGION_DIV, this.element!) as HTMLElement;
                this.recordUI = RecordUI.create(
                    footerInner,
                    captureRegion, this.loadHandlers, {
                    recordMs: config.recordMs,
                    videoBitsPerSecond: config.videoBitsPerSecond
                }, config.onStart, config.onStop, config.onError);
            }
            this.recordUI.setStream(stream);
            this.recordUI.show();
        }
    }

    private createAndShowFlashButtonIfSupported(cameraCapabilities: CameraCapabilities, onError?: any) {
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
                    if (onError) onError(err);
                    this.logger.logError(err);
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