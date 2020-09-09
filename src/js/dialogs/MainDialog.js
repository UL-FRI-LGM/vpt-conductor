// #package js/main

// #include ../utils
// #include AbstractDialog.js

// #include ../../uispecs/MainDialog.json
// #include ../../html/AboutText.html

class MainDialog extends AbstractDialog {

constructor(options) {
    super(UISPECS.MainDialog, options);

    this._handleRendererChange = this._handleRendererChange.bind(this);
    this._handleToneMapperChange = this._handleToneMapperChange.bind(this);

    this._binds.sidebar.appendTo(document.body);
    this._binds.rendererSelect.addEventListener('change', this._handleRendererChange);
    this._binds.toneMapperSelect.addEventListener('change', this._handleToneMapperChange);

    const about = DOMUtils.instantiate(TEMPLATES.AboutText);
    this._binds.about._element.appendChild(about);
}

getVolumeLoad_container() {
    return this._binds.volumeLoad_container;
}
getTreeViewContainer() {
    return this._binds.TreeViewContainer;
}

getAttribLoad_container() {
    return this._binds.attribLoad_container;
}

getEnvmapLoad_container() {
    return this._binds.envmapLoad_container;
}

getVisibility_container() {
    return this._binds.visibility_container;
}

getRendererSettings_container() {
    return this._binds.rendererSettings_container;
}

getToneMapperSettings_container() {
    return this._binds.toneMapperSettings_container;
}

getRenderingContextSettings_container() {
    return this._binds.renderingContextSettings_container;
}

getSelectedRenderer() {
    return this._binds.rendererSelect.getValue();
}

getSelectedToneMapper() {
    return this._binds.toneMapperSelect.getValue();
}

_handleRendererChange() {
    const renderer = this._binds.rendererSelect.getValue();
    this.trigger('rendererchange', renderer);
}

_handleToneMapperChange() {
    const toneMapper = this._binds.toneMapperSelect.getValue();
    this.trigger('tonemapperchange', toneMapper);
}

disableMCC() {
    this._binds.rendererSelect.removeOption('mcc');
}

}
