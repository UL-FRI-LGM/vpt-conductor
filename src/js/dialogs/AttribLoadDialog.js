// #package js/main

// #include AbstractDialog.js

// #include ../../uispecs/AttribLoadDialog.json

class AttribLoadDialog extends AbstractDialog {

constructor(options) {
    super(UISPECS.AttribLoadDialog, options);

    this._handleLoadClick = this._handleLoadClick.bind(this);
    this._handleFileChange = this._handleFileChange.bind(this);

    this._addEventListeners();
}

_addEventListeners() {
    this._binds.loadButton.addEventListener('click', this._handleLoadClick);
    this._binds.attribFile.addEventListener('change', this._handleFileChange);
    this._binds.layoutFile.addEventListener('change', this._handleFileChange);
}

_handleLoadClick() {
    const attribFile = this._binds.attribFile.getFiles()[0];
    const layoutFile = this._binds.layoutFile.getFiles()[0];
    this.trigger('load', { attribFile, layoutFile });
}

_handleFileChange() {
    this._updateLoadButtonAndProgressVisibility();
}

_updateLoadButtonAndProgressVisibility() {
    const attribFiles = this._binds.attribFile.getFiles();
    const layoutFiles = this._binds.layoutFile.getFiles();
    const bothSelected = attribFiles.length > 0 && layoutFiles.length > 0;
    this._binds.loadButtonAndProgress.setVisible(bothSelected);
}

}
