import { UIElementClasses } from "./constants";

export type OnZoomValueChangeCallback = (zoomValue: number) => void;

export class ZoomUI {

    private zoomElementContainer: HTMLDivElement;
    private rangeInput: HTMLInputElement;
    private rangeText: HTMLSpanElement;

    private onChangeCallback: OnZoomValueChangeCallback | null = null;

    private constructor() {
        this.zoomElementContainer = document.createElement("div");
        this.zoomElementContainer.className = UIElementClasses.ZOOM_CONTAINER_DIV;
        this.rangeInput = document.createElement('input');
        this.rangeInput.type = "range";
        this.rangeText = document.createElement("span");

        // default values.
        this.rangeInput.min = "1";
        this.rangeInput.max = "5";
        this.rangeInput.value = "1";
        this.rangeInput.step = "0.1";
    }

    private render(
        parentElement: HTMLElement) {
        parentElement.appendChild(this.zoomElementContainer);
        this.rangeText.innerText = `${this.rangeInput.value}x`;

        // Bind values.
        this.rangeInput.addEventListener("input", () => this.onValueChange());
        this.rangeInput.addEventListener("change", () => this.onValueChange());

        this.zoomElementContainer.appendChild(this.rangeInput);
        this.zoomElementContainer.appendChild(this.rangeText);
    }

    private onValueChange() {
        this.rangeText.innerText = `${this.rangeInput.value}x`;
        if (this.onChangeCallback) {
            this.onChangeCallback(parseFloat(this.rangeInput.value));
        }
    }

    public setValues(
        minValue: number,
        maxValue: number,
        defaultValue: number,
        step: number) {
        this.rangeInput.min = minValue ? minValue.toString() : '1';
        this.rangeInput.max = maxValue ? maxValue.toString() : '5';
        this.rangeInput.step = step ? step.toString() : '0.1';
        this.rangeInput.value = defaultValue ? defaultValue.toString() : '1';

        this.onValueChange();
    }

    public show() {
        this.zoomElementContainer.classList.remove(UIElementClasses.DNONE);
    }

    public hide() {
        this.zoomElementContainer.classList.add(UIElementClasses.DNONE);
    }

    public setOnCameraZoomValueChangeCallback(
        onChangeCallback: OnZoomValueChangeCallback) {
        this.onChangeCallback = onChangeCallback;
    }

    public removeOnCameraZoomValueChangeCallback() {
        this.onChangeCallback = null;
    }

    public static create(
        parentElement: HTMLElement): ZoomUI {
        let cameraZoomUi = new ZoomUI();
        cameraZoomUi.render(parentElement);
        return cameraZoomUi;
    }
}
