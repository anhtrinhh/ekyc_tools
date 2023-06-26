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
    private scanFaceRunning;
    private currentFacingMode;
    private readonly hasCheckIDCard;
    private faceDetector;
    constructor(idCardModelUrl?: string);
    getImage(options?: EkycToolOptions): Promise<Blob | null>;
    getVideo(recordMs?: number, options?: EkycToolOptions): Promise<Blob | null>;
    private handleFilePicker;
    private handleRecord;
    private stopMediaRecorder;
    private handleCapture;
    private getObjectFromCaptureRegion;
    private getBlobFromCanvas;
    private handleDetectFace;
    private handleScan;
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
    private createHeader;
    private createFooter;
    private createVideoElement;
}
