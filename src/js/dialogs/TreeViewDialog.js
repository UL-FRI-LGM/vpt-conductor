// #package js/main


// #include AbstractDialog.js
// #include ../loaders/AttributesParser.js

// #include ../../uispecs/TreeViewDialog.json

class TreeViewDialog extends AbstractDialog {

  constructor(options) {
    super(UISPECS.TreeViewDialog, options);
    TVDClass = this;
    this.rules = [];
    this.colors;

    this._handleCreateHTreeButton = this._handleCreateHTreeButton.bind(this);
    this._handleChange = this._handleChange.bind(this);
    this._createAbstractTree = this._createAbstractTree.bind(this);

    this._binds.createTreeButton.addEventListener('click', this._handleCreateHTreeButton);
    this._binds.resetTreeButton.addEventListener('click', this._createAbstractTree);
    this._binds.dynamicTree.setGeneratedTree(this);
    this._binds.removalSelect.addEventListener('change', this._handleChange);
    this._binds.ks.addEventListener('change', this._handleChange);
    this._binds.kt.addEventListener('change', this._handleChange);
    this._binds.removalAutoUpdate.addEventListener('change', this._handleChange);
    // this._binds.useCameraAsMS.addEventListener('change', this._handleChange);
    //this._binds.meltingPos.addEventListener('change', this._handleChange);
    //this._binds.useShadingTerm.addEventListener('change', this._handleChange);
    //this._binds.useAccOpacityTerm.addEventListener('change', this._handleChange);
    // this._binds.useDistTerm.addEventListener('change', this._handleChange);
    // this._binds.useDistTerm.addEventListener('change', this._handleChange);
    // this._binds.Ca.addEventListener('change', this._handleChange);
    // this._binds.Cd.addEventListener('change', this._handleChange);
    // this._binds.Cs.addEventListener('change', this._handleChange);
    // this._binds.Ce.addEventListener('change', this._handleChange);

  }
  _setRenderer(renderer) {
    this._renderer = renderer;
  }
  _handleChange() {
    this._renderer._ks = this._binds.ks.getValue();
    this._renderer._kt = this._binds.kt.getValue();

    const removalMethod = this._binds.removalSelect.getValue()
    if (removalMethod == 'depth') {
      this._renderer._removalSelect = 0;
    }
    else if (removalMethod == 'CPF') {
      this._renderer._removalSelect = 1;
    }
    else //if( removalMethod =='Random')
    {
      this._renderer._removalSelect = 2;
    }

    this._renderer._removalAutoUpdate = this._binds.removalAutoUpdate.isChecked();
    //this._renderer._useCameraAsMS = this._binds.useCameraAsMS.isChecked();
    //this._renderer._useShadingTerm = this._binds.useShadingTerm.isChecked()? 1:0 ;
    //this._renderer._useAccOpacityTerm = this._binds.useAccOpacityTerm.isChecked()? 1:0 ;
    /*this._renderer._useDistTerm = this._binds.useDistTerm.isChecked()? 1:0 ;
    this._renderer._Ca = this._binds.Ca.getValue();
    this._renderer._Cd = this._binds.Cd .getValue();
    this._renderer._Cs = this._binds.Cs.getValue();
    this._renderer._Ce = this._binds.Ce.getValue();

    const position = this._binds.meltingPos.getValue();
    this._renderer._meltingSourcePos[0] = position.x;
    this._renderer._meltingSourcePos[1] = position.y;
    this._renderer._meltingSourcePos[2] = position.z;*/
    this._renderer.reset();
  }
  _updateOccludedInstance(_rulesInfo) {
    var index = 0;
    for (var index = 0; index < this.rules.length; index++) {
      var nVisInstances = _rulesInfo[index].nInstances - _rulesInfo[index].nRemoved;
      this.rulesNodes[index].occludedInstance = nVisInstances - _rulesInfo[index].nSeen;
    }

    this._countOccludedInstances(Htree);
  }

  _countOccludedInstances(node) {
    if (node.children == null) {
      this.updateSliderTracks(node);
      return node.occludedInstance;
    }
    else {
      var count = 0;
      node.children.forEach((item) => {
        count += this._countOccludedInstances(item);
      });
      node.occludedInstance = count;
      this.updateSliderTracks(node);
    }
    return node.occludedInstance;
  }

  computeHistograms(visibility) {
    this._computeHistogramForNode(Htree, visibility);
  }

  _computeHistogramForNode(node, visibility) {

    if (!node.isroot) {
      this._computeNodeHistogram(node, visibility);
    }

    if (node.children != null) {
      node.children.forEach((item) => {
        this._computeHistogramForNode(item, visibility);
      });
    }
  }

