// #package js/main

// #include ../utils
// #include UIObject.js

class SliderRangeMultiTrack extends UIObject {

    constructor(options) {
        super(TEMPLATES.SliderRangeMultiTrack, options);

        Object.assign(this, {
            valueRangeMin: 0,
            valueRangeMax: 100,
            value2: 0,
            value3: 0,
            min: 0,
            max: 100,
            step: 1,
            logarithmic: false
        }, options);

        this._handleMouseDown = this._handleMouseDown.bind(this);
        this._handleMouseUp = this._handleMouseUp.bind(this);
        this._handleMouseMove = this._handleMouseMove.bind(this);

        this._updateUI();

        this._element.addEventListener('mousedown', this._handleMouseDown);

        this.setValueRangeMin(this.min);
        this.setValueRangeMax(this.max);
    }

    destroy() {
        document.removeEventListener('mouseup', this._handleMouseUp);
        document.removeEventListener('mousemove', this._handleMouseMove);

        super.destroy();
    }

    setValueRangeMin(value) {
        this.valueRangeMin = Math.min(CommonUtils.clamp(value, this.min, this.max), this.valueRangeMax);
        this._updateUI();
        this.trigger('change');
    }

    setValueRangeMax(value) {
        this.valueRangeMax = Math.max(CommonUtils.clamp(value, this.min, this.max), this.valueRangeMin);
        this._updateUI();
        this.trigger('change');
    }

    setValue2(value) {
        this.value2 = CommonUtils.clamp(value, this.min, this.max);
        this._updateUI();
        this.trigger('change');
    }

    setValue3(value) {
        this.value3 = CommonUtils.clamp(value, this.min, this.max);
        this._updateUI();
        this.trigger('change');
    }

    _updateUI() {
        if (this.logarithmic) {
            const logmin = Math.log(this.min);
            const logmax = Math.log(this.max);
            const ratio = (Math.log(this.value) - logmin) / (logmax - logmin) * 100;
            this._binds.button.style.marginLeft = ratio + '%';
        } else {
            const ratioMin = (this.valueRangeMin - this.min) / (this.max - this.min) * 100;
            this._binds.buttonRangeMin.style.marginLeft = ratioMin + '%';

            const ratioMax = (this.valueRangeMax - this.min) / (this.max - this.min) * 100;
            this._binds.buttonRangeMax.style.marginLeft = ratioMax + '%';

            const ratio2 = (this.value2 - this.min) / (this.max - this.min) * 100;
            this._binds.track2.style.width = ratio2 + '%';

            const ratio3 = (this.value3 - this.min) / (this.max - this.min) * 100;
            this._binds.track3.style.width = ratio3 + '%';
        }
    }

    getRangeMin() {
        return this.valueRangeMin;
    }

    getRangeMax() {
        return this.valueRangeMax;
    }

    _setValueByEvent(e) {
        const rect = this._binds.container.getBoundingClientRect();
        const ratio = (e.pageX - rect.left) / (rect.right - rect.left);
        if (this.logarithmic) {
            const logmin = Math.log(this.min);
            const logmax = Math.log(this.max);
            const value = Math.exp(logmin + ratio * (logmax - logmin));
            this.setValueRangeMax(value);
        } else {
            const value = this.min + ratio * (this.max - this.min);

            if (e.target.dataset.bind == "buttonRangeMax" ||
                (Math.abs(value - this.getRangeMax()) < Math.abs(value - this.getRangeMin()))) {
                this.setValueRangeMax(value);
            } else {
                this.setValueRangeMin(value);
            }
        }
    }

    _handleMouseDown(e) {
        document.addEventListener('mouseup', this._handleMouseUp);
        document.addEventListener('mousemove', this._handleMouseMove);

        this._setValueByEvent(e);
    }

    _handleMouseUp(e) {
        document.removeEventListener('mouseup', this._handleMouseUp);
        document.removeEventListener('mousemove', this._handleMouseMove);

        this._setValueByEvent(e);
    }

    _handleMouseMove(e) {
        e.preventDefault();
        
        this._setValueByEvent(e);
    }

}
