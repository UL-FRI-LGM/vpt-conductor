// #package js/main

// #include utils
// #include readers
// #include loaders
// #include dialogs
// #include dialogs/renderers
// #include dialogs/tonemappers
// #include ui
// #include RenderingContext.js
// #include ResourceLoader.js

class Application {

    constructor() {
        this._handleFileDrop = this._handleFileDrop.bind(this);
        this._handleRendererChange = this._handleRendererChange.bind(this);
        this._handleToneMapperChange = this._handleToneMapperChange.bind(this);
        this._handleIdVolumeLoad = this._handleIdVolumeLoad.bind(this);
        this._handleRawVolumeLoad = this._handleRawVolumeLoad.bind(this);
        this._handleAttribLoad = this._handleAttribLoad.bind(this);
        this._handleEnvmapLoad = this._handleEnvmapLoad.bind(this);
        this._handleVisibilityRetopo = this._handleVisibilityRetopo.bind(this);
        this._handleVisibilityChange = this._handleVisibilityChange.bind(this);

        this._handleTreeSliderChange = this._handleTreeSliderChange.bind(this);
        //this._handleTreeTopologyChange=this._handleTreeTopologyChange.bind(this);

        this._visibilityUpdatePending = false;
        this._visibilityUpdateInterval = 200;
        this._visibilityUpdateTimeout = null;

        this._renderingContext = new RenderingContext();
        this._canvas = this._renderingContext.getCanvas();
        this._canvas.className += 'renderer';
        document.body.appendChild(this._canvas);

        window.addEventListener('resize', () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            this._renderingContext.resize(width, height);
        });
        CommonUtils.trigger('resize', window);

        document.body.addEventListener('dragover', e => e.preventDefault());
        document.body.addEventListener('drop', this._handleFileDrop);

        this._mainDialog = new MainDialog();
        if (!this._renderingContext.hasComputeCapabilities()) {
            this._mainDialog.disableMCC();
        }

        this._statusBar = new StatusBar();
        this._statusBar.appendTo(document.body);

        this._idVolumeLoadDialog = new VolumeLoadDialog();
        this._idVolumeLoadDialog.appendTo(this._mainDialog.getIdVolumeLoad_container());
        this._idVolumeLoadDialog.addEventListener('load', this._handleIdVolumeLoad);

        this._rawVolumeLoadDialog = new VolumeLoadDialog();
        this._rawVolumeLoadDialog.appendTo(this._mainDialog.getRawVolumeLoad_container());
        this._rawVolumeLoadDialog.addEventListener('load', this._handleRawVolumeLoad);

        this._attribLoadDialog = new AttribLoadDialog();
        this._attribLoadDialog.appendTo(this._mainDialog.getAttribLoad_container());
        this._attribLoadDialog.addEventListener('load', this._handleAttribLoad);

        this._envmapLoadDialog = new EnvmapLoadDialog();
        this._envmapLoadDialog.appendTo(this._mainDialog.getEnvmapLoad_container());
        this._envmapLoadDialog.addEventListener('load', this._handleEnvmapLoad);

        this._treeViewDialog = new TreeViewDialog();
        this._treeViewDialog.appendTo(this._mainDialog.getTreeViewContainer());
        this._treeViewDialog.addEventListener('treeSliderChange', this._handleTreeSliderChange);
        this._treeViewDialog.addEventListener('treeTopologyChange', this._handleTreeSliderChange);
       

        this._visibilityDialog = new VisibilityDialog();
        this._visibilityDialog.appendTo(this._mainDialog.getVisibility_container());
        this._visibilityDialog.addEventListener('retopo', this._handleVisibilityRetopo);
        this._visibilityDialog.addEventListener('change', this._handleVisibilityChange);

