// #package js/main

// #include UIObject.js

// #include ../../html/ui/TreeView.html

class TreeView extends UIObject {

constructor(options) {
    super(TEMPLATES.TreeView, options);

    Object.assign(this, {
        label      : ''
    }, options);


    //this._binds.input.value = this.label;
}

setEnabled(enabled) {
    super.setEnabled(enabled);
    this._binds.input.disabled = !enabled;

}

}
