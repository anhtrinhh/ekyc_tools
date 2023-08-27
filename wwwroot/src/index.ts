/**
 * @fileoverview - Global export file.
 * EKYC tools library.
 * - Scan and capture ID
 * - Scan and record face
 *
 */
import { UI } from './ui/base';
import { UIElementClasses } from './ui/constants';

window.addEventListener('resize', () => {
    document.querySelectorAll(`.${UIElementClasses.CAPTURE_REGION_DIV}`).forEach(elm => {
        UI.handleOnScreenResize(elm as HTMLDivElement);
    });
})

export {
    EkycTools
} from "./ekyc-tools"