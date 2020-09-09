// #package js/main

// #include UIObject.js

class ColorChooser extends UIObject {

    constructor(options) {
        super(TEMPLATES.ColorChooser, options);

        Object.assign(this, {
            value: null
        }, options);

        this._handleInput = this._handleInput.bind(this);
        this._handleClick = this._handleClick.bind(this);

        const input = this._binds.input;
        input.addEventListener('input', this._handleInput);

        if (this.value !== null) {
            input.value = this.value;
        }
        this._binds.color.style.backgroundColor = input.value /* + alpha */;
        this._element.addEventListener('click', this._handleClick);

        //const colorOverlay = this._binds.colorOverlay;
        //colorOverlay.addEventListener('click', this._handleOverlayClick);
    }

    setEnabled(enabled) {
        this._binds.input.disabled = !enabled;
        super.setEnabled(enabled);
    }

    _updateColorBar() {
        this._binds.color.style.backgroundColor = this._binds.input.value /* + alpha */;
    }

    _handleInput(e) {
        this._updateColorBar();
    }

    _handleClick() {        
        this._binds.input.click();        
    }

    getValue() {
        return this._binds.input.value;
    }

    setValue(value) {        
        this._binds.input.value = value;
        this._updateColorBar();

        this.trigger('change');
    }
   
    showOverlay() {
        this._binds.colorOverlay.style.visibility = 'visible';
    }

    hideOverlay() {
        this._binds.colorOverlay.style.visibility = 'hidden';
    }
}
