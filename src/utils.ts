export class Utils {
    public static async detectFrontOrBackOrBothCamera() {
        if (navigator.mediaDevices) {
            try {
                let stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                let hasFrontCamera = false;
                let hasBackCamera = false;
                stream.getVideoTracks().forEach(track => {
                    if (track.getCapabilities()['facingMode']!.includes('environment')) hasBackCamera = true;
                    stream.removeTrack(track);
                    track.stop();
                });
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                stream.getVideoTracks().forEach(track => {
                    if (track.getCapabilities()['facingMode']!.includes('user')) hasFrontCamera = true;
                    stream.removeTrack(track);
                    track.stop();
                });
                if (hasFrontCamera && hasBackCamera) {
                    return 'both';
                } else if (hasFrontCamera) {
                    return 'front';
                } else if (hasBackCamera) {
                    return 'back';
                } else {
                    return 'front';
                }
            } catch (err) { console.error(err) }
        }
        return 'none';
    }
}