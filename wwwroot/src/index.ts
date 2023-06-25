/**
 * @fileoverview - Global export file.
 * EKYC tools library.
 * - Scan and capture ID
 * - Scan and record face
 *
 */
import { Utils } from './utils';

window.addEventListener('resize', () => {
    document.querySelectorAll('div.ekyct-container--inner').forEach(elm => {
        Utils.handleScreen(elm);
    });
})

export {
    EkycTools
} from "./ekyc-tools"