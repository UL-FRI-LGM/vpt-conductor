// #package js/main

// #include ../AbstractDialog.js
// #include ../../TransferFunctionWidget.js

// #include ../../../uispecs/renderers/DOSRendererDialog.json

class DOSRendererDialog extends AbstractDialog {

constructor(renderer, options) {
    super(UISPECS.DOSRendererDialog, options);

    this._renderer = renderer;

    this._handleChange = this._handleChange.bind(this);
    this._handleTFChange = this._handleTFChange.bind(this);
    this._handleSamplesChange = this._handleSamplesChange.bind(this);

    this._binds.steps.addEventListener('input', this._handleChange);
    this._binds.slices.addEventListener('input', this._handleChange);
    this._binds.extinction.addEventListener('input', this._handleChange);
    this._binds.aperture.addEventListener('input', this._handleChange);
    this._binds.samples.addEventListener('input', this._handleSamplesChange);

    this._binds.colorBias.addEventListener('change', this._handleChange);
    this._binds.alphaBias.addEventListener('change', this._handleChange);
    this._binds.alphaTransfer.addEventListener('change', this._handleChange);
    this._binds.cutDepth.addEventListener('change', this._handleChange);

    this._binds.showBoundingBox.addEventListener('change', this._handleChange);
    this._binds.showAxes.addEventListener('change', this._handleChange);
    this._binds.boundingBoxColor.addEventListener('change', this._handleChange);


    this._tfwidget = new TransferFunctionWidget();
    this._binds.tfContainer.add(this._tfwidget);
    this._tfwidget.addEventListener('change', this._handleTFChange);
}

_handleChange() {
    this._renderer.steps = this._binds.steps.getValue();
    this._renderer.slices = this._binds.slices.getValue();
    this._renderer.extinction = this._binds.extinction.getValue();
    this._renderer.aperture = this._binds.aperture.getValue();
    this._renderer.colorBias = this._binds.colorBias.getValue();
    this._renderer.alphaBias = this._binds.alphaBias.getValue();
    this._renderer.alphaTransfer = this._binds.alphaTransfer.getValue();
    this._renderer.cutDepth = this._binds.cutDepth.getValue();

    this._renderer.showBoundingBox = this._binds.showBoundingBox.isChecked();
    this._renderer.showAxes = this._binds.showAxes.isChecked();
    var rgb = CommonUtils.hex2rgb(this._binds.boundingBoxColor.getValue());
    this._renderer.setBoundingBoxColor([rgb.r, rgb.g, rgb.b]); 
    this._renderer.reset(); 
}

_handleSamplesChange() {
    this._renderer.samples = this._binds.samples.getValue();
    this._renderer.generateOcclusionSamples();
    this._renderer.reset();
}

_handleTFChange() {
    this._renderer.setTransferFunction(this._tfwidget.getTransferFunction());
    this._renderer.reset();
}

}
