export const EkycStyleHTML = `<style>
.ekyct-container, .ekyct-container * {margin: 0;padding:0;box-sizing: border-box}
.ekyct-container{position:fixed;top:0;left:0;bottom:0;right:0;background-color: #202124;z-index:99; display: flex; flex-direction: column;min-height: 100vh}
.ekyct-btn {
    border: none;
    outline: none;
    background-color: #3c4043;
    color: #ffffff;
    padding: 10px;
    cursor: pointer;
    line-height: 0;
    border-radius: 50%
}
.ekyct-btn:hover {
    background-color: #4b5053
}
.ekyct-btn:active {
    background-color: #5a5f63
}
.ekyct-btn svg {
    fill: currentColor;
    width: 24px;
    height: 24px;
}
.ekyct-capture-region {
    width: 100%;
    min-height: 100px;
    position: relative;
    text-align: center;
    flex-grow: 1;
    display: flex;
    align-items: center;
    justify-content: center;
}
.ekyct-header, .ekyct-footer {
    width: 100%;
}
.ekyct-header--inner {
    width: 100%;
    display: flex;
    justify-content: flex-end;
    padding: 10px;
}

.ekyct-header--inner .ekyct-btn { padding: 5px; }

.ekyct-footer--inner {
    width: 100%;
    display: flex;
    padding: 10px;
    justify-content: center;
    gap: 1rem;
}

.ekyct-cam-error {
    width: 100%;
    heigth: 100%;
}

.ekyct-cam-error--inner {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
}

.ekyct-cam-error--inner span, .ekyct-cam-error--inner p {
    color: #ff7011;
    font-size: 14px;
    text-align: center;
}

.ekyct-cam-error--inner svg {
    fill: currentColor;
    width: 96px;
    height: 96px;
}

.ekyct-shading {
    position: absolute;
    border-style: solid;
    border-color: rgba(0, 0, 0, 0.48);
}

.ekyct-shader-border {
    position: absolute;
    background-color: #ffffff;
}

@media (min-width: 768px) {
    .ekyct-video {
        max-width: 576px
    }
}

@media (min-width: 992px) {
    .ekyct-video {
        max-width: 768px;
    }
}

</style>`;

export const EkycCloseBtnSVG = '<svg viewBox="0 0 24 24"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>';
export const EkycFileBtnSVG = '<svg viewBox="0 0 24 24"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"></path></svg>';
export const EkycCaptureBtnSVG = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"></circle><path d="M9 2 7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"></path></svg>';
export const EkycRecordBtnSVG = '<svg viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"></path></svg>';
export const EkycSwitchCamSVG = '<svg viewBox="0 0 24 24"><path d="M16 7h-1l-1-1h-4L9 7H8c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm-4 7c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"></path><path d="m8.57.51 4.48 4.48V2.04c4.72.47 8.48 4.23 8.95 8.95h2C23.34 3.02 15.49-1.59 8.57.51zm2.38 21.45c-4.72-.47-8.48-4.23-8.95-8.95H0c.66 7.97 8.51 12.58 15.43 10.48l-4.48-4.48v2.95z"></path></svg>';
export const EkycCamErrorSVG = '<svg viewBox="0 0 24 24"><path d="M12 5.99 19.53 19H4.47L12 5.99M12 2 1 21h22L12 2z"></path><path d="M13 16h-2v2h2zm0-6h-2v5h2z"></path></svg>'