  _computeNodeHistogram(node, visibility) {
    var histogram = [];

    var scale = 1;

    while ((node.hi - node.lo) * scale < node.sliderObj.object.histColumns) {
      scale *= 10;
    }

    for (var i = node.lo * scale; i <= node.hi * scale; i += 1) {
      var index = Math.round(i);
      histogram[index] = 0;
    }

    var name = node.name.indexOf("[") > -1 ? node.parent.name : node.name;

    // select all visible instances based on [min-max] interval
    for (var i = 0; i < node.elements.length; i++) {
      var elem = node.elements[i];

      if (visibility[elem.id] == 0) {
        continue;
      }

      var value = elem[name] * scale;

      if (value >= node.lo * scale && value <= node.hi * scale) {
        var index = Math.round(value);

        if (isNaN(histogram[index])) {
          histogram[index] = 0;
        }

        histogram[index] += 1;
      }
    }

    node.sliderObj.object.setHistogram(histogram, node.lo * scale, node.hi * scale);
  }

  updateSliderTracks(node) {
    node.sliderObj.object.setValue2(node.sliderObj.object.getMaxValue() - node.sliderObj.object.getValue());
    node.sliderObj.object.setValue3((node.occludedInstance / node.nInstances) * 100);
  }

  _getGroupOfRules() {
    //console.log(Htree);
    this.rules = [];
    this.rulesNodes = [];
    this.extractRulesFromTree(Htree, [], [], []);

    //console.log(this.rules);
    return this.rules;
  }

  extractRulesFromTree(node, attributeList, hiList, loList) {
    if (node.children === null)// leaf node
    {
      var obj = new Object();
      attributeList.push(node.parent.name);
      hiList.push(node.hi);
      loList.push(node.lo);
      //console.log(node.parent.name);
      //--------------------------------------
      obj.attribute = JSON.parse(JSON.stringify(attributeList));;
      obj.hi = JSON.parse(JSON.stringify(hiList));
      obj.lo = JSON.parse(JSON.stringify(loList));
      obj.visibility = node.sliderValue;
      obj.nInstances = node.nInstances;
      obj.color = node.color;
      obj.isLocked = node.isDisabled;
      this.rulesNodes.push(node);
      this.rules.push(JSON.parse(JSON.stringify(obj)));
      //---------------------------------------
      obj = [];
      attributeList.pop();
      hiList.pop();
      loList.pop();
    }
    else //if(node.children!=null)//not leaf node
    {
      if (node.isClassName == false && node.isroot == false) {
        attributeList.push(node.parent.name);//console.log(node.hi);
        hiList.push(node.hi); //console.log(node.hi);
        loList.push(node.lo); //console.log(node.lo);
      }
      node.children.forEach((child) => {
        this.extractRulesFromTree(child, attributeList, hiList, loList);

      });
      if (node.isClassName == false && node.isroot == false) {
        attributeList.pop();
        hiList.pop();
        loList.pop();
      }

    }
  }

  //instance.sort((a, b) => parseFloat(a.avgProb) - parseFloat(b.avgProb));
  setAttributes(layout, elementsData) {

    this.layout = layout;
    propertyList = [];
    //--------------------------------
    nbProperty = 0;
    layout.forEach(x => {
      var d = { text: "", id: "", expanded: true, iconCls: "fa fa-folder", hi: "", lo: "", type: "" };
      d.id = nbProperty;
      d.text = x.name;
      d.hi = x.hi;
      d.lo = x.lo;
      d.type = x.type;

      if (x.values) {
        d.values = x.values;
      }

      nbProperty++;
      propertyList.push(d);
    });
    //-----------------------------
    this._createAbstractTree();
    //----- read elements ------------
    //console.log(attributes);
    //console.log(layout);

    // CSV parsing
    //var csv = new TextDecoder().decode(attributes);
    //elementsArray = this.csvJSON(csv);


    elementsArray = elementsData;
    //console.log(elementsArray);
  }

  //var csv is the CSV file with headers
  csvJSON(csv) {
    csv = csv.replace(/(\r)/gm, "");
    var lines = csv.split("\n");
    var result = [];

    var headers = lines[0].split(",");

    for (var i = 1; i < lines.length; i++) {

      var obj = {};
      var currentline = lines[i].split(",");

      for (var j = 0; j < headers.length; j++) {
        var header = String(headers[j]).replace(/^\s+|\s+$/gm, '');
        obj[header] = currentline[j];
      }

      result.push(obj);

    }
    return result; //JavaScript object
    //return JSON.stringify(result); //string
  }

