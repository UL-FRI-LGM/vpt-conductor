// #package js/main

// #include UIObject.js

// #include ../../html/ui/DynamicTreeView.html

class DynamicTreeView extends UIObject {

    constructor(options) {
        super(TEMPLATES.DynamicTreeView, options);

        Object.assign(this, {
            label: ''
        }, options);

        this._handleMouseMove = this._handleMouseMove.bind(this);

        this.nodes = [];

        this._element.addEventListener('mousemove', this._handleMouseMove);

        this.headerId = "property-tree-header";
        this.containerId = "property-tree-container";
        this.properties = [];

        this._tree = null;
    }

    createHeader(properties) {
        var _this = this;
        _this.properties = properties;

        var header = document.getElementById(this.headerId);
        while (header.firstChild) {
            header.removeChild(header.lastChild);
        }

        var selectWrapper = this.createElement("div");
        var select = this.createElement("select");
        for (var i = 0; i < properties.length; i++) {
            var prop = properties[i];
            var option = this.createElement("option");
            option.innerText = prop.text;
            option.value = prop.id;
            select.appendChild(option);
        }
        selectWrapper.appendChild(select);
        header.appendChild(selectWrapper);

        var buttonWrapper = this.createElement("div", "button");
        var addButton = this.createElement("input");
        addButton.type = "button";
        addButton.onclick = function () {
            var propId = select.options[select.selectedIndex].value;

            var property = _this.properties[propId];

            _this.insertPropertyNode(property);
        };
        addButton.value = "Add";
        buttonWrapper.appendChild(addButton);
        header.appendChild(buttonWrapper);

        buttonWrapper = this.createElement("div", "button");
        var collapseAllButton = this.createElement("input");
        collapseAllButton.type = "button";
        collapseAllButton.onclick = function () {
            _this.collapseAll();
        };
        collapseAllButton.value = "Collapse";
        buttonWrapper.appendChild(collapseAllButton);
        header.appendChild(buttonWrapper);

        buttonWrapper = this.createElement("div", "button");
        var expandAllButton = this.createElement("input");
        expandAllButton.type = "button";
        expandAllButton.onclick = function () {
            _this.expandAll();
        };
        expandAllButton.value = "Expand";
        buttonWrapper.appendChild(expandAllButton);
        header.appendChild(buttonWrapper);

        buttonWrapper = this.createElement("div", "button");
        var jsonButton = this.createElement("input");
        jsonButton.type = "button";
        jsonButton.onclick = function () {
            var json = _this.getJSON();

            _this.saveJSON(json);
        };
        jsonButton.value = "Save";
        buttonWrapper.appendChild(jsonButton);
        header.appendChild(buttonWrapper);

        buttonWrapper = this.createElement("div", "button");
        var jsonButton = this.createElement("input");
        jsonButton.type = "button";
        jsonButton.onclick = function () {
            _this.loadJSON();
        };
        jsonButton.value = "Load";
        buttonWrapper.appendChild(jsonButton);
        header.appendChild(buttonWrapper);
    }

    insertPropertyNode(property) {
        if (property.type == "enum") {
            var values = {};
            if (property.values) {
                values = property.values;
            } else {
                console.log("No 'enum' values specified!");
                return;
            }
            return this.addEnumProperty(property.text, values);
        } else {
            return this.addFloatProperty(property.text, property.lo || 0, property.hi || 100);
        }
    }

    setProperties(properties) {
        var select = this.createElement("select");

    }

    setEnabled(enabled) {
        super.setEnabled(enabled);
        this._binds.input.disabled = !enabled;

    }

    addEnumProperty(name, values) {
        var node = this.addPropertyNode(name);

        this.addEnum(node, values);

        return node;
    }

    addFloatProperty(name, min = 0, max = 100) {
        var node = this.addPropertyNode(name);

        this.addRange(node, min, max);

        return node;
    }

    addPropertyNode(name) {
        var tree = document.getElementById(this.containerId);

        var node = this.createNodeDiv(name);
        tree.appendChild(node);

        return node;
    }

