import '@mediapipe/face_detection';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
export interface EkycToolOptions {
    ratio?: number;
    enableFilePicker?: boolean;
    enableCapture?: boolean;
    enableRecord?: boolean;
    enableSwitchCamera?: boolean;
    facingMode?: string;
}
export declare class EkycTools {
    private mediaStream;
    private foreverScanTimeout;
    private currentFacingMode;
    private latestBlob;
    private readonly hasCheckIDCard;
    private faceDetector;
    constructor(idCardModelUrl?: string);
    getImage(options?: EkycToolOptions): Promise<Blob | null>;
    getVideo(options?: EkycToolOptions): Promise<Blob | null>;
    private handleFilePicker;
    private handleCapture;
    private handleDetectObject;
    private handleDetectFace;
    private foreverScan;
    private createBasicLayout;
    private enableFooterButtons;
    private disableFooterButtons;
    private toggleFacingMode;
    private validateEkycToolOptions;
    private createNotHasCamElement;
    private getFacingMode;
    private insertVideoElement;
    private closeEkycWindow;
    private clearMediaStream;
    private clearScanTimeout;
    private createHeader;
    private createFooter;
    private createVideoElement;
}