  reset() {
    this._createAbstractTree();
    //console.log(this._renderer);
    //console.log(this._binds);
  }


  _createAbstractTree = function () {
    /*// TEST purposes only!!!
    propertyList = [];
    propertyList.push({ text: "aaa", hi: 100, lo: 0 });
    propertyList.push({ text: "bbb", hi: 111, lo: 0 });
    propertyList.push({ text: "ccc", hi: 222, lo: 0 });
    propertyList.push({ text: "ddd", hi: 333, lo: 0 });
    */

    this._binds.dynamicTree.reset();
    this._binds.dynamicTree.createHeader(propertyList);


  }

  _handleCreateHTreeButton = function () {
    // this is wrong! there should be only one .root in the document, so the .root should be id not a className
    var roots = document.getElementsByClassName("root");
    for (var i = 0; i < roots.length; i++) {
      var root = roots[i];
      while (root.firstChild) {
        root.removeChild(root.lastChild);
      }
    }

    Htree = null;

    var json = this._binds.dynamicTree.getJSON();
    jsonHArr = JSON.stringify(json);

    jsonView.format(jsonHArr, '.root');
    TVDClass.trigger('treeTopologyChange');
  }

  getAllTreeNodes(parent) {
    var array = [];

    if (parent == null) {
      return array;
    }

    array.push(parent);

    if (parent.children != null) {
      for (var i = 0; i < parent.children.length; i++) {
        var sub = this.getAllTreeNodes(parent.children[i]);

        for (var j = 0; j < sub.length; j++) {
          array.push(sub[j]);
        }
      }
    }

    return array;
  }

  getColors() {
    var nodes = this.getAllTreeNodes(Htree);

    var colors = [];
    for (var i = 0; i < nodes.length; i++) {
      colors.push(nodes[i].color);
    }

    return colors;
  }

  setColors(colors) {
    var nodes = this.getAllTreeNodes(Htree);
        
    for (var i = 0; i < Math.min(colors.length, nodes.length); i++) {  
      if(colors[i] != "#ffffffff") {
        nodes[i].colorObj.object.setValue(colors[i]);
        nodes[i].color = colors[i];   
      }   
    }
  }

  getValues() {
    var nodes = this.getAllTreeNodes(Htree);
    
    var values = [];
    for (var i = 0; i < nodes.length; i++) {
      values.push(nodes[i].sliderObj.object.value);
    }

    return values;
  }

  setValues(values) {
    var nodes = this.getAllTreeNodes(Htree);
    
    for (var i = 0; i < Math.min(values.length, nodes.length); i++) {  
      if(nodes[i].children == null || nodes[i].children.length == 0) {      
        nodes[i].sliderValue = values[i];   
        nodes[i].sliderObj.object.setValue(values[i], true);                
      }    
    }

    TVDClass.trigger('treeSliderChange');    
  }
}

//======================================================================================
var TVDClass;
var Htree;
var colorsToSet;
var valuesToSet;
let propertyList = new Array();
let elementsArray = new Array();
var nbProperty = 0;
var jsonHArr = '';
//*************************************************************************************/
function removeElement(elementId) {
  // Removes an element from the document
  var element = document.getElementById(elementId);
  element.parentNode.removeChild(element);
}
var index_counter = 0;
function extractInfoTree(node, index_prop) {
  var obj = new Object();
  if (node !== null) {
    if (node.isClassName == false && node.isroot == false) {
      obj.attribute = node.parent.property;
      obj.ind = index_counter;
      index_counter++;
      obj.value = index_prop;
      obj.visibility = node.sliderValue;
      obj.nInstances = node.nInstances;
      obj.color = node.color;
    }
    else
      obj.attribute = null;
    if (node.children != null) {
      var ind = 0;
      obj.children = [];
      node.children.forEach((child) => {
        obj.children.push(extractInfoTree(child, ind));
        ind++;
      });
    }
    return obj;
  }
  return null;
}

