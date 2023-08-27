import { UILoadHandler } from './base';
import { UIElementClasses } from './constants';

export class LoaderUI {
    private constructor() {

    }

    private render(parent: HTMLElement, loadHandlers: UILoadHandler[]) {
        const loaderDiv = document.createElement('div');
        loaderDiv.className = `${UIElementClasses.LOADER_DIV} ${UIElementClasses.DNONE}`;
        const loaderContentDiv = document.createElement('div');
        loaderContentDiv.className = UIElementClasses.LOADER_CONTENT_DIV;
        for (let i = 1; i <= 10; i++) {
            const dotSpan = document.createElement('span');
            dotSpan.setAttribute('style', '--i:' + i);
            loaderContentDiv.appendChild(dotSpan);
        }
        loaderDiv.appendChild(loaderContentDiv);
        parent.appendChild(loaderDiv);
        const handleUILoad: UILoadHandler = (loading: boolean) => {
            if (loading) loaderDiv.classList.remove(UIElementClasses.DNONE);
            else loaderDiv.classList.add(UIElementClasses.DNONE);
        };
        loadHandlers.push(handleUILoad);
    }

    public static create(
        parent: HTMLElement,
        loadHandlers: UILoadHandler[]): LoaderUI {
        let loaderUI = new LoaderUI();
        loaderUI.render(parent, loadHandlers);
        return loaderUI;
    }
}