// #package js/main

// #include AbstractDialog.js

// #include ../../uispecs/VisibilityDialog.json

class VisibilityDialog extends AbstractDialog {

constructor(options) {
    super(UISPECS.VisibilityDialog, options);

    this.groups = [];
    this.attributes = [];
    this.elements=[];
    this._colorSeed = Math.random();

    this._registerEventListeners();
    this._addEventListeners();
}

_registerEventListeners() {
    this._handleAddGroupClick = this._handleAddGroupClick.bind(this);
    this._handleGroupChange = this._handleGroupChange.bind(this);
    this._handleVisChange = this._handleVisChange.bind(this);
    this._handleColorChange =  this._handleColorChange.bind(this);
    this._handleChange =  this._handleChange.bind(this);
}

_addEventListeners() {
    this._binds.addGroupButton.addEventListener('click', this._handleAddGroupClick);
    this._binds.removalSelect.addEventListener('change', this._handleChange);
    this._binds.ks.addEventListener('change', this._handleChange);
    this._binds.kt.addEventListener('change', this._handleChange);
    this._binds.removalAutoUpdate.addEventListener('change', this._handleChange);
}
_setRenderer(renderer){
    this._renderer=renderer;
}
  _handleChange() {    
    this._renderer._ks = this._binds.ks.getValue();
    this._renderer._kt = this._binds.kt.getValue();

    const removalMethod=this._binds.removalSelect.getValue()
    if( removalMethod =='depth')
    {
      this._renderer._removalSelect = 0;
    }
    else if( removalMethod =='CPF')
    {
      this._renderer._removalSelect = 1;
    }
    else //if( removalMethod =='Random')
    {
      this._renderer._removalSelect = 2;
    }
    this._renderer._removalAutoUpdate = this._binds.removalAutoUpdate.isChecked();
    this._renderer.reset(); 
}
reset() {
    for (const group of this.groups) {
        group.object.destroy();
    }
    this.groups = [];
}

setAttributes(attributes, elementsJSON) {
    this.attributes = attributes;
    this.elements = elementsJSON;
}

getGroups() {
    return this.groups.map(group => ({
        attribute  : group.binds.attribute.getValue(),
        range      : group.binds.range.getValue(),
        visibility : group.binds.visibility.getValue(),
        color      : group.binds.color.getValue(),
        isLocked    : group.object.isLocked,// TODO: add locked  
    }));
}

_handleAddGroupClick() {
    this._addGroup();
}

_handleVisChange(group) {
    group.binds.visibility.setValue2(group.binds.visibility.getMaxValue() - group.binds.visibility.getValue());
    this.trigger('change');
}
_handleGroupChange(group) {
    var  className = group.binds.attribute.getValue();
    var range = group.binds.range.getValue();
    group.object.elements = this._getGroupElements([className], [range.y], [range.x]);
    //console.log(group.object.elements);
    this.trigger('change');
}
_handleColorChange() {
    this.trigger('change');
}
_addGroup() {
    const group = UI.create(UISPECS.VisibilityGroup);
    const { object, binds } = group;
    group.object.isLocked = false;
    this.groups.push(group);

    this._binds.group_container.add(object);
    binds.spacer._element.classList.add('visibility-group');

    const controlPanel = DOMUtils.instantiate(TEMPLATES.VisibilityGroupControlPanel);
    const controlPanelButtons = DOMUtils.bind(controlPanel);
    binds.controlPanel._element.appendChild(controlPanel);

    for (const attribute of this.attributes) {
        binds.attribute.addOption(attribute, attribute);
    }
    binds.attribute.setValue(this.attributes[0]);

    const hsvColor = {
        h: this._colorSeed,
        s: 0.5,
        v: 0.95
    };
    const rgbColor = CommonUtils.hsv2rgb(hsvColor);
    const hexColor = CommonUtils.rgb2hex(rgbColor);
    binds.color.setValue(hexColor);

    const goldenRatioInverse = 0.618033988749895;
    this._colorSeed = (this._colorSeed + goldenRatioInverse) % 1;

    controlPanelButtons.up.addEventListener('click', e => this._moveUp(group));
    controlPanelButtons.down.addEventListener('click', e => this._moveDown(group));
    controlPanelButtons.delete.addEventListener('click', e => this._delete(group));
    controlPanelButtons.locked.addEventListener('click', e => this._lockedChange(group));

    binds.attribute.addEventListener('change', e => this._handleGroupChange(group));
    binds.range.addEventListener('change', e => this._handleGroupChange(group));
    binds.visibility.addEventListener('change',  e => this._handleVisChange(group));
    binds.color.addEventListener('change', this._handleColorChange);

   // var  className = group.binds.attribute.getValue();
   // var range = group.binds.range.getValue();
   // group.object.elements = this._getGroupElements([className], [range.y], [range.x]);
    this.trigger('retopo');
    return group;
}
_getGroupElements(className, hiList, loList) {
    var el = clone(this.elements);
    for (var j = 0; j < className.length; j++) {
      if (hiList[j] == null)
        break;
      el = el.filter(x => x[className[j]] <= hiList[j] && x[className[j]] >= loList[j])
    }
    return el;
  }
_moveUp(group) {
    const index = this.groups.indexOf(group);
    if (index === 0) {
        return;
    }

    const temp = this.groups[index];
    this.groups[index] = this.groups[index - 1];
    this.groups[index - 1] = temp;

    this._binds.group_container._element.insertBefore(
        group.object._element, group.object._element.previousSibling);

    this.trigger('retopo');
}

_moveDown(group) {
    const index = this.groups.indexOf(group);
    if (index === this.groups.length - 1) {
        return;
    }

    const temp = this.groups[index];
    this.groups[index] = this.groups[index + 1];
    this.groups[index + 1] = temp;

    this._binds.group_container._element.insertBefore(
        group.object._element.nextSibling, group.object._element);

    this.trigger('retopo');
}

_delete(group) {
    const index = this.groups.indexOf(group);
    this.groups.splice(index, 1);
    group.object.destroy();
    this.trigger('retopo');
}
_lockedChange(group) {
    group.object.isLocked = !(group.object.isLocked);
    if(group.object.isLocked==true)
    {
        group.binds.visibility.disable();
    }
    else
    {
        group.binds.visibility.enable();
    }
    this.trigger('change');
}
  _updateOccludedInstance(_rulesInfo)
  {
      var index=0;
      this.groups.forEach(group=>{
        const { object, binds } = group;
        if(_rulesInfo[index]==undefined)
        {
            return;
        }
            var nVisInstances = _rulesInfo[index].nInstances-_rulesInfo[index].nRemoved;
            var occludedInstance = nVisInstances-_rulesInfo[index].nSeen;
            
            binds.visibility.setValue2(binds.visibility.getMaxValue() - binds.visibility.getValue());
            binds.visibility.setValue3((occludedInstance/_rulesInfo[index].nInstances)*100);
        
        index++;

      });
  }
}

function clone(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    var copy = new obj.constructor();
    for (var attr in obj) {
      if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
    }
    return copy;
}