    createNodeDiv(property) {
        var _this = this;

        var node = _this.createElement("div", "property-tree-node draggable", "node_" + _this.nodes.length);
        node.draggable = true;
        node.addEventListener('dragstart', function (ev) {
            ev.dataTransfer.setData("text/plain", ev.target.id);
        });
        node.addEventListener('drop', function (ev) {
            ev.preventDefault();
            var data = ev.dataTransfer.getData("text/plain");
            var source = document.getElementById(data);
            var target = ev.target;

            if (target !== null && source != target.parentElement) {
                _this.insertChild(target.parentElement, source);
            }
        });
        node.addEventListener('dragover', function (ev) {
            ev.preventDefault();
        });
        _this.nodes.push(node);

        var header = _this.createElement("div", "property-header bottom-border");
        node.appendChild(header);

        var name = _this.createElement("div", "property-name");
        name.innerText = property;
        header.appendChild(name);

        var collapseButton = _this.createElement("div", "property-collapse-button right-button");
        collapseButton.onclick = function () {
            if (_this.isCollapsed(node)) {
                _this.expand(node);
            } else {
                _this.collapse(node);
            }
        };
        header.appendChild(collapseButton);

        var deleteButton = _this.createElement("div", "property-delete-button delete-button");
        deleteButton.onclick = function () {
            var node = collapseButton.parentNode.parentNode;
            var parent = node.parentNode;

            parent.removeChild(node);
        };
        header.appendChild(deleteButton);

        var unpinButton = _this.createElement("div", "property-unpin-button unpin-button");
        unpinButton.onclick = function () {
            var node = collapseButton.parentNode.parentNode;
            var parent = node.parentNode;

            parent.removeChild(node);
            var container = document.getElementById("property-tree-container");
            container.appendChild(node);

        };
        header.appendChild(unpinButton);

        var values = _this.createElement("div", "property-values-wrapper collapsed");
        node.appendChild(values);

        var subnodes = _this.createElement("div", "property-subnodes-wrapper");
        node.appendChild(subnodes);

        return node;
    }

    insertChild(parent, child) {
        let subnodes = parent.querySelector('.property-subnodes-wrapper');
        subnodes.appendChild(child);
    }

    addRange(node, minValue = 0, maxValue = 100) {
        var _this = this;

        var range = _this.createElement("div", "property-range");

        var label = _this.createElement("div", "property-range-label");
        label.innerText = "Range:";
        range.appendChild(label);

        var min = _this.createElement("input", "property-range-min");
        min.type = "number";
        min.step = ".01";
        min.value = minValue;
        min.addEventListener("mousemove", (e) => {
            e.preventDefault();
        });
        range.appendChild(min);

        var max = _this.createElement("input", "property-range-max");
        max.type = "number";
        max.step = ".01";
        max.value = maxValue;
        max.addEventListener("mousemove", (e) => {
            e.preventDefault();
        });
        range.appendChild(max);

        var addButton = _this.createElement("div", "property-range-add-button add-button");
        addButton.onclick = function () {
            let maxInput = addButton.parentNode.querySelector('.property-range-max');
            minValue = maxInput.value;

            _this.addRange(node, minValue, maxValue);
        };
        range.appendChild(addButton);

        let values = node.querySelector('.property-values-wrapper');
        if (values.childElementCount > 0) {
            var deleteButton = _this.createElement("div", "property-range-delete-button delete-button");
            deleteButton.onclick = function () {
                var parent = this.parentNode.parentNode;

                parent.removeChild(range);
            };
            range.appendChild(deleteButton);
        }

        values.appendChild(range);
    }

    addEnum(node, values) {
        var _this = this;
        var enumValue = _this.createElement("div", "property-enum");

        var label = _this.createElement("div", "property-enum-label");
        label.innerText = "Option(s):";
        enumValue.appendChild(label);

        var select = _this.createElement("select", "property-enum-values");
        select.multiple = true;
        for (var value in values) {
            var option = _this.createElement("option");
            option.value = value;
            option.innerText = values[value];
            select.appendChild(option);
        }
        enumValue.appendChild(select);

        let valuesWrapper = node.querySelector('.property-values-wrapper');
        valuesWrapper.appendChild(enumValue);
    }

    createElement(type, className = null, id = null) {
        var elem = document.createElement(type);

        if (className != null) {
            elem.className = className;
        }

        if (id != null) {
            elem.id = id;
        }

        return elem;
    }

    addSubNode(parent, node) {
        let subnodes = parent.querySelector('.property-subnodes-wrapper');
        subnodes.appendChild(node);
    }

    isCollapsed(node) {
        let values = node.querySelector('.property-values-wrapper');
        return values.className.indexOf("collapsed") > 0;
    }

    expand(node) {
        if (this.isCollapsed(node)) {
            let header = node.querySelector('.property-header');
            let values = node.querySelector('.property-values-wrapper');
            let collapseButton = node.querySelector('.property-collapse-button');

            header.classList.toggle("bottom-border", false);
            values.classList.toggle("collapsed", false);
            collapseButton.classList.toggle("right-button", false);
            collapseButton.classList.toggle("down-button", true);
        }
    }

    expandAll() {
        for (var i = 0; i < this.nodes.length; i++) {
            this.expand(this.nodes[i]);
        }
    }

    collapse(node) {
        if (!this.isCollapsed(node)) {
            let header = node.querySelector('.property-header');
            let values = node.querySelector('.property-values-wrapper');
            let collapseButton = node.querySelector('.property-collapse-button');

            header.classList.toggle("bottom-border", true);
            values.classList.toggle("collapsed", true);
            collapseButton.classList.toggle("right-button", true);
            collapseButton.classList.toggle("down-button", false);
        }
    }