function saveJSON(data) {
  //let data = "Whatever it is you want to save";
  let bl = new Blob([data], {
    type: "text/html"
  });
  let a = document.createElement("a");
  a.href = URL.createObjectURL(bl);
  a.download = "data.json";
  a.hidden = true;
  document.body.appendChild(a);
  a.innerHTML =
    "someinnerhtml";
  a.click();
}
function createJSONFromDTree(nav) {

  var obj = new Array();
  for (n = 0; n < nav.length; n++) {
    obj.push(createJSONHierarchyTree(nav[n]));
  }
  return obj;
}
function createJSONHierarchyTree(nav) {
  //console.log(nav);

  if (nav !== null) {
    var obj = new Object();

    obj.name = nav['suiTreeviewListItem']['text'];
    obj.path = obj.path ? "." : "" + node.parent.property;
    //obj.id=nav['suiTreeviewListItem']['id'];
    obj.lo = Math.floor(nav['suiTreeviewListItem']['lo']);
    obj.hi = Math.ceil(nav['suiTreeviewListItem']['hi']);
    obj.type = nav['suiTreeviewListItem']['type'];
    //---------------------------------------
    obj.groups = [];
    var r = (obj.hi - obj.lo) / 4; //just for now divide it to 4 groups
    var lo = obj.lo;
    var hi = obj.lo + r;
    for (var i = 1; i <= 4; i++) {
      var group = new Object();
      group.lo = lo;
      group.hi = hi;
      group.name = ('[' + lo + '~' + hi + ']').replace(/^\s+|\s+$/gm, '');;
      obj.groups.push(group);
      lo = hi;
      hi = lo + r;
    }
    //------------------------------------------
    obj.children = [];
    if (nav['child'].length !== 0) {
      nav['child'].forEach(x => {
        obj.children.push(createJSONHierarchyTree(x));
      });
    }

    return obj;
  }
  return null;
}

