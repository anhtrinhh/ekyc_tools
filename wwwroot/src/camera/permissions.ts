export class CameraPermissions {

    public static async hasPermissions(): Promise<boolean> {
      let devices = await navigator.mediaDevices.enumerateDevices();
      for (const device of devices) {
        if(device.kind === "videoinput" && device.label) {
          return true;
        }
      }
      return false;
    }
    
}