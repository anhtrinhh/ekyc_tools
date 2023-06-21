import { EkycStyleHTML } from './ekyc-asset';

export class EkycCapture {
    private element : HTMLDivElement;
    public constructor() {
        this.element = this.createBasicLayout();
    }

    private createBasicLayout() {
        const container = document.createElement('div');
        container.insertAdjacentHTML('beforeend', EkycStyleHTML);
        container.className = 'ekyc-container';
        const captureRegion = document.createElement('div');
        captureRegion.className = "ekyc-capture-region";
        return container;
    }

    public open() {
        document.body.appendChild(this.element);
    }
}