    collapseAll() {
        for (var i = 0; i < this.nodes.length; i++) {
            this.collapse(this.nodes[i]);
        }
    }

    getJSON(node = null) {
        if (node == null) {
            node = document.getElementById('property-tree-container');
            var json = {};

            // abstract tree definition
            json.abstractTree = [];

            for (var i = 0; i < node.childNodes.length; i++) {
                var child = node.childNodes[i];
                var subnode = this.getJSON(child);
                json.abstractTree.push(subnode);
            }

            if (this._tree) {
                // colors specification
                json.colors = this._tree.getColors();
                json.values = this._tree.getValues();
                // values specification
                //json.values = this._tree.getValues();
            }

            return json;
        } else {

            var values = node.querySelector('.property-values-wrapper');

            var json = {};

            json.groups = [];
            var gmin = Number.MAX_SAFE_INTEGER;
            var gmax = -Number.MAX_SAFE_INTEGER;
            var name = node.querySelector('.property-name');
            json.name = name.innerText;
            for (var i = 0; i < values.childElementCount; i++) {
                json.type = "float";
                var group = {};
                var child = values.childNodes[i];
                var min = child.querySelector('.property-range-min');
                var options = child.querySelector('.property-enum-values');

                if (min != null) { // 'float property'
                    group.lo = parseFloat(min.value);
                    gmin = Math.min(group.lo, gmin);
                    var max = child.querySelector('.property-range-max');
                    group.hi = parseFloat(max.value);
                    group.name = "[" + group.lo + "~" + group.hi + "]";
                    gmax = Math.max(group.hi, gmax);
                    json.groups.push(group);
                } else if (options != null) { // 'enum' values   
                    json.type = "enum";

                    for (var i = 0; i < options.length; i++) {
                        var opt = options[i];

                        if (opt.selected) {
                            var egroup = clone(group);
                            egroup.name = opt.text;
                            egroup.lo = egroup.hi = parseInt(opt.value);
                            gmin = Math.min(egroup.lo, gmin);
                            gmax = Math.max(egroup.hi, gmax);
                            json.groups.push(egroup);
                        }
                    }
                } else {
                    continue;
                }
            }
            json.hi = gmax;
            json.lo = gmin;

            json.children = [];
            var subnodes = node.querySelector('.property-subnodes-wrapper');
            for (var i = 0; i < subnodes.childElementCount; i++) {
                var child = subnodes.childNodes[i];
                var subnode = this.getJSON(child);
                json.children.push(subnode);
            }

            return json;
        }
    }

    saveJSON(json) {
        var a = document.createElement("a");

        var date = new Date();

        var now = "";
        now += date.getFullYear();
        var month = date.getMonth() + 1; // months are zero indexed 
        now += month < 10 ? "0" + month : month;
        var day = date.getDate();
        now += day < 10 ? "0" + day : day
        now += date.getHours();
        var minute = date.getMinutes();
        now += minute < 10 ? "0" + minute : minute;
        now += date.getSeconds();

        CommonUtils.downloadJSON(json, "vpttree_" + now + ".json");
    }

    loadJSON() {
        var _this = this;

        CommonUtils.readTextFile(data => {
            var json = JSON.parse(data);

            _this.setJSON(json);
        });
    }

    setJSON(json) {
        // tree nodes
        for (var i = 0; i < json.abstractTree.length; i++) {
            var node = json.abstractTree[i];
            this.createNodeFromJSON(node);
        }

        if (this._tree) {            
            // generation of the tree
            this._tree._handleCreateHTreeButton();
            
            // setting of colors
            if (json.colors) {
                this._tree.colors = json.colors;
                this._tree.setColors(json.colors);
            }
            
            // setting of slider values
            if (json.values) {
                this._tree.setValues(json.values);
            }
        }
    }

    createNodeFromJSON(propJSON, parent = null) {
        var prop = this.properties.find(p => p.text == propJSON.name);

        if (prop) {
            var node = this.addPropertyNode(prop.text);

            if (parent) {
                this.insertChild(parent, node);
            }

            for (var g = 0; g < propJSON.groups.length; g++) {
                var group = propJSON.groups[g];
                this.addRange(node, group.lo, group.hi);
            }

            for (var c = 0; c < propJSON.children.length; c++) {
                this.createNodeFromJSON(propJSON.children[c], node);
            }
        }
    }

    reset() {
        var container = document.getElementById(this.containerId);
        while (container.firstChild) {
            container.removeChild(container.lastChild);
        }

        var header = document.getElementById(this.headerId);
        while (header.firstChild) {
            header.removeChild(header.lastChild);
        }
    }

    _handleMouseMove(e) {

    }

    setGeneratedTree(tree) {
        this._tree = tree;
    }
}

