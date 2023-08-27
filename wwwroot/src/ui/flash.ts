import { BooleanCameraCapability } from "../camera/core";
import { EkycFlashOffSVG, EkycFlashOnSVG } from "../ekyc-asset";
import { EkycToolsScannerStrings } from "../strings";
import { UILoadHandler } from "./base";
import { UIElementClasses } from "./constants";

export type OnFlashActionFailureCallback = (failureMessage: string) => void;

interface FlashController {
    disable(): void;
    enable(): void;
    setHTML(html: string): void;
}

class FlashUI {
    private readonly flashCapability: BooleanCameraCapability;
    private readonly buttonController: FlashController;
    private readonly onFlashActionFailureCallback: OnFlashActionFailureCallback;

    // Mutable states.
    private isFlashOn: boolean = false;

    constructor(
        flashCapability: BooleanCameraCapability,
        buttonController: FlashController,
        onFlashActionFailureCallback: OnFlashActionFailureCallback) {
        this.flashCapability = flashCapability;
        this.buttonController = buttonController;
        this.onFlashActionFailureCallback = onFlashActionFailureCallback;
    }

    public isFlashEnabled(): boolean {
        return this.isFlashOn;
    }

    public async flipState(): Promise<void> {
        this.buttonController.disable();
        let isFlashOnExpected = !this.isFlashOn;
        try {
            await this.flashCapability.apply(isFlashOnExpected);
            this.updateUiBasedOnLatestSettings(
                this.flashCapability.value()!, isFlashOnExpected);
        } catch (error) {
            this.propagateFailure(isFlashOnExpected, error);
            this.buttonController.enable();
        }
    }

    private updateUiBasedOnLatestSettings(
        isFlashOn: boolean,
        isFlashOnExpected: boolean) {
        if (isFlashOn === isFlashOnExpected) {
            // Action succeeded, flip the state.
            this.buttonController.setHTML(isFlashOnExpected
                ? EkycFlashOffSVG
                : EkycFlashOnSVG);
            this.isFlashOn = isFlashOnExpected;
        } else {
            // Flash didn't get set as expected.
            // Show warning.
            this.propagateFailure(isFlashOnExpected);
        }
        this.buttonController.enable();
    }

    private propagateFailure(
        isFlashOnExpected: boolean, error?: any) {
        let errorMessage = isFlashOnExpected
            ? EkycToolsScannerStrings.flashOnFailedMessage()
            : EkycToolsScannerStrings.flashOffFailedMessage();
        if (error) {
            errorMessage += "; Error = " + error;
        }
        this.onFlashActionFailureCallback(errorMessage);
    }

    /**
     * Resets the state.
     * 
     * <p>Note: Doesn't turn off the flash implicitly.
     */
    public reset() {
        this.isFlashOn = false;
    }
}

/** Helper class for creating Flash UI component. */
export class FlashButton implements FlashController {
    private readonly flashButton: HTMLButtonElement;
    private readonly onFlashActionFailureCallback: OnFlashActionFailureCallback;

    private flashUI: FlashUI;

    private constructor(
        flashCapability: BooleanCameraCapability,
        onFlashActionFailureCallback: OnFlashActionFailureCallback) {
        this.onFlashActionFailureCallback = onFlashActionFailureCallback;
        this.flashButton = document.createElement('button');

        this.flashUI = new FlashUI(
            flashCapability,
            /* buttonController= */ this,
            onFlashActionFailureCallback);
    }

    private render(
        parentElement: HTMLElement, loadHandlers: UILoadHandler[]) {
        this.flashButton.className = `ekyct-btn ${UIElementClasses.FLASH_BTN}`;
        this.flashButton.disabled = true;
        this.flashButton.addEventListener("click", async evt => {
            evt.preventDefault();
            await this.flashUI.flipState();
        });
        const handleUILoad: UILoadHandler = (loading: boolean) => {
            if (loading) this.flashButton.disabled = true;
            else this.flashButton.disabled = false;
        };
        loadHandlers.push(handleUILoad);
        parentElement.appendChild(this.flashButton);
    }

    public updateFlashCapability(flashCapability: BooleanCameraCapability) {
        this.flashUI = new FlashUI(
            flashCapability,
            /* buttonController= */ this,
            this.onFlashActionFailureCallback);
    }

    public hide() {
        this.flashButton.classList.add(UIElementClasses.DNONE);
    }

    public show() {
        this.flashButton.innerHTML = EkycFlashOnSVG;
        this.flashButton.classList.remove(UIElementClasses.DNONE);
    }

    disable(): void {
        this.flashButton.disabled = true;
    }

    enable(): void {
        this.flashButton.disabled = false;
    }

    setHTML(html: string): void {
        this.flashButton.innerHTML = html;
    }

    public reset() {
        this.flashButton.innerHTML = EkycFlashOnSVG;
        this.flashUI.reset();
    }

    public static create(
        parentElement: HTMLElement,
        flashCapability: BooleanCameraCapability,
        onFlashActionFailureCallback: OnFlashActionFailureCallback,
        loadHandlers: UILoadHandler[])
        : FlashButton {
        let button = new FlashButton(
            flashCapability, onFlashActionFailureCallback);
        button.render(parentElement, loadHandlers);
        return button;
    }
}