        this._renderingContextDialog = new RenderingContextDialog();
        this._renderingContextDialog.appendTo(
            this._mainDialog.getRenderingContextSettings_container());
        this._renderingContextDialog.addEventListener('resolution', options => {
            this._renderingContext.setResolution(options.resolution);
        });
        this._renderingContextDialog.addEventListener('transformation', options => {
            const s = options.scale;
            const t = options.translation;
            this._renderingContext.setScale(s.x, s.y, s.z);
            this._renderingContext.setTranslation(t.x, t.y, t.z);
        });
        this._renderingContextDialog.addEventListener('filter', options => {
            this._renderingContext.setFilter(options.filter);
        });

        this._mainDialog.addEventListener('rendererchange', this._handleRendererChange);
        this._mainDialog.addEventListener('tonemapperchange', this._handleToneMapperChange);
        this._mainDialog.trigger('rendererchange', this._mainDialog.getSelectedRenderer());
        this._mainDialog.trigger('tonemapperchange', this._mainDialog.getSelectedToneMapper());
       
        //--------------------
        this.attributes=null;
        this.layout=null;
        this.elementsJSON=[];
        this.isTreeTheActiveGUI=false;

        this._loadExample();
    }

    _loadExample() {
        const examples = {
            1: {
                volume: 'synthetic-bundle.bvp',
                tf: 'tfs/tf1.json',
                tree: 'trees/tree1.json'
            },
            2: {
                volume: 'synthetic-bundle.bvp',
                tf: 'tfs/tf1.json',
                tree: 'trees/tree2.json'
            },
            3: {
                volume: 'synthetic-bundle.bvp',
                tf: 'tfs/tf1.json',
                tree: 'trees/tree3.json'
            }
        };

        const exampleID = new URL(window.location).searchParams.get('ex');
        const example = examples[exampleID];
        if (!example) {
            return;
        }

        const loadingDiv = DOMUtils.instantiate(TEMPLATES.LoadingScreen);
        document.body.appendChild(loadingDiv);

        this._handleVolumeLoad({
            type: 'url',
            file: example.volume,
            filetype: 'bvp',
            dimensions: { x: 0, y: 0, z: 0 }, // doesn't matter
            precision: 8 // doesn't matter
        });

        this._renderingContext.addEventListener('volume-loaded', () => {
            this._renderingContext.stopRendering();

            const tf = ResourceLoader.loadJson(example.tf);
            const tree = ResourceLoader.loadJson(example.tree);

            Promise.all([tf, tree]).then(([tf, tree]) => {
                this._rendererDialog._tfwidget.loadFromJson(tf);
                this._treeViewDialog._binds.dynamicTree.setJSON(tree);
                this._renderingContext.startRendering();
                DOMUtils.remove(loadingDiv);
            });
        });
    }

    _handleFileDrop(e) {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length === 0) {
            return;
        }
        const file = files[0];
        if (!file.name.toLowerCase().endsWith('.bvp')) {
            return;
        }
        this._handleVolumeLoad({
            type: 'file',
            file: file,
            filetype: 'bvp',
            dimensions: { x: 0, y: 0, z: 0 }, // doesn't matter
            precision: 8 // doesn't matter
        });
    }

    _handleRendererChange(which) {
        let tfjson = [];
        if (this._rendererDialog) {
            tfjson = this._rendererDialog._tfwidget._bumps;
            this._rendererDialog.destroy();
        }
        this._renderingContext.chooseRenderer(which);
        const renderer = this._renderingContext.getRenderer();
        const container = this._mainDialog.getRendererSettings_container();
        const dialogClass = this._getDialogForRenderer(which);
        this._rendererDialog = new dialogClass(renderer);
        this._rendererDialog.appendTo(container);
        
        this._treeViewDialog._setRenderer(renderer);
        this._visibilityDialog._setRenderer(renderer);
        renderer.setGUIObjs(this._treeViewDialog,this._visibilityDialog);
         //------------------ reload data and rules -----------
        if(this._renderingContext._idVolume.ready && this._renderingContext._dataVolume.ready)
        {
            renderer.setDataVolume(this._renderingContext._dataVolume);
            renderer.setIDVolume(this._renderingContext._idVolume);
            //this._renderingContext.startRendering();
            renderer.setMinMaxGM(this._renderingContext._minGm, this._renderingContext._maxGm) ;
            renderer.setAttributes(this.attributes, this.layout.map(function (x) { var v = new Object(); v.name = x.name; v.type = x.type; return v; }), this.elementsJSON);
            this._rendererDialog._tfwidget.loadFromJson(tfjson);
            if(this.isTreeTheActiveGUI==true)
            {
                this._throttleTreeVisibility();
            }
            else{
                this._throttleVisibility();
            }
            
        }
    }

    _handleToneMapperChange(which) {
        if (this._toneMapperDialog) {
            this._toneMapperDialog.destroy();
        }
        this._renderingContext.chooseToneMapper(which);
        const toneMapper = this._renderingContext.getToneMapper();
        const container = this._mainDialog.getToneMapperSettings_container();
        const dialogClass = this._getDialogForToneMapper(which);
        this._toneMapperDialog = new dialogClass(toneMapper);
        this._toneMapperDialog.appendTo(container);
    }

    _handleIdVolumeLoad(options) {
        const loaderClass = this._getLoaderForFileTypoe(options.type);
        const readerClass = this._getReaderForFileType(options.filetype);
        if (!loaderClass || !readerClass) {
            return;
        }

        const gl = this._renderingContext._gl;

        const loader = new loaderClass(options.file);
        const reader = new readerClass(loader, {
            width: options.dimensions.x,
            height: options.dimensions.y,
            depth: options.dimensions.z,
            bits: options.precision,
            modalityName: 'id',
            format: gl.RED_INTEGER,
            internalFormat: gl.R16UI,
            type: gl.UNSIGNED_SHORT,
        });

        this._renderingContext.setIDVolume(reader);
        this._renderingContext.getRenderer().setAttributes(null, null);
        this._visibilityDialog.reset();
        this._treeViewDialog.reset();
    }

    _handleRawVolumeLoad(options) {
        const loaderClass = this._getLoaderForFileTypoe(options.type);
        const readerClass = this._getReaderForFileType(options.filetype);
        if (!loaderClass || !readerClass) {
            return;
        }

        const loader = new loaderClass(options.file);
        const reader = new readerClass(loader, {
            width: options.dimensions.x,
            height: options.dimensions.y,
            depth: options.dimensions.z,
            bits: options.precision,
            modalityName: 'data',
            format: gl.RED,
            internalFormat: gl.R8,
            type: gl.UNSIGNED_BYTE,
        });

        this._renderingContext.setDataVolume(reader);
    }

    _handleVolumeLoad(options) {
        const loaderClass = this._getLoaderForFileTypoe(options.type);
        const readerClass = this._getReaderForFileType(options.filetype);
        if (!loaderClass || !readerClass) {
            return;
        }

        const loader = new loaderClass(options.file);
        const reader = new readerClass(loader, {
            width: options.dimensions.x,
            height: options.dimensions.y,
            depth: options.dimensions.z,
            bits: options.precision,
        });
        this._renderingContext.stopRendering();
        this._renderingContext.setIDVolume(reader);
        this._renderingContext.setDataVolume(reader);
        this._renderingContext.getRenderer().setAttributes(null, null);
        this._visibilityDialog.reset();
        this._treeViewDialog.reset();
        if (reader.readAttributes) {
            reader.readAttributes({
                onData: attributes => {
                    reader.readLayout({
                        onData: layout => {
                            const elementsJSON = this.getElementsAttribJSON(attributes, layout);
                            this._renderingContext.getRenderer().setAttributes(attributes, layout, elementsJSON);
                            this._visibilityDialog.setAttributes(layout.map(x => x.name), elementsJSON);
                            this._treeViewDialog.setAttributes(layout, elementsJSON);
                            //-------------------------------
                            this.elementsJSON=elementsJSON;
                            this.attributes=attributes;
                            this.layout=layout;
                        }
                    });
                }
            });
        }
    }

    _handleAttribLoad(options) {
        const attrib = new Promise((resolve, reject) => {
            const fr = new FileReader();
            fr.addEventListener('load', () => {
                resolve(fr.result);
            });
            fr.addEventListener('error', reject);
            fr.readAsArrayBuffer(options.attribFile);
        });
        const layout = new Promise((resolve, reject) => {
            const fr = new FileReader();
            fr.addEventListener('load', () => {
                resolve(JSON.parse(fr.result));
            });
            fr.addEventListener('error', reject);
            fr.readAsText(options.layoutFile);
        });

        Promise.all([attrib, layout]).then(([attrib, layout]) => {
            var elementsJSON = this.getElementsAttribJSON(attrib, layout);//get also min/max
            const renderer = this._renderingContext.getRenderer();
            renderer.setAttributes(attrib, layout.map(function (x) { var v = new Object(); v.name = x.name; v.type = x.type; return v; }), elementsJSON);
            this._visibilityDialog.setAttributes(layout.map(x => x.name), elementsJSON);//layout.map(function(x) { var v=new Object();v.name=x.name;v.lowerBound=x.lowerBound;v.upperBound=x.upperBound; return v;}));
            this._treeViewDialog.setAttributes(layout, elementsJSON);
            //-------------------------------
            this.elementsJSON=elementsJSON;
            this.attributes=attrib;
            this.layout=layout;
        });
    }

    _handleEnvmapLoad(options) {
        let image = new Image();
        image.crossOrigin = 'anonymous';
        image.addEventListener('load', () => {
            this._renderingContext.setEnvironmentMap(image);
            this._renderingContext.getRenderer().reset();
        });

        if (options.type === 'file') {
            let reader = new FileReader();
            reader.addEventListener('load', () => {
                image.src = reader.result;
            });
            reader.readAsDataURL(options.file);
        } else if (options.type === 'url') {
            image.src = options.url;
        }
    }

    _updateVisibility() {   
        
        if (this._visibilityUpdateTimeout) {
            return;
            //clearTimeout(this._visibilityUpdateTimeout);
            //this._visibilityUpdateTimeout = null;
        }
        this.isTreeTheActiveGUI=false;
        const renderer = this._renderingContext.getRenderer();        
        var _this = this;

        this._visibilityUpdateTimeout = setTimeout(() => {
            renderer.setRules(this._visibilityDialog.getGroups(), this._visibilityDialog);
            renderer.reset();

            /**/clearTimeout(_this._visibilityUpdateTimeout);
            _this._visibilityUpdateTimeout = null;

            /**/if (this._visibilityUpdatePending) {
            /**/    this._visibilityUpdatePending = false;
                this._updateVisibility();
            /**/}

            //_this._visibilityUpdateTimeout = null;
        }, this._visibilityUpdateInterval);
    }

    _handleVisibilityRetopo(options) {
        this._throttleVisibility();
    }

    _handleVisibilityChange(options) {
        this._throttleVisibility();
    }

    _throttleVisibility() {
        if (this._loadingDiv) {
            return;
        }
        
        this._updateVisibility();

        //if (!this._visibilityUpdateTimeout) {
        //    this._updateVisibility();
        //} else {
        //    this._visibilityUpdatePending = true;
        //}
    }

    _handleTreeSliderChange(options) {
        this._throttleTreeVisibility();
    }
    _throttleTreeVisibility() {        
        if (this._loadingDiv) {
            return;
        }
        
        this._updateTreeVisibility();
        //if (!this._visibilityUpdateTimeout) {
        //    this._updateTreeVisibility();
        //} else {
        //    this._visibilityUpdatePending = true;
        //}
    }

    _getLoaderForFileTypoe(type) {
        switch (type) {
            case 'file': return BlobLoader;
            case 'url' : return AjaxLoader;
        }
    }

    _getReaderForFileType(type) {
        switch (type) {
            case 'bvp': return BVPReader;
            case 'raw': return RAWReader;
            case 'zip': return ZIPReader;
        }
    }

    _getDialogForRenderer(renderer) {
        switch (renderer) {
            case 'mip': return MIPRendererDialog;
            case 'iso': return ISORendererDialog;
            case 'eam': return EAMRendererDialog;
            case 'mcs': return MCSRendererDialog;
            case 'mcm': return MCMRendererDialog;
            case 'mcc': return MCMRendererDialog; // yes, the same
            case 'dos': return DOSRendererDialog;
        }
    }

    _getDialogForToneMapper(toneMapper) {
        switch (toneMapper) {
            case 'range': return RangeToneMapperDialog;
            case 'reinhard': return ReinhardToneMapperDialog;
            case 'artistic': return ArtisticToneMapperDialog;
        }
    }
    _updateTreeVisibility() {

        if (this._visibilityUpdateTimeout) {
            return;            
        }
        
        this.isTreeTheActiveGUI=true;
        const renderer = this._renderingContext.getRenderer();        
        var _this = this;

        this._visibilityUpdateTimeout = setTimeout(() => {
            var tree_rules = _this._treeViewDialog._getGroupOfRules();
            
            renderer.setHtreeRules(tree_rules, _this._treeViewDialog);            
            renderer.reset();

            clearTimeout(_this._visibilityUpdateTimeout);
            _this._visibilityUpdateTimeout = null;

            if (this._visibilityUpdatePending) {
                this._visibilityUpdatePending = false;
                this._updateTreeVisibility();
            }

        }, this._visibilityUpdateInterval);


        //console.log('treeSliderChange');
        //var Htree=this._treeViewDialog._getHtree();
        //renderer.setHtreeRules(tree_rules, this._treeViewDialog);
        //renderer.reset();

        //if (this._visibilityUpdateTimeout) {
        //    clearTimeout(this._visibilityUpdateTimeout);
            //this._visibilityUpdateTimeout = null;
        //}

        //this._visibilityUpdateTimeout = setTimeout(() => {
        //    this._visibilityUpdateTimeout = null;

        //    if (this._visibilityUpdatePending) {
        //        this._visibilityUpdatePending = false;
        //        this._updateTreeVisibility();
        //    }
        //}, this._visibilityUpdateInterval);

    }

    getElementsAttribJSON(attrib, layout) {
        // RAW parsing
        const attributeArray = this.rawToJson(attrib, layout);
        elementsArray = this.attributeToElementsArray(attributeArray);
        return elementsArray;
    }
    rawToJson(attributes, layout) {
        // var result = [];
        var parser = new AttributesParser();
        var obj = {};
        for (var i = 0; i < layout.length; i++) {
            var property = layout[i];
            obj[property.name] = parser.parseValuesFromAttributeRawFile(i, layout.length, attributes, true);
            //find max min
            layout[i].hi = Math.max.apply(null, obj[property.name]);
            layout[i].lo = Math.min.apply(null, obj[property.name]);
            //  result.push(obj);
        }
        //console.log(layout);
        return obj;
    }
    attributeToElementsArray(attributeArray) {
        //console.log(attributeArray);
        var res = [];
        Object.keys(attributeArray).forEach(k => {
            Object.keys(attributeArray[k]).forEach(v => {
                if (!res[v]) {
                    res[v] = { id: v };
                }
                // add property 'k' to this record
                res[v][k] = attributeArray[k][v];
            });
        });
        return res;
    }

    getCamera() {
        const c = this._renderingContext._camera;
        const focus = this._renderingContext._cameraController._focus;
        const p = c.position;
        const r = c.rotation;
        return {
            near: c.near,
            far: c.far,
            zoomFactor: c.zoomFactor,
            position: [p.x, p.y, p.z, p.w],
            rotation: [r.x, r.y, r.z, r.w],
            focus: focus,
        };
    }

    setCamera(s) {
        const c = this._renderingContext._camera;
        const p = s.position;
        const r = s.rotation;
        c.isDirty = true;
        c.near = s.near;
        c.far = s.far;
        c.zoomFactor = s.zoomFactor;
        c.position.set(...p);
        c.rotation.set(...r);
        this._renderingContext._cameraController._focus = s.focus;
        c.resize(this._canvas.width, this._canvas.height);
        if (this._renderingContext._renderer) {
            this._renderingContext._renderer.reset();
        }
    }

}
