/** Append the libary components to globals for backwards compatibility. */
if (window) {
    // if (!Html5QrcodeScanner) {
    //     var Html5QrcodeScanner = window.__Html5QrcodeLibrary__.Html5QrcodeScanner;
    // }
    // if (!Html5Qrcode) {
    //     var Html5Qrcode = window.__Html5QrcodeLibrary__.Html5Qrcode;
    // }
    // if (!Html5QrcodeSupportedFormats) {
    //     var Html5QrcodeSupportedFormats = window.__Html5QrcodeLibrary__.Html5QrcodeSupportedFormats
    // }
    // if (!Html5QrcodeScannerState) {
    //     var Html5QrcodeScannerState = window.__Html5QrcodeLibrary__.Html5QrcodeScannerState;
    // }
    // if (!Html5QrcodeScanType) {
    //     var Html5QrcodeScanType = window.__Html5QrcodeLibrary__.Html5QrcodeScanType;
    // }

    if(!EkycTools) {
        var EkycTools = window.__EkycToolsLibrary__.EkycTools;
    }
}