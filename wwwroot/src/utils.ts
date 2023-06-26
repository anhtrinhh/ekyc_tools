export class Utils {
    public static shardBorderLargeSize = 40;
    public static shardBorderSmallSize = 5;
    public static handleScreen(containerInnerEl: Element) {
        const container = containerInnerEl as HTMLDivElement;
        if (container.clientWidth >= container.clientHeight) {
            container.classList.add('ekyct-container--rotate');
        } else {
            container.classList.remove('ekyct-container--rotate');
        }
        const captureRegionDiv = container.querySelector('div.ekyct-capture-region');
        if (captureRegionDiv) {
            const captureRegion = captureRegionDiv as HTMLDivElement;
            let ratio = 1;
            if (captureRegion.dataset['ratio']) ratio = parseFloat(captureRegion.dataset['ratio'])
            this.insertShadingElement(captureRegion, ratio);
            this.insertCanvasElement(captureRegion);
        }
    }

    public static insertCanvasElement(parent: HTMLDivElement) {
        const shadingEl = parent.querySelector('.ekyct-shading');
        const videoEl = parent.querySelector('.ekyct-video');
        if (videoEl && shadingEl) {
            parent.querySelector('.ekyct-canvas')?.remove();
            const shadingDivEl = shadingEl as HTMLDivElement;
            const width = videoEl.clientWidth - parseInt(shadingDivEl.style.borderLeftWidth.slice(0, -2)) * 2;
            const height = videoEl.clientHeight - parseInt(shadingDivEl.style.borderTopWidth.slice(0, -2)) * 2;
            const canvasElement = document.createElement('canvas');
            canvasElement.className = 'ekyct-canvas';
            canvasElement.style.width = `${width}px`;
            canvasElement.style.height = `${height}px`;
            canvasElement.style.display = "none";
            parent.appendChild(canvasElement);
        }
    }

    public static insertShadingElement(parent: HTMLDivElement, rate: number) {
        const videoEl = parent.querySelector('.ekyct-video') as HTMLVideoElement;
        if (videoEl) {
            parent.querySelector('.ekyct-shading')?.remove();
            const videoWidth = videoEl.clientWidth;
            const videoHeight = videoEl.clientHeight;
            const shadingElement = document.createElement("div");
            shadingElement.className = 'ekyct-shading';
            shadingElement.style.width = `${videoWidth}px`;
            shadingElement.style.height = `${videoHeight}px`;
            const left = (parent.clientWidth - videoWidth) / 2 + 'px';
            const top = (parent.clientHeight - videoHeight) / 2 + 'px'
            shadingElement.style.top = top;
            shadingElement.style.left = left;
            const borderSize = this.getShadingBorderSize(videoEl, rate);
            shadingElement.style.borderLeftWidth = `${borderSize.borderX}px`;
            shadingElement.style.borderRightWidth = `${borderSize.borderX}px`;
            shadingElement.style.borderTopWidth = `${borderSize.borderY}px`;
            shadingElement.style.borderBottomWidth = `${borderSize.borderY}px`;
            this.insertShaderBorders(shadingElement, this.shardBorderLargeSize, this.shardBorderSmallSize, -this.shardBorderSmallSize, null, 0, true);
            this.insertShaderBorders(shadingElement, this.shardBorderLargeSize, this.shardBorderSmallSize, -this.shardBorderSmallSize, null, 0, false);
            this.insertShaderBorders(shadingElement, this.shardBorderLargeSize, this.shardBorderSmallSize, null, -this.shardBorderSmallSize, 0, true);
            this.insertShaderBorders(shadingElement, this.shardBorderLargeSize, this.shardBorderSmallSize, null, -this.shardBorderSmallSize, 0, false);
            this.insertShaderBorders(shadingElement, this.shardBorderSmallSize, this.shardBorderLargeSize + this.shardBorderSmallSize, -this.shardBorderSmallSize, null, -this.shardBorderSmallSize, true);
            this.insertShaderBorders(shadingElement, this.shardBorderSmallSize, this.shardBorderLargeSize + this.shardBorderSmallSize, null, -this.shardBorderSmallSize, -this.shardBorderSmallSize, true);
            this.insertShaderBorders(shadingElement, this.shardBorderSmallSize, this.shardBorderLargeSize + this.shardBorderSmallSize, -this.shardBorderSmallSize, null, -this.shardBorderSmallSize, false);
            this.insertShaderBorders(shadingElement, this.shardBorderSmallSize, this.shardBorderLargeSize + this.shardBorderSmallSize, null, -this.shardBorderSmallSize, -this.shardBorderSmallSize, false);
            this.insertCircleRegion(shadingElement);
            parent.appendChild(shadingElement);
        }
    }

    public static insertShaderBorders(
        shaderElem: HTMLDivElement,
        width: number,
        height: number,
        top: number | null,
        bottom: number | null,
        side: number,
        isLeft: boolean) {
        const elem = document.createElement("div");
        elem.className = 'ekyct-shader-border';
        elem.style.width = `${width}px`;
        elem.style.height = `${height}px`;
        if (top !== null) {
            elem.style.top = `${top}px`;
        }
        if (bottom !== null) {
            elem.style.bottom = `${bottom}px`;
        }
        if (isLeft) {
            elem.style.left = `${side}px`;
        } else {
            elem.style.right = `${side}px`;
        }
        shaderElem.appendChild(elem);
    }

    public static getShadingBorderSize(videoEl: HTMLVideoElement, rate: number) {
        let videoWidth = videoEl.clientWidth;
        let videoHeight = videoEl.clientHeight;
        let borderX: number, borderY: number;
        if (videoWidth < 576) {
            borderX = 16;
        } else if (videoWidth < 768) {
            borderX = 32;
        } else {
            borderX = 48;
        }
        let width = videoWidth - 2 * borderX;
        let height = width * rate;
        if (height > videoHeight) {
            height = videoHeight;
            width = height / rate;
            borderX = (videoWidth - width) / 2;
        }
        borderY = (videoHeight - height) / 2;
        if (borderX < this.shardBorderSmallSize) {
            borderX = this.shardBorderSmallSize;
            width = videoWidth - borderX * 2;
            borderY = (videoHeight - (width * rate)) / 2;
        }
        if (borderY < this.shardBorderSmallSize) {
            borderY = this.shardBorderSmallSize;
            height = videoHeight - borderY * 2;
            borderX = (videoWidth - (height / rate)) / 2;
        }
        return {
            borderX,
            borderY
        };
    }

    public static delay(delayInMS: number) {
        return new Promise((resolve) => {
            setTimeout(resolve, delayInMS);
        });
    }

    private static insertCircleRegion(parentEl: HTMLDivElement) {
        const circleRegion = document.createElement('div');
        const parentWidth = parseFloat(parentEl.style.width.slice(0, -2));
        const parentBorderXWidth = parseFloat(parentEl.style.borderLeftWidth.slice(0, -2));
        const width = parentWidth - parentBorderXWidth * 2;
        circleRegion.className = 'ekyct-circle-region';
        for (let i = 0; i < 100; i++) {
            const pointEl = document.createElement('div');
            pointEl.className = 'ekyct-circle-region-point';
            circleRegion.appendChild(pointEl);
            pointEl.style.transform = `rotate(${i * 3.6}deg) translateY(${width / 2 - 10}px)`;
        }
        parentEl.appendChild(circleRegion);
    }
}