//================================================================================================
(function () {
  'use strict';

  function createElement(storageType, config) {
    const htmlElement = document.createElement(storageType);

    if (config === undefined) {
      return htmlElement;
    }

    if (config.className) {
      htmlElement.className = config.className;
    }

    if (config.content) {
      htmlElement.textContent = config.content;
    }

    if (config.children) {
      config.children.forEach((el) => {
        if (el !== null) {
          htmlElement.appendChild(el);
        }
      });
    }

    return htmlElement;
  }


  function createExpandedElement(node) {
    const iElem = createElement('i');
    if (node.expanded) {
      iElem.className = 'fas fa-caret-down';
    } else {
      iElem.className = 'fas fa-caret-right';
    }

    const caretElem = createElement('div', {
      className: 'caret-icon',
      children: [iElem],
    });

    const handleClick = node.toggle.bind(node);
    caretElem.addEventListener('click', handleClick);
    const propertyElem = createElement('div', {
      className: 'property',
      content: node.name,
    });
    const div_Lock = createElement('div', {
      className: 'treeLock'
    });
    const div2 = createElement('div', {
      className: 'lock unlocked'
    });
    const handleLockChange = node.LockChange.bind(node);
    div2.addEventListener('click', handleLockChange);
    div_Lock.appendChild(div2);


    //---------------New Slider--------------------------------
    //---------------New Slider--------------------------------
    node.sliderObj = UI.create({
      "type": "slider-multi-track",
      "bind": "sliderChange",
      "value": 100,
      "value2": 0,
      "value3": 0,
      "min": 0,
      "max": 100,
      "step": 1
    });

    const div_slider = node.sliderObj.object._element;
    updateSliderTracks(node);
    const handleSliderChange = node.sliderChange.bind(node);
    node.sliderObj.binds.sliderChange.addEventListener('change', handleSliderChange);
    //--------------------------------------------------------

    node.colorObj = UI.create({
      "type": "color-chooser",
      "bind": "colorChange",
      "value": '#ffffffff' //getRandomHexColor()
    });
    node.colorObj.object._element.classList.toggle('color-chooser-small', true);
    node.colorObj.object.showOverlay();

    node.color = "#ffffffff"; //node.colorObj.object.getValue();

    const div_colorChooser = node.colorObj.object._element;
    const handleColorChange = node.ColorChange.bind(node);
    node.colorObj.binds.colorChange.addEventListener('change', handleColorChange);

    let lineChildren;
    if (node.isroot == true)//|| node.parent.isroot==true)
    {
      //lineChildren = [caretElem,typeElem]
      lineChildren = [caretElem, propertyElem]
    }
    else {
      lineChildren = [caretElem, propertyElem, div_slider, div_colorChooser, div_Lock];
    }

    const lineElem = createElement('div', {
      className: 'line',
      children: lineChildren
    });

    if (node.depth > 0) {
      lineElem.style = 'margin-left: ' + node.depth * 20 + 'px;';
    }
    return lineElem;
  }

  function clone(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    var copy = new obj.constructor();
    for (var attr in obj) {
      if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
    }
    return copy;
  }


  function createNotExpandedElement(node) {
    const caretElem = createElement('div', {
      className: 'empty-icon',
    });

    const propertyElem = createElement('div', {
      className: 'property',
      content: node.name
    });
    const div_Lock = createElement('div', {
      className: 'treeLock'
    });
    const div2 = createElement('div', {
      className: 'lock unlocked'
    });
    const handleLockChange = node.LockChange.bind(node);
    div2.addEventListener('click', handleLockChange);
    div_Lock.appendChild(div2);


    //---------------New Slider--------------------------------
    node.sliderObj = UI.create({
      "type": "slider-multi-track",
      "bind": "sliderChange",
      "value": 100,
      "value2": 0,
      "value3": 0,
      "min": 0,
      "max": 100,
      "step": 1
    });
    const div_slider = node.sliderObj.object._element;
    updateSliderTracks(node);
    const handleSliderChange = node.sliderChange.bind(node);
    node.sliderObj.binds.sliderChange.addEventListener('change', handleSliderChange);
    //--------------------------------------------------------    
    node.colorObj = UI.create({
      "type": "color-chooser",
      "bind": "colorChange",
      "value": getRandomHexColor()
    });
    node.colorObj.object._element.classList.toggle('color-chooser-small', true);
    //node.colorObj.object.showOverlay();

    node.color = node.colorObj.object.getValue();

    const div_colorChooser = node.colorObj.object._element;
    const handleColorChange = node.ColorChange.bind(node);
    node.colorObj.binds.colorChange.addEventListener('change', handleColorChange);


    var arr = [caretElem, propertyElem, div_slider, div_colorChooser, div_Lock];
    const lineElem = createElement('div', {
      className: 'line',
      children: arr
    });

    if (node.depth > 0) {
      lineElem.style = 'margin-left: ' + node.depth * 20 + 'px;';
    }

    return lineElem;
  }

  var _colorSeed = Math.random();
  function getRandomHexColor() {
    const hsvColor = {
      h: _colorSeed,
      s: 0.5,
      v: 0.95
    };
    const rgbColor = CommonUtils.hsv2rgb(hsvColor);
    const hexColor = CommonUtils.rgb2hex(rgbColor);

    const goldenRatioInverse = 0.618033988749895;
    _colorSeed = (_colorSeed + goldenRatioInverse) % 1;
    return hexColor;
  }

  function createNode() {
    return {
      //property: null,
      name: null,
      nInstances: 0,
      visInstances: 0,
      occludedInstance: 0,
      sliderValue: 100,
      // minSliderValue: 0,
      //maxSliderValue: 100,
      lo: 0,
      hi: 0,
      //color: '#808080',//gray
      elem: null,
      parent: null,
      path: "",
      children: null,
      expanded: false,
      storageType: null,
      depth: 0,
      sliderObj: null,
      //control:null,
      //HIcontrol:[],
      //elementsList:[],
      isDisabled: false,
      isClassName: false,
      // isPropertyTree:false,
      isroot: false,
      isEmpty: false,
      elements: null,
      //   hasLocked: false,
      //  hasSlider: false,

      setCaretIconRight() {
        const icon = this.elem.querySelector('.fas');
        icon.classList.replace('fa-caret-down', 'fa-caret-right');
      },

      setCaretIconDown() {
        const icon = this.elem.querySelector('.fas');
        icon.classList.replace('fa-caret-right', 'fa-caret-down');
      },

      hideChildren() {
        if (this.children !== null) {
          this.children.forEach((item) => {
            item.elem.classList.add('hide');
            if (item.expanded) {
              item.hideChildren();
            }
          });
        }
      },

      showChildren() {
        if (this.children !== null) {
          this.children.forEach((item) => {
            item.elem.classList.remove('hide');
            if (item.expanded) {
              item.showChildren();
            }
          });
        }
      },

      toggle: function () {
        if (this.expanded) {
          this.expanded = false;
          this.hideChildren();
          this.setCaretIconRight();
        } else {
          this.expanded = true;
          this.showChildren();
          this.setCaretIconDown();
        }
      },
      sliderChange: function () {
        if (this.isDisabled !== true) {
          {
            this.sliderValue = getSliderValue(this);
            var prevCount = this.visInstances;
            updateCountFromSliderValue(this);
            updateSliderTracks(this);
            var amount = this.visInstances - prevCount;
            updateParentsSliderCountValues(this.parent);
            if (amount > 0)
              increaseChildrenSliderCountValues(this, amount);
            else
              decreaseChildrenSliderCountValues(this, amount * -1);

            TVDClass.trigger('treeSliderChange');
          }
        }
      },

      ColorChange: function () {
        this.color = this.colorObj.object.getValue(); // (getColor(this)).value;
        this.colorObj.object.hideOverlay();
        updateChildrenColorValue(this, this.color);
        TVDClass.trigger('treeSliderChange');
      },

      ColorOverlayClicked: function () {
        this.style.visibility = 'hidden';
      },

      LockChange: function () {
        if (this.isEmpty == false) {
          if (this.isDisabled == false) {
            lockedNode(this);
            lockedChildren(this);
            changeParentsMinMaxRange(this.parent);
          }
          else {
            unlockedNode(this);
            unlockedParents(this.parent);
            //changeMinMaxRange(this.parent);
          }
          TVDClass.trigger('treeSliderChange');
        }
      }
    }
  }

  function getSliderValue(node) {
    return node.sliderObj.object.getValue();
  }
  function lockedNode(node) {
    var element = getLockElement(node);
    element.className = 'lock';
    node.sliderObj.object.disable();
    node.isDisabled = true;
    setSliderRightLimit(node, node.sliderValue);
    setSliderLeftLimit(node, node.sliderValue);
  }
  function unlockedNode(node) {
    var element = getLockElement(node);
    element.className = 'lock unlocked';
    node.sliderObj.object.enable();
    node.isDisabled = false;
    computeMinMaxRange(node);
  }
  function updateSliderTracks(node) {
    // node.occludedInstance = 50;// node.sliderValue*0.10;
    node.sliderObj.object.setValue2(node.sliderObj.object.getMaxValue() - node.sliderObj.object.getValue());
    // node.sliderObj.object.setValue3(node.occludedInstance);

  }
  function changeParentsMinMaxRange(node) {
    if (node.isroot != true) {
      computeMinMaxRange(node);
      changeParentsMinMaxRange(node.parent);
    }
  }
  function computeMinMaxRange(node) {
    if (node.children != null) {
      var min = 0;
      var max = 0;
      node.children.forEach((item) => {
        min += getSliderLeftLimit(item) * (item.nInstances / item.parent.nInstances);
        max += getSliderRightLimit(item) * (item.nInstances / item.parent.nInstances);
      });
      if (node.children[0].isClassName == true) {
        min = min / node.children.length;
        max = max / node.children.length;
      }
      setSliderRightLimit(node, max);
      setSliderLeftLimit(node, min);
    }
    else {
      setSliderRightLimit(node, 100);
      setSliderLeftLimit(node, 0);
    }

  }
  function updateCountFromSliderValue(node) {
    var newValue = (node.sliderValue * node.nInstances) / 100;
    setCountValue(node, newValue);
  }
  function updateSliderFromCountValue(node) {
    var newValue = (node.visInstances / node.nInstances) * 100;
    setSliderValue(node, newValue);
    //console.log(node);
  }

  function setCountValue(node, newValue) {
    node.visInstances = Math.floor(newValue);
    if (node.visInstances > node.nInstances)
      node.visInstances = node.nInstances;
  }
  function unlockedParents(node) {
    if (node.isroot !== true) {
      unlockedNode(node);

      unlockedParents(node.parent);
    }
  }
  function lockedChildren(node) {
    if (node.children !== null) {
      node.children.forEach((item) => {

        if (item.isEmpty == false) {
          if (item.children != null) {
            lockedChildren(item);
          }
          //computeMinMaxRange(item);
          lockedNode(item);
        }
      });

    }
  }
  function getColor(node) {
    return node.colorObj.object.getValue(); // elem.children[3].children[0];
  }
  function getLockElement(node) {
    return node.elem.children[4].children[0];
  }
  function updateParentsSliderCountValues(node) {
    if (node.isroot === false) {
      var sum = 0;
      node.children.forEach((item) => {
        sum = sum + item.visInstances;
      });
      if (node.children[0].isClassName == true) {
        sum = sum / node.children.length;
      }
      setCountValue(node, sum);
      updateSliderFromCountValue(node);
      updateParentsSliderCountValues(node.parent);
    }

  }
  function increaseChildrenSliderCountValues(node, changeValue) {
    if (node.children !== null) {
      var parentCount = node.nInstances;
      var avalChild = [];
      node.children.forEach((child) => {
        if (child.visInstances < child.nInstances && child.isDisabled == false) {
          avalChild.push(child);
        }
        else {
          parentCount -= child.nInstances;
        }
      });
      while (changeValue > 0) {
        var rem = 0;
        var newParentCount = parentCount;
        avalChild.forEach((child) => {
          var ratio = Math.ceil(changeValue * (child.nInstances / parentCount));
          if (child.visInstances + ratio > child.nInstances) {
            var chChangeValue = child.nInstances - child.visInstances;
            rem += ratio - chChangeValue;
            setCountValue(child, child.nInstances);
            updateSliderFromCountValue(child);
            increaseChildrenSliderCountValues(child, chChangeValue);
            //delete that child
            const index = avalChild.indexOf(child);
            if (index > -1) {
              avalChild.splice(index, 1);
            }
            newParentCount -= child.nInstances;
          }
          else {
            setCountValue(child, child.visInstances + ratio);
            updateSliderFromCountValue(child);
            increaseChildrenSliderCountValues(child, ratio);
          }
        });
        changeValue = rem;
        parentCount = newParentCount;
        if (avalChild == null) {
          break;
        }

      }
    }
  }
  function decreaseChildrenSliderCountValues(node, changeValue) {
    if (node.children !== null) {
      var parentCount = node.nInstances;
      var avalChild = [];
      node.children.forEach((child) => {
        if (child.visInstances > 0 && child.isDisabled == false) {
          avalChild.push(child);
        }
        else {
          parentCount -= child.nInstances;
        }
      });
      while (changeValue > 0) {
        var rem = 0;
        var newParentCount = parentCount;
        avalChild.forEach((child) => {
          var ratio = Math.ceil(changeValue * (child.nInstances / parentCount));
          //console.log(ratio);
          if (child.visInstances - ratio < 0) {
            var chChangeValue = child.visInstances;
            rem += ratio - chChangeValue;
            setCountValue(child, 0);
            updateSliderFromCountValue(child);
            decreaseChildrenSliderCountValues(child, chChangeValue);
            //delete that child
            const index = avalChild.indexOf(child);
            if (index > -1) {
              avalChild.splice(index, 1);
            }
            newParentCount -= child.nInstances;

          }
          else {
            rem -= ratio;
            setCountValue(child, (child.visInstances - ratio));
            updateSliderFromCountValue(child);
            decreaseChildrenSliderCountValues(child, ratio);
          }
        });
        changeValue = rem;
        parentCount = newParentCount;
        if (avalChild == null) {
          break;
        }
      }

    }
  }
  function updateChildrenColorValue(node, colorValue) {
    if (node.children !== null) {
      node.children.forEach((item) => {

        if (item.isDisabled == false) {
          setColorValue(item, colorValue);
          updateChildrenColorValue(item, colorValue);
        }
      });
    }
  }

  function setColorValue(node, newValue) {
    node.colorObj.object.setValue(newValue);
    node.color = newValue;
  }

  function setSliderValue(node, newValue) {
    node.sliderObj.object.setValue(newValue);
    node.sliderValue = newValue;
    updateSliderTracks(node);
  }

  function getType(val) {
    let storageType = typeof val;
    if (Array.isArray(val)) {
      storageType = 'array';
    } else if (val === null) {
      storageType = 'null';
    }
    return storageType;
  }


  function traverseObject_groups(parent, groups, children, hasChildren) {
    groups.forEach(x => {
      const child = createNode();
      child.parent = parent;
      child.lo = x.lo;
      child.hi = x.hi;
      child.depth = parent.depth + 1;
      child.expanded = false;
      child.isroot = false;
      child.name = x.name;
      child.path = parent.path + "." + x.name;
      if (hasChildren == true) {
        child.children = [];
        parent.children.push(child);
        traverseObject(children, child);
        child.elem = createExpandedElement(child);
      }
      else {
        parent.children.push(child);
        child.elem = createNotExpandedElement(child);
      }

    });
  }

  function traverseObject(obj, parent) {
    obj.forEach(x => {
      const child = createNode();
      child.parent = parent;
      child.lo = x.lo;
      child.hi = x.hi;
      child.depth = parent.depth + 1;
      child.expanded = false;
      child.isroot = false
      child.name = x.name;
      child.path = parent.path + "." + x.name;
      child.isClassName = true;
      child.children = [];
      parent.children.push(child);
      if (x.children.length > 0)
        traverseObject_groups(child, x.groups, x.children, true);
      else
        traverseObject_groups(child, x.groups, x.children, false);
      child.elem = createExpandedElement(child);
    });
  }

  function createTree(obj) {
    const tree = createNode();
    tree.storageType = getType(obj);
    tree.sliderValue = 100;
    tree.children = [];
    tree.expanded = true;
    tree.isroot = true;
    tree.isClassName = false;
    tree.path = "";
    traverseObject(obj, tree);
    tree.elem = createExpandedElement(tree);
    return tree;
  }

  function traverseTree(node, callback) {
    callback(node);
    if (node.children !== null) {
      node.children.forEach((item) => {

        traverseTree(item, callback);
      });
    }
  }

  function render(tree, targetElem, i) {
    let rootElem;
    if (targetElem) {
      rootElem = document.querySelectorAll(targetElem);
    } else {
      rootElem = document.body;
    }

    traverseTree(tree, (node) => {
      if (!node.expanded) {
        node.hideChildren();
      }
      rootElem[i].appendChild(node.elem);
    });
  }



  /* Export jsonView object */
  window.jsonView = {
    format: function (jsonData, targetElem) {
      let parsedData = jsonData;
      if (typeof jsonData === 'string' || jsonData instanceof String) {
        parsedData = JSON.parse(jsonData);

        if (parsedData.abstractTree) {
          parsedData = parsedData.abstractTree;
        }
      }

      Htree = createTree(parsedData, false);
      Htree.nInstances = elementsArray.length;
      Htree.visInstances = Htree.nInstances;
      
      /*
      if (colorsToSet != null) {
        setColors(Htree, colorsToSet);        
        colorsToSet = null;
      }

      if(valuesToSet != null) {
        setValues(Htree, valuesToSet);        
        valuesToSet = null;
      }
      */

      render(Htree, targetElem, 0);
      countElementsOfthisClass(Htree, [], [], []);
      countElementsBasedOnTree(Htree);
      //console.log(Htree);
    }
  }
  /*function countElementsBasedVisRule(node) {
    if (node.children != null) {
      var count = 0;
      node.children.forEach((item) => {
        count += countElementsBasedVisRule(item);
      });
      node.nInstances = count;
      node.visInstances = node.nInstances; 
    }
    return node.nInstances;
  }*/
  function countElementsBasedOnTree(node) {
    if (node.children != null) {
      var elements = [];
      node.children.forEach((item) => {
        var el = countElementsBasedOnTree(item);
        elements = elements.concat(el);
      });
      node.elements = elements;
      node.nInstances = elements.length;
      node.visInstances = node.nInstances;

    }
    return node.elements;
  }
  function setSliderRightLimit(node, newValue) {
    node.sliderObj.object.setLimitRight(newValue);
  }
  function getSliderRightLimit(node) {
    return node.sliderObj.object.getLimitRight();
  }
  function setSliderLeftLimit(node, newValue) {
    node.sliderObj.object.setLimitLeft(newValue);
  }
  function getSliderLeftLimit(node) {
    return node.sliderObj.object.getLimitLeft();
  }

  function countElementsOfthisClass(node, className, hiList, loList) {
    if (node.isClassName == true) {

      className.push(node.name);
      node.elements = getNodeElements(className, hiList, loList);
      node.nInstances = node.elements.length;//=countElements(className, hiList, loList);
      node.visInstances = node.nInstances;

      if (node.nInstances == 0) {
        LockedEmptyNode(node);
      }
      node.children.forEach((item) => {
        countElementsOfthisClass(item, className, hiList, loList);
      });
      className.pop();
    }
    else if (node.children != null) {
      if (node.isroot == false) {

        hiList.push(node.hi);
        loList.push(node.lo);
        node.elements = getNodeElements(className, hiList, loList);
        node.nInstances = node.elements.length; //=countElements(className, hiList, loList);
        node.visInstances = node.nInstances;
        if (node.nInstances == 0) {
          LockedEmptyNode(node);
        }
      }
      node.children.forEach((item) => {
        countElementsOfthisClass(item, className, hiList, loList);
      });
      if (node.name != null) {
        hiList.pop();
        loList.pop();
      }

    }
    else {

      hiList.push(node.hi);
      loList.push(node.lo);
      //node.nInstances = countElements(className, hiList, loList);
      node.elements = getNodeElements(className, hiList, loList);
      node.nInstances = node.elements.length;
      node.visInstances = node.nInstances;
      if (node.nInstances == 0) {
        LockedEmptyNode(node);
      }
      hiList.pop();
      loList.pop();
    }
  }

  /*function countElements(className, hiList, loList) {
    var el = clone(elementsArray);
    for (var j = 0; j < className.length; j++) {
      if (hiList[j] == null)
        break;
      el = el.filter(x => x[className[j]] <= hiList[j] && x[className[j]] >= loList[j])
    }

    return el.length;
  }*/
  function getNodeElements(className, hiList, loList) {
    var el = clone(elementsArray);
    for (var j = 0; j < className.length; j++) {
      if (hiList[j] == null)
        break;
      el = el.filter(x => x[className[j]] <= hiList[j] && x[className[j]] >= loList[j])
    }

    return el;
  }
  function LockedEmptyNode(node) {
    node.isEmpty = true;
    var element = getLockElement(node);
    element.className = 'empty';
    node.sliderObj.object.disable();
    setSliderValue(node, 0);
    setSliderRightLimit(node, 0);
    node.isDisabled = true;
  }
})();