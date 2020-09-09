// #package js/main

// #include ../math
// #include ../WebGL.js
// #include ../loaders/AttributesParser.js
// #include ../DoubleBuffer.js
// #include ../DistanceFinder.js
// #include AbstractRenderer.js

class DOSRenderer extends AbstractRenderer {

    constructor(gl, idVolume, dataVolume, environmentTexture, camera, options) {
        super(gl, idVolume, environmentTexture, options);

        Object.assign(this, {
            steps: 50,
            slices: 200,
            extinction: 100,
            aperture: 30,
            samples: 8,
            colorBias: 0,
            alphaBias: 0,
            alphaTransfer: 0,
            cutDepth: 0,
            _depth: 0,
            _minDepth: 0,
            _maxDepth: 0,
            _meltingSourcePos: [2, 2, 2],
            _ks: 0.4,
            _kt: 6.0,
            _removalSelect: 0,
            _useCameraAsMS: true,
            _removalAutoUpdate: false,
            _Ca: 0.2,
            _Cd: 0.2,
            _Cs: 0.2,
            _Ce: 50,
            //_useAccOpacityTerm: 1,
            showBoundingBox: false,
            showAxes: true,
            boundingBoxColor: [1.0, 0.0, 0.0],
            _useShadingTerm: 1,
            _useDistTerm: 1
        }, options);
        this._renderStartTime = null;
        this._ListGUIObject = null;
        this._TreeGUIObject = null;
        this._idVolume = idVolume;
        this._dataVolume = dataVolume;
        this._maskVolume = null;
        this._accColorVolume = null;
        this._camera = camera;
        this._programs = WebGL.buildPrograms(gl, {
            integrate: SHADERS.DOSIntegrate,
            render: SHADERS.DOSRender,
            reset: SHADERS.DOSReset,
            transfer: SHADERS.PolarTransferFunction,
            lines: SHADERS.DrawLines
        }, MIXINS);

        this._numberInstance = 0;
        this._visStatusArray = null;
        this._visMembership = null;
        this._rules = [];
        this._layout = [];
        this._accColorArray = [];
        this._nRules = 0;
        this._minDist = 0;
        this._maxDist = 0;
        this._minGm = 0;
        this._maxGm = 0;
        this._isTreeGUI = false;
        this._attrib = gl.createBuffer();
        this._groupMembership = gl.createBuffer();
        this._visibilityStatus = gl.createBuffer();
        this._rulesOutInfo = [];
        this._rulesInInfo = null;
        this._localSize = {
            x: 128,
            y: 1,
            z: 1,
        };
        this._bbLinesVerticesArray = [];
        this._bbColorUpdated = false;        
        this._bblinesBuffer = gl.createBuffer();
        this._axesVerticesArray = [];
        this._axesBuffer = gl.createBuffer();

        this._colorStrip = WebGL.createTexture(gl, {
            min: gl.LINEAR,
            mag: gl.LINEAR,
        });


        this._maskTransferFunction = WebGL.createTexture(gl, {
            width: 256,
            height: 256,
            wrapS: gl.CLAMP_TO_EDGE,
            wrapT: gl.CLAMP_TO_EDGE,
            min: gl.LINEAR,
            mag: gl.LINEAR,
        });

        this._maskTransferFunctionFramebuffer = WebGL.createFramebuffer(gl, {
            color: [this._maskTransferFunction]
        });

        this.generateOcclusionSamples();
    }

    destroy() {
        const gl = this._gl;
        Object.keys(this._programs).forEach(programName => {
            gl.deleteProgram(this._programs[programName].program);
        });

        super.destroy();
    }
    setMinMaxGM(min,max)
    {
        this._minGm = min;
        this._maxGm = max;
    }
    setGUIObjs(treeGUIObj,listGUIObj)
    {
        this._ListGUIObject = listGUIObj;
        this._TreeGUIObject = treeGUIObj;
    }
    GUIChanged(isTree)
    {
        if(isTree)
        {
            this._isTreeGUI=true;
        }
        else
        {
            this._isTreeGUI=false;
        }
        this.getVisSettings();
        this.clearHardVisStatusArray();
    }
    getGUIObj()
    {
        if(this._isTreeGUI)
        {
            return this._TreeGUIObject;
        }
        else
        {
            return this._ListGUIObject;
        }
    }

    calculateDepth() {
        const mvMatrix = new Matrix();
        mvMatrix.multiply(this.viewMatrix, this.modelMatrix);

        const corners = [
            new Vector(0, 0, 0),
            new Vector(0, 0, 1),
            new Vector(0, 1, 0),
            new Vector(0, 1, 1),
            new Vector(1, 0, 0),
            new Vector(1, 0, 1),
            new Vector(1, 1, 0),
            new Vector(1, 1, 1),
        ];
        const depths = corners.map(v => -mvMatrix.transform(v).homogenize().z);
        return [Math.min(...depths), Math.max(...depths)];
    }

    generateOcclusionSamples() {
        const data = new Float32Array(this.samples * 2);
        let averagex = 0;
        let averagey = 0;
        for (let i = 0; i < this.samples; i++) {
            const r = Math.sqrt(Math.random());
            const phi = Math.random() * 2 * Math.PI;
            const x = r * Math.cos(phi);
            const y = r * Math.sin(phi);
            averagex += x / this.samples;
            averagey += y / this.samples;
            data[2 * i + 0] = x;
            data[2 * i + 1] = y;
        }
        for (let i = 0; i < this.samples; i++) {
            data[2 * i + 0] -= averagex;
            data[2 * i + 1] -= averagey;
        }

        const gl = this._gl;
        this._occlusionSamples = WebGL.createTexture(gl, {
            texture        : this._occlusionSamples,
            width          : this.samples,
            height         : 1,
            format         : gl.RG,
            internalFormat : gl.RG32F,
            type           : gl.FLOAT,
            min            : gl.NEAREST,
            mag            : gl.NEAREST,
            wrapS          : gl.CLAMP_TO_EDGE,
            wrapT          : gl.CLAMP_TO_EDGE,
            data           : data,
        });
    }

    setIDVolume(volume) {
        const gl = this._gl;
        const dimensions = volume._currentModality.dimensions;

        this._idVolume = volume;

        if (this._maskVolume) {
            gl.deleteTexture(this._maskVolume);
        }

        this._maskVolume = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_3D, this._maskVolume);
        gl.texStorage3D(gl.TEXTURE_3D, 1, gl.RGBA8,
            dimensions.width, dimensions.height, dimensions.depth);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);


    }

    setDataVolume(volume) {
        const gl = this._gl;
        const dimensions = volume._currentModality.dimensions;

        this._dataVolume = volume;
        //this._recomputeMinMaxGM();

    }

    setAttributes(attributes, layout, elements) {
        const gl = this._gl;

        WebGL.createBuffer(gl, {
            target: gl.SHADER_STORAGE_BUFFER,
            buffer: this._attrib,
            data: attributes || new ArrayBuffer()
        });

        // TODO: only float works for now
        const numberOfInstances = attributes ? (attributes.byteLength / (layout.length * 4)) : 0;

        console.log(numberOfInstances - 1);

        WebGL.createBuffer(gl, {
            target: gl.SHADER_STORAGE_BUFFER,
            buffer: this._groupMembership,
            data: new ArrayBuffer(numberOfInstances * 4)
        })

        this._layout = layout;
        if (layout) {
            this._numberInstance = numberOfInstances - 1;
            this.initInstancesArray();
            this._elements = elements;
            this.clearVisStatusArray();
        }
    }

    saveInFile(data) {
        // this function just to test the content of long variables
        let bl = new Blob([data], {
            type: "text/html"
        });
        let a = document.createElement("a");
        a.href = URL.createObjectURL(bl);
        a.download = "data.txt";
        a.hidden = true;
        document.body.appendChild(a);
        a.innerHTML =
            "someinnerhtml";
        a.click();
    }

    setHtreeRules(rules) {
        if(this._isTreeGUI == false)
        {
            this.GUIChanged(true);
        }
        this._rulesInInfo = rules;
        this._rulesOutInfo.length = 0;
        this.clearIsOccupiedArray();
        this._nRules = rules.length;
        this._rules = '';        
        var _x = rules.map((rule, index) => {
            var ruleObj = new Object();

            const attribute = rule.attribute;
            const hi = rule.hi;
            const lo = rule.lo;
            const visibility = (rule.visibility / 100).toFixed(4);


            var instancesStRule = this._getRuleElements(attribute, hi, lo);
            instancesStRule = this._shuffleArray(instancesStRule);
            instancesStRule = this._sortAscending(instancesStRule, 'avgProb');
            
            ruleObj.nRemoved = instancesStRule.length - (Math.floor(instancesStRule.length * visibility));
            ruleObj.nInstances = instancesStRule.length;
            ruleObj.isLocked = rule.isLocked;
            this._rulesOutInfo.push(ruleObj);
            this.updateVisStatusArray(instancesStRule, this._rulesOutInfo[index].nRemoved, index + 1);

            const phi = (index / rules.length) * 2 * Math.PI;
            const tfx = (Math.cos(phi) * 0.5 + 0.5).toFixed(4);
            const tfy = (Math.sin(phi) * 0.5 + 0.5).toFixed(4);
            var rangeCondition = '';

            if (attribute.length > 1) {

                for (var i = 0; i < attribute.length; i++) {
                    rangeCondition += `(instance.${attribute[i]} >= float(${lo[i]}) && instance.${attribute[i]} <= float(${hi[i]}))`;

                    if (i < attribute.length - 1) {
                        rangeCondition += `&&`;
                    }
                }
            }
            else {
                rangeCondition += `instance.${attribute[0]} >= float(${lo[0]}) && instance.${attribute[0]} <= float(${hi[0]})`;

            }


            //const visibilityCondition = `rand(vec2(float(id))).x < ${visibility}`;
            const visibilityCondition = `visStatus> uint(0)`;
            const groupStatement = `sGroupMembership[id] = ${index + 1}u; return vec2(${tfx}, ${tfy});`;
            const backgroundStatement = `sGroupMembership[id] = 0u; return vec2(0.5);`;

            this._rules += `if (${rangeCondition}) { if (${visibilityCondition}) {  ${groupStatement} } else { ${backgroundStatement} } }`;
        });

        if (this.getGUIObj() != null) {
            this.getGUIObj().computeHistograms(this._visStatusArray);
        }

        this._recomputeTransferFunction(rules);
        this._createVisibilityStatusBuffer();
        this._rebuildAttribCompute();
    }

    initInstancesArray() {
        this._visStatusArray = new Uint32Array(this._numberInstance);
        this._visMembership = new Uint32Array(this._numberInstance);
        this._isOccupied = new Boolean(this._numberInstance);
    }
    clearVisStatusArray() {
        for (var i = 0; i < this._numberInstance; i++) {
            if (this._rulesOutInfo.length > 0) {
                if (this._rulesOutInfo[this._visMembership[i] - 1].isLocked == true) {
                    this._isOccupied[i] = true;
                }
                else {
                    this._visStatusArray[i] = 1;
                    this._visMembership[i] = 0;
                    this._isOccupied[i] = false;
                }
            }
            else {
                this._visStatusArray[i] = 1;
                this._visMembership[i] = 0;
                this._isOccupied[i] = false;
            }
        }
    }
    clearHardVisStatusArray() {
        for (var i = 0; i < this._numberInstance; i++) {
            this._visStatusArray[i] = 1;
            this._visMembership[i] = 0;
            this._isOccupied[i] = false;
        }
    }
    clearIsOccupiedArray() {
        for (var i = 0; i < this._numberInstance; i++) {
            this._isOccupied[i] = false;
        }
    }
    _shuffleArray(array) { 
        var currentIndex = array.length, temporaryValue, randomIndex; 
        // While there remain elements to shuffle... 
        while (0 !== currentIndex) { // Pick a remaining element... 
            randomIndex = Math.floor(Math.random() * currentIndex);
             currentIndex -= 1; // And swap it with the current element. 
             temporaryValue = array[currentIndex]; 
             array[currentIndex] = array[randomIndex]; 
             array[randomIndex] = temporaryValue; 
            } 
        return array;
    }
    getVisSettings()
    {
        this._ks = this.getGUIObj()._binds.ks.getValue();
        this._kt = this.getGUIObj()._binds.kt.getValue();
    
        const removalMethod=this.getGUIObj()._binds.removalSelect.getValue()
        if( removalMethod =='depth')
        {
          this._removalSelect = 0;
        }
        else if( removalMethod =='CPF')
        {
          this._removalSelect = 1;
        }
        else //if( removalMethod =='Random')
        {
          this._removalSelect = 2;
        }
        this._removalAutoUpdate = this.getGUIObj()._binds.removalAutoUpdate.isChecked();
        
    }
    setRules(rules) {
        if(this._isTreeGUI == true)
        {
            this.GUIChanged(false);
        }
        this._rulesInInfo = rules;
        this._nRules = rules.length;
        this._rulesOutInfo.length = 0;
        this.clearIsOccupiedArray();
        const _rules = rules.map((rule, index) => {
            var ruleObj = new Object();
            const attribute = rule.attribute;
            const lo = rule.range.x.toFixed(4);
            const hi = rule.range.y.toFixed(4);
            const visibility = (rule.visibility / 100).toFixed(4);
            var instancesStRule = this._getRuleElements([attribute], [hi], [lo]);
            instancesStRule = this._shuffleArray(instancesStRule);
            instancesStRule = this._sortAscending(instancesStRule, 'avgProb');
            //console.log(instancesStRule);
            ruleObj.nRemoved = instancesStRule.length - (Math.floor(instancesStRule.length * visibility));
            ruleObj.nInstances = instancesStRule.length;
            ruleObj.isLocked = rule.isLocked;
            this._rulesOutInfo.push(ruleObj);
            this.updateVisStatusArray(instancesStRule, this._rulesOutInfo[index].nRemoved, index + 1);
            const phi = (index / rules.length) * 2 * Math.PI;
            const tfx = (Math.cos(phi) * 0.5 + 0.5).toFixed(4);
            const tfy = (Math.sin(phi) * 0.5 + 0.5).toFixed(4);

            const rangeCondition = `instance.${attribute} >= ${lo} && instance.${attribute} <= ${hi}`;

            //const visibilityCondition = `rand(vec2(float(id))).x < ${visibility}`;
            const visibilityCondition = `visStatus> uint(0)`;
            const groupStatement = `sGroupMembership[id] = ${index + 1}u; return vec2(${tfx}, ${tfy});`;
            const backgroundStatement = `sGroupMembership[id] = 0u; return vec2(0.5);`;
            return `if (${rangeCondition}) {
            if (${visibilityCondition}) {
                ${groupStatement}
            } else {
                ${backgroundStatement}
            }
        }`;
        });
        //console.log(this._elements);
        this._rules = _rules.join('\n');
        //this._printNumberOfHiddenInstances();
        this._recomputeTransferFunction(rules);
        this._createVisibilityStatusBuffer();
        this._rebuildAttribCompute();
    }
    _printNumberOfHiddenInstances()
    {
        var count=0;
        for (var i = 0; i < this._numberInstance; i++) {
            if (this._visStatusArray[i] == 0)
                count++; 
        }
        console.log("nHiddenInstances="+ count);
    }
    updateVisStatusArray(instancesStRule, numberRemoved, index) {
        var count = 0;
        for (var i = 0; i < instancesStRule.length; i++) {
            if (this._isOccupied[instancesStRule[i]['id']] == false &&
                this._visStatusArray[instancesStRule[i]['id']] == 0 &&
                this._visMembership[instancesStRule[i]['id']] == index) {
                count++;
                this._isOccupied[instancesStRule[i]['id']] = true;
            }
            if (count > numberRemoved)
                break;
        }


        for (var i = 0; i < instancesStRule.length; i++) {
            if (count < numberRemoved) // make this instance invisible if possible
            {
                if (this._isOccupied[instancesStRule[i]['id']] == false) {
                    this._visStatusArray[instancesStRule[i]['id']] = 0;
                    this._visMembership[instancesStRule[i]['id']] = index;
                    this._isOccupied[instancesStRule[i]['id']] = true;
                    count++;
                }
                /*else if (this._visMembership[instancesStRule[i]['id']] < index)
                {
                    // TODO: to remove this if-statement we need to fix instance count in sliders
                    count++;
                    
                }*/
                else if (this._visMembership[instancesStRule[i]['id']] > index) {
                    this._visStatusArray[instancesStRule[i]['id']] = 0;
                    this._visMembership[instancesStRule[i]['id']] = index;
                    this._isOccupied[instancesStRule[i]['id']] = true;
                    count++;
                }
            }
            else  // make this instance visible if possible
            {
                if (this._isOccupied[instancesStRule[i]['id']] == false) {
                    this._visStatusArray[instancesStRule[i]['id']] = 1
                    this._visMembership[instancesStRule[i]['id']] = index;
                    this._isOccupied[instancesStRule[i]['id']] = true;
                }
                else if (this._visMembership[instancesStRule[i]['id']] > index) {
                    this._visStatusArray[instancesStRule[i]['id']] = 1;
                    this._visMembership[instancesStRule[i]['id']] = index;
                }
            }


        }        

        
    }
    _sortAscending(array, key) {
        if(array == null) {
            return null;
        }

        return array.sort(function (a, b) {
            var x = a[key];
            var y = b[key];
            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
        });
    }
    _sortDescending(array, key) {
        return array.sort(function (a, b) {
            var x = a[key];
            var y = b[key];
            return ((x > y) ? -1 : ((x < y) ? 1 : 0));
        });
    }
    _rebuildAttribCompute() {
        const gl = this._gl;

        //console.time('rebuild attrib');

        if (this._programs.compute) {
            gl.deleteProgram(this._programs.compute.program);
        }

        const members = [];
        for (const attrib of this._layout) {
            // attrib.type must be numeric type!!! no 'enum' allowed in shader
            //members.push(attrib.type + ' ' + attrib.name + ';');
            members.push('float ' + attrib.name + ';');
        }
        const instance = members.join('\n');

        const rules = this._rules;

        this._programs.compute = WebGL.buildPrograms(gl, {
            compute: SHADERS.AttribCompute
        }, {
            instance,
            rules,
            rand: MIXINS.rand,
            localSizeX: this._localSize.x,
            localSizeY: this._localSize.y,
            localSizeZ: this._localSize.z,
        }).compute;

        //console.timeEnd('rebuild attrib');

        this._recomputeMask();
    }

    _recomputeMask() {
        const gl = this._gl;

        const program = this._programs.compute;
        gl.useProgram(program.program);

        // gl.uniform1f(program.uniforms.uNumInstances, this._numberInstance);
        const dimensions = this._idVolume._currentModality.dimensions;
        gl.bindImageTexture(0, this._idVolume.getTexture(), 0, true, 0, gl.READ_ONLY, gl.R32UI);
        gl.bindImageTexture(1, this._maskVolume, 0, true, 0, gl.WRITE_ONLY, gl.RGBA8);

        gl.bindBufferBase(gl.SHADER_STORAGE_BUFFER, 0, this._attrib);
        gl.bindBufferBase(gl.SHADER_STORAGE_BUFFER, 1, this._groupMembership);
        gl.bindBufferBase(gl.SHADER_STORAGE_BUFFER, 2, this._visibilityStatus);

        const groupsX = Math.ceil(dimensions.width / this._localSize.x);
        const groupsY = Math.ceil(dimensions.height / this._localSize.y);
        const groupsZ = Math.ceil(dimensions.depth / this._localSize.z);
        gl.dispatchCompute(groupsX, groupsY, groupsZ);
    }

    _rebuildProbCompute() {
        const gl = this._gl;

        //console.time('rebuild probability');

        if (this._programs.compute) {
            gl.deleteProgram(this._programs.compute.program);
        }

        this._programs.compute = WebGL.buildPrograms(gl, {
            compute: SHADERS.ProbCompute
        }, {
            computeCPF: MIXINS.computeCPF,
            rand: MIXINS.rand,
            localSizeX: this._localSize.x,
            localSizeY: this._localSize.y,
            localSizeZ: this._localSize.z,
        }).compute;

        //console.timeEnd('rebuild probability');
        //this._createAccColorTexture();
        this._recomputeProbability();
    }

    _recomputeProbability() {
        //console.time('probability');

        //var t0 = performance.now();
        const gl = this._gl;
        const program = this._programs.compute;
        gl.useProgram(program.program);

        const dimensions = this._idVolume._currentModality.dimensions;
        gl.bindImageTexture(1, this._idVolume.getTexture(), 0, true, 0, gl.READ_ONLY, gl.R32UI);
        gl.bindImageTexture(2, this._dataVolume.getTexture(), 0, true, 0, gl.READ_ONLY, gl.RGBA8);

        /*gl.activeTexture(gl.TEXTURE0);
        gl.uniform1i(program.uniforms.uAccColorVolume, 0);
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, this._accColorVolume);*/
        //-------- for context preserve formula ----------------------
        gl.uniform1i(program.uniforms.uShadingTerm, this._useShadingTerm);
        gl.uniform1i(program.uniforms.uDistTerm, this._useDistTerm);
        gl.uniform1i(program.uniforms.uRemovalSelect, this._removalSelect);
        gl.uniform1f(program.uniforms.uMinGM, this._minGm);
        gl.uniform1f(program.uniforms.uMaxGM, this._maxGm);
        gl.uniform1f(program.uniforms.uMinDist, this._minDist);
        gl.uniform1f(program.uniforms.uMaxDist, this._maxDist);
        gl.uniform1f(program.uniforms.uKs, this._ks);
        gl.uniform1f(program.uniforms.uKt, this._kt);
        gl.uniform3fv(program.uniforms.uCameraPos, this._camera.get3DPosition());
        if (this._useCameraAsMS == true)
            gl.uniform3fv(program.uniforms.uLightPos, this._camera.get3DPosition());
        else
            gl.uniform3fv(program.uniforms.uLightPos, this._meltingSourcePos);
        //-------- for testing ----------------------
        gl.uniform1i(program.uniforms.uShadingTerm, this._useShadingTerm);
        gl.uniform1i(program.uniforms.uDistTerm, this._useDistTerm);
        gl.uniform1f(program.uniforms.uCa, this._Ca);
        gl.uniform1f(program.uniforms.uCd, this._Cd);
        gl.uniform1f(program.uniforms.uCs, this._Cs);
        gl.uniform1f(program.uniforms.uCe, this._Ce);
        //----------------------------------------------------------------
        gl.uniform1f(program.uniforms.uNumInstances, this._numberInstance);
        const mvpit = this.calculateMVPInverseTranspose();
        gl.uniformMatrix4fv(program.uniforms.uMvpInverseMatrix, false, mvpit.m);

        const Max_nAtomic = this._numberInstance * 2;
        gl.uniform1f(program.uniforms.vx, 1.0 / dimensions.width);
        gl.uniform1f(program.uniforms.vy, 1.0 / dimensions.height);
        gl.uniform1f(program.uniforms.vz, 1.0 / dimensions.depth);

        const ssbo = gl.createBuffer();
        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, ssbo);
        gl.bindBufferBase(gl.SHADER_STORAGE_BUFFER, 0, ssbo);

        const result = new Uint32Array(Max_nAtomic);
        gl.bufferData(gl.SHADER_STORAGE_BUFFER, result, gl.DYNAMIC_COPY);

        const groupsX = Math.ceil(dimensions.width / this._localSize.x);
        const groupsY = Math.ceil(dimensions.height / this._localSize.y);
        const groupsZ = Math.ceil(dimensions.depth / this._localSize.z);

        gl.dispatchCompute(groupsX, groupsY, groupsZ);
        gl.getBufferSubData(gl.SHADER_STORAGE_BUFFER, 0, result);

        /***** compute avarage  ****/
        var j = 0;
        for (var i = 0; i < this._numberInstance; i++) {
            var prob_float = result[j] / 100.0;
            if (result[j + 1] > 0) {
                this._elements[i].avgProb = prob_float / result[j + 1];
            } else {
                this._elements[i].avgProb = 0;
            }
            j += 2;
        }
        gl.deleteBuffer(ssbo);
        //var t1 = performance.now();
        //console.log('avg Probability is computed in ' + (t1 - t0) + " milliseconds.");
        //console.timeEnd('probability');
    }

    _recomputeTransferFunction(rules) {
        const gl = this._gl;

        // create color strip
        const colors = rules
            .map(rule => rule.color)
            .map(hex => CommonUtils.hex2rgb(hex))
            .map(color => [color.r, color.g, color.b, 1])
            .flat()
            .map(x => x * 255);
        const data = new Uint8Array(colors);

        // upload color strip
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._colorStrip);
        WebGL.createTexture(gl, {
            unit: 0,
            texture: this._colorStrip,
            width: rules.length,
            height: 1,
            data: data
        });

        // render transfer function
        const program = this._programs.transfer;
        gl.useProgram(program.program);
        gl.uniform1i(program.uniforms.uColorStrip, 0);
        gl.uniform1f(program.uniforms.uOffset, 0.5 / rules.length);
        gl.uniform1f(program.uniforms.uFalloffStart, 0.2);
        gl.uniform1f(program.uniforms.uFalloffEnd, 0.8);

        gl.bindBuffer(gl.ARRAY_BUFFER, this._clipQuad);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

        gl.bindFramebuffer(gl.FRAMEBUFFER, this._maskTransferFunctionFramebuffer);
        gl.viewport(0, 0, 256, 256); // TODO: get actual TF size
        gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    }

    _getRuleElements(className, hiList, loList) {
        if(this._elements == null) {
            return null;
        }

        var el = this.clone(this._elements);
        for (var j = 0; j < className.length; j++) {
            if (hiList[j] == null)
                break;
            el = el.filter(x => x[className[j]] <= hiList[j] && x[className[j]] >= loList[j])
        }

        return el.map(function (x) {
            var v = new Object();
            v.id = x.id;
            v.avgProb = x.avgProb;
            return v;
        });
    }

    clone(obj) {
        if (null == obj || "object" != typeof obj) return obj;
        var copy = new obj.constructor();
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
        }
        return copy;
    }

    _createVisibilityStatusBuffer() {
        const gl = this._gl;

        var visStatus_buffer = this._visStatusArray.buffer;
        WebGL.createBuffer(gl, {
            target: gl.SHADER_STORAGE_BUFFER,
            buffer: this._visibilityStatus,
            data: visStatus_buffer,
            hint: gl.DYNAMIC_COPY
        });
    }

    _resetFrame() {
        const gl = this._gl;

        [this._minDepth, this._maxDepth] = this.calculateDepth();
        this._minDepth = Math.max(this._minDepth, 0);
        this._depth = this._minDepth + this.cutDepth * (this._maxDepth - this._minDepth);

        gl.drawBuffers([
            gl.COLOR_ATTACHMENT0,
            gl.COLOR_ATTACHMENT1,
            gl.COLOR_ATTACHMENT2,
            gl.COLOR_ATTACHMENT3,
        ]);

        let program = this._programs.reset;
        gl.useProgram(program.program);
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

        //----------------------------------------------------
        //========= recompute avgProb ==========
        this.getVisSettings();
        this._recomputeMinMaxDistance();
        this._rebuildProbCompute();
        //==== removal Automatic Update =========
        if (this._removalAutoUpdate == true && this._rulesInInfo != null) {
            this.clearVisStatusArray();
            if (this._isTreeGUI == false)
                this.setRules(this._rulesInInfo, this.getGUIObj());
            else
                this.setHtreeRules(this._rulesInInfo, this.getGUIObj());
        }
        //-------------------------------------------------------
    }

    _generateFrame() {

    }

    _integrateFrame() {
        const gl = this._gl;

        if (!this._maskVolume) {
            return;
        }

        const program = this._programs.integrate;
        gl.useProgram(program.program);

        gl.drawBuffers([
            gl.COLOR_ATTACHMENT0,
            gl.COLOR_ATTACHMENT1,
            gl.COLOR_ATTACHMENT2,
            gl.COLOR_ATTACHMENT3,
        ]);

        gl.activeTexture(gl.TEXTURE4);
        gl.uniform1i(program.uniforms.uMaskVolume, 4);
        gl.bindTexture(gl.TEXTURE_3D, this._maskVolume);

        gl.activeTexture(gl.TEXTURE5);
        gl.uniform1i(program.uniforms.uIDVolume, 5);
        gl.bindTexture(gl.TEXTURE_3D, this._idVolume.getTexture());

        gl.activeTexture(gl.TEXTURE6);
        gl.uniform1i(program.uniforms.uDataVolume, 6);
        gl.bindTexture(gl.TEXTURE_3D, this._dataVolume.getTexture());

        gl.activeTexture(gl.TEXTURE7);
        gl.uniform1i(program.uniforms.uMaskTransferFunction, 7);
        gl.bindTexture(gl.TEXTURE_2D, this._maskTransferFunction);

        gl.activeTexture(gl.TEXTURE8);
        gl.uniform1i(program.uniforms.uDataTransferFunction, 8);
        gl.bindTexture(gl.TEXTURE_2D, this._transferFunction);

        gl.activeTexture(gl.TEXTURE9);
        gl.uniform1i(program.uniforms.uOcclusionSamples, 9);
        gl.bindTexture(gl.TEXTURE_2D, this._occlusionSamples);

        gl.uniform1ui(program.uniforms.uOcclusionSamplesCount, this.samples);
        gl.uniform1f(program.uniforms.uExtinction, this.extinction);

        gl.uniform1f(program.uniforms.uColorBias, this.colorBias);
        gl.uniform1f(program.uniforms.uAlphaBias, this.alphaBias);
        gl.uniform1f(program.uniforms.uAlphaTransfer, this.alphaTransfer);
        const mvpit = this.calculateMVPInverseTranspose();
        gl.uniformMatrix4fv(program.uniforms.uMvpInverseMatrix, false, mvpit.m);

        gl.bindBufferBase(gl.SHADER_STORAGE_BUFFER, 0, this._groupMembership);

        const sliceDistance = (this._maxDepth - this._minDepth) / this.slices;
        gl.uniform1f(program.uniforms.uSliceDistance, sliceDistance);

        for (let step = 0; step < this.steps; step++) {
            if (this._depth == this._minDepth + this.cutDepth * (this._maxDepth - this._minDepth)) {
                this._renderStartTime = performance.now();
            }
            if (this._depth > this._maxDepth) {
                if (this._renderStartTime !== null) {
                    const renderEndTime = performance.now();
                    const dtime = renderEndTime - this._renderStartTime;
                    this._renderStartTime = null;
                    //console.log('render: ' + dtime + ' ms');
                }
                break;
            }

            gl.activeTexture(gl.TEXTURE0);
            gl.uniform1i(program.uniforms.uColor, 0);
            gl.bindTexture(gl.TEXTURE_2D, this._accumulationBuffer.getAttachments().color[0]);

            gl.activeTexture(gl.TEXTURE1);
            gl.uniform1i(program.uniforms.uOcclusion, 1);
            gl.bindTexture(gl.TEXTURE_2D, this._accumulationBuffer.getAttachments().color[1]);

            gl.activeTexture(gl.TEXTURE2);
            gl.uniform1i(program.uniforms.uInstanceID, 2);
            gl.bindTexture(gl.TEXTURE_2D, this._accumulationBuffer.getAttachments().color[2]);

            gl.activeTexture(gl.TEXTURE3);
            gl.uniform1i(program.uniforms.uGroupID, 3);
            gl.bindTexture(gl.TEXTURE_2D, this._accumulationBuffer.getAttachments().color[3]);

            const occlusionExtent = sliceDistance * Math.tan(this.aperture * Math.PI / 180);
            const correction = new Vector(1, 1, -this._depth, 1);
            this.projectionMatrix.transform(correction);
            correction.homogenize();
            correction.x *= occlusionExtent;
            correction.y *= occlusionExtent;

            gl.uniform2f(program.uniforms.uOcclusionScale, correction.x, correction.y);
            gl.uniform1f(program.uniforms.uDepth, correction.z);

            this._accumulationBuffer.use();
            gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
            this._accumulationBuffer.swap();
            this._depth += sliceDistance;
        }

        // Swap again to undo the last swap by AbstractRenderer
        this._accumulationBuffer.swap();
        this._countOccludedInstance();

    }

    _renderFrame() {
        const gl = this._gl;

        const program = this._programs.render;
        gl.useProgram(program.program);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._accumulationBuffer.getAttachments().color[0]);

        gl.uniform1i(program.uniforms.uAccumulator, 0);

        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

        // TODO: merge textures...
        if (this.showBoundingBox) {
            this._renderBBGizmo();
        }

        if (this.showAxes) {
            this._renderAxesGizmo();
        }
    }

    setBoundingBoxColor(color) {
        this.boundingBoxColor = color;
        this._bbColorUpdated = true;
    }

    _renderBBGizmo() {
        const gl = this._gl;
        const c = { r: this.boundingBoxColor[0], g: this.boundingBoxColor[1], b: this.boundingBoxColor[2] };

        if (this._bbLinesVerticesArray.length == 0 || this._bbColorUpdated) {
            this._bbLinesVerticesArray = [
                0.0, 0.0, 0.0,
                c.r, c.g, c.b,
                1.0, 0.0, 0.0,
                c.r, c.g, c.b,
                1.0, 0.0, 0.0,
                c.r, c.g, c.b,
                1.0, 0.0, 1.0,
                c.r, c.g, c.b,
                1.0, 0.0, 1.0,
                c.r, c.g, c.b,
                0.0, 0.0, 1.0,
                c.r, c.g, c.b,
                0.0, 0.0, 1.0,
                c.r, c.g, c.b,
                0.0, 0.0, 0.0,
                c.r, c.g, c.b,

                0.0, 1.0, 0.0,
                c.r, c.g, c.b,
                1.0, 1.0, 0.0,
                c.r, c.g, c.b,
                1.0, 1.0, 0.0,
                c.r, c.g, c.b,
                1.0, 1.0, 1.0,
                c.r, c.g, c.b,
                1.0, 1.0, 1.0,
                c.r, c.g, c.b,
                0.0, 1.0, 1.0,
                c.r, c.g, c.b,
                0.0, 1.0, 1.0,
                c.r, c.g, c.b,
                0.0, 1.0, 0.0,
                c.r, c.g, c.b,

                0.0, 0.0, 0.0,
                c.r, c.g, c.b,
                0.0, 1.0, 0.0,
                c.r, c.g, c.b,
                1.0, 0.0, 0.0,
                c.r, c.g, c.b,
                1.0, 1.0, 0.0,
                c.r, c.g, c.b,
                1.0, 0.0, 1.0,
                c.r, c.g, c.b,
                1.0, 1.0, 1.0,
                c.r, c.g, c.b,
                0.0, 0.0, 1.0,
                c.r, c.g, c.b,
                0.0, 1.0, 1.0,
                c.r, c.g, c.b,
            ];

            // Bind appropriate array buffer to it
            gl.bindBuffer(gl.ARRAY_BUFFER, this._bblinesBuffer);

            // Pass the vertex data to the buffer
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this._bbLinesVerticesArray), gl.STATIC_DRAW);

            // Bind appropriate array buffer to it
            gl.bindBuffer(gl.ARRAY_BUFFER, null);

            this._bbColorUpdated = false;
        }
        
        this._drawLines(this._bblinesBuffer);
    }

    _drawLines(dataBuffer) {
        const gl = this._gl;

        const program = this._programs.lines;
        gl.useProgram(program.program);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this._accumulationBuffer.getAttachments().color[0]);

        // Bind appropriate array buffer to it
        gl.bindBuffer(gl.ARRAY_BUFFER, dataBuffer);

        // Get the attribute location
        const coords = program.attributes.coordinates;
        const colors = program.attributes.colors;

        gl.enableVertexAttribArray(coords);
        gl.enableVertexAttribArray(colors);
        gl.vertexAttribPointer(coords, 3, gl.FLOAT, false, 6 * 4, 0);
        gl.vertexAttribPointer(colors, 3, gl.FLOAT, false, 6 * 4, 3 * 4);

        const mvpit = this.calculateMVPInverseTranspose();
        gl.uniformMatrix4fv(program.uniforms.uMvpInverseMatrix, false, mvpit.m);

        gl.drawArrays(gl.LINES, 0, 24);

        gl.disableVertexAttribArray(coords);
        gl.disableVertexAttribArray(colors);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    _renderAxesGizmo() {
        const gl = this._gl;

        if (this._axesVerticesArray.length == 0) {
            this._axesVerticesArray = [
                0.0, 0.0, 0.0,
                1.0, 0.0, 0.0,
                0.1, 0.0, 0.0,
                1.0, 0.0, 0.0,

                0.0, 0.0, 0.0,
                0.0, 1.0, 0.0,
                0.0, 0.1, 0.0,
                0.0, 1.0, 0.0,

                0.0, 0.0, 0.0,
                0.0, 0.0, 1.0,
                0.0, 0.0, 0.1,
                0.0, 0.0, 1.0
            ];

            // Bind appropriate array buffer to it
            gl.bindBuffer(gl.ARRAY_BUFFER, this._axesBuffer);

            // Pass the vertex data to the buffer
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this._axesVerticesArray), gl.STATIC_DRAW);

            // Bind appropriate array buffer to it
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
        }

        this._drawLines(this._axesBuffer);
    }

    _getFrameBufferSpec() {
        const gl = this._gl;
        return [{
            width: this._bufferSize,
            height: this._bufferSize,
            min: gl.NEAREST,
            mag: gl.NEAREST,
            format: gl.RGBA,
            internalFormat: gl.RGBA,
            type: gl.UNSIGNED_BYTE
        }];
    }

    _getAccumulationBufferSpec() {
        const gl = this._gl;

        const colorBuffer = {
            width: this._bufferSize,
            height: this._bufferSize,
            min: gl.NEAREST,
            mag: gl.NEAREST,
            format: gl.RGBA,
            internalFormat: gl.RGBA,
            type: gl.UNSIGNED_BYTE
        };

        const occlusionBuffer = {
            width: this._bufferSize,
            height: this._bufferSize,
            min: gl.NEAREST,
            mag: gl.NEAREST,
            format: gl.RED,
            internalFormat: gl.R32F,
            type: gl.FLOAT
        };

        const instanceIDBuffer = {
            width: this._bufferSize,
            height: this._bufferSize,
            min: gl.NEAREST,
            mag: gl.NEAREST,
            format: gl.RED_INTEGER,
            internalFormat: gl.R32UI,
            type: gl.UNSIGNED_INT
        };

        const groupIDBuffer = {
            width: this._bufferSize,
            height: this._bufferSize,
            min: gl.NEAREST,
            mag: gl.NEAREST,
            format: gl.RED_INTEGER,
            internalFormat: gl.R32UI,
            type: gl.UNSIGNED_INT
        };
        return [
            colorBuffer,
            occlusionBuffer,
            instanceIDBuffer,
            groupIDBuffer
        ];
    }
    _countOccludedInstance() {

        if (this._nRules >= 1) {
            const InstanceID = this._getInstanceIDFramebuffer();
            const ruleID = this._getGroupIDFramebuffer();

            var frameBufferSize = this._bufferSize * this._bufferSize;

            for (var index = 0; index < this._nRules; index++) {
                var count = new Uint32Array(this._numberInstance);
                for (var j = 0; j < frameBufferSize; j++) {
                    if (ruleID[j] == index + 1)
                        count[InstanceID[j]] = 1;
                }
                this._rulesOutInfo[index].nSeen = this._computeSum(count);
            }

            if (this.getGUIObj() != null) {
                this.getGUIObj()._updateOccludedInstance(this._rulesOutInfo);
            }
        }
    }

    _getInstanceIDFramebuffer() {
        const texture = this._accumulationBuffer.getAttachments().color[2];
        return this._mapTextureToArray(texture);

    }
    _getGroupIDFramebuffer() {
        const texture = this._accumulationBuffer.getAttachments().color[3];
        return this._mapTextureToArray(texture);
    }
    _clearAccColorArray() {
        this._accColorArray.length = 0;
    }
    _pushToAccColorArray() {
        const texture = this._accumulationBuffer.getAttachments().color[0];

        this._accColorArray.push(texture);

    }
    _mergeTypedArrays(arrayOne, arrayTwo) {

        // Checks for truthy values or empty arrays on each argument
        // to avoid the unnecessary construction of a new array and
        // the type comparison
        if (!arrayTwo || arrayTwo.length === 0) return arrayOne;
        if (!arrayOne || arrayOne.length === 0) return arrayTwo;

        var mergedArray = new Uint8Array(arrayOne.length + arrayTwo.length);
        mergedArray.set(arrayOne);
        mergedArray.set(arrayTwo, arrayOne.length);

        return mergedArray;
    }
    _createAccColorTexture() {
        if (this._accColorArray.length > 0) {
            const gl = this._gl;
            const layerCount = this._accColorArray.length;

            if (this._accColorVolume) {
                gl.deleteTexture(this._accColorVolume);
            }

            this._accColorVolume = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D_ARRAY, this._accColorVolume);

            gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
            gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, this._bufferSize, this._bufferSize, layerCount);

            const Data = this._mergeArrayOfTextures(this._accColorArray);
            const dataBuffer = gl.createBuffer();
            WebGL.createBuffer(gl, {
                target: gl.PIXEL_UNPACK_BUFFER,
                buffer: dataBuffer,
                data: Data.buffer
            });
            gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, dataBuffer);
            gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, 0,
                this._bufferSize, this._bufferSize, layerCount,
                gl.RGBA, gl.UNSIGNED_BYTE, dataBuffer);

            gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null);
            gl.deleteBuffer(dataBuffer);

        }
    }
    _mergeArrayOfTextures(textures) {
        var accArray = new Uint8Array();
        textures.forEach(texture => {
            const array = this._mapTextureToArray(texture);
            accArray = this._mergeTypedArrays(accArray, array);
        });
        return accArray;
    }
    _mapTextureToArray(texture) {
        var gl = this._gl;

        var fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        var res = gl.checkFramebufferStatus(gl.FRAMEBUFFER);

        if (res == gl.FRAMEBUFFER_COMPLETE) {
            const format = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT);
            const type = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE);
            if (type == gl.UNSIGNED_BYTE)
                var pixels = new Uint8Array(this._bufferSize * this._bufferSize * 4);
            else
                var pixels = new Uint32Array(this._bufferSize * this._bufferSize);
            gl.readPixels(0, 0, this._bufferSize, this._bufferSize, format, type, pixels);
        }
        gl.deleteFramebuffer(fb);

        return pixels;
    }
    _computeSum(array) {
        return array.reduce((a, b) => a + b, 0);

    }
    //=============================================================================
    _recomputeMinMaxDistance() {
        var distFinder = new DistanceFinder();
        const result = distFinder._findShortestANDLongestDistance(this._camera.get3DPosition());
        this._minDist = result[0];
        this._maxDist = result[1];

        //console.log('minDist',this._minDist);
        //console.log('maxDist',this._maxDist);


    }
    _recomputeMinMaxGM() {
        const gl = this._gl;

        if (this._programs.compute) {
            gl.deleteProgram(this._programs.compute.program);
        }

        this._programs.compute = WebGL.buildPrograms(gl, {
            compute: SHADERS.GmCompute
        }, {
            localSizeX: this._localSize.x,
            localSizeY: this._localSize.y,
            localSizeZ: this._localSize.z,
        }).compute;

        const program = this._programs.compute;
        gl.useProgram(program.program);

        const dimensions = this._dataVolume._currentModality.dimensions;
        gl.bindImageTexture(1, this._dataVolume.getTexture(), 0, true, 0, gl.READ_ONLY, gl.RGBA8);

        const gm_ssbo = gl.createBuffer();
        gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, gm_ssbo);
        gl.bindBufferBase(gl.SHADER_STORAGE_BUFFER, 0, gm_ssbo);

        const gm_result = new Uint32Array(2);
        gl.bufferData(gl.SHADER_STORAGE_BUFFER, gm_result, gl.DYNAMIC_COPY);

        const groupsX = Math.ceil(dimensions.width / this._localSize.x);
        const groupsY = Math.ceil(dimensions.height / this._localSize.y);
        const groupsZ = Math.ceil(dimensions.depth / this._localSize.z);

        gl.dispatchCompute(groupsX, groupsY, groupsZ);
        gl.getBufferSubData(gl.SHADER_STORAGE_BUFFER, 0, gm_result);

        this._minGm = gm_result[0] / 10000.0;;
        this._maxGm = gm_result[1] / 10000.0;;
        //console.log(this._minGm);
        //console.log(this._maxGm);  
        gl.deleteBuffer(gm_ssbo);
    }
    //=================== accOpacity ===============================
    /*_clearAccColorArray()
{
    this._accColorArray.length=0;
}
_pushToAccColorArray()
{
    const texture = this._accumulationBuffer.getAttachments().color[0];
    this._accColorArray.push(texture);
    
}
_mergeTypedArrays(arrayOne, arrayTwo) {
 
    // Checks for truthy values or empty arrays on each argument
    // to avoid the unnecessary construction of a new array and
    // the type comparison
    if(!arrayTwo || arrayTwo.length === 0) return arrayOne;
    if(!arrayOne || arrayOne.length === 0) return arrayTwo;
 
    var mergedArray = new Uint8Array(arrayOne.length + arrayTwo.length);
    mergedArray.set(arrayOne);
    mergedArray.set(arrayTwo, arrayOne.length);
 
    return mergedArray;
}
_createAccColorTexture() {
    if(this._accColorArray.length>0)
    {
        const gl = this._gl;
        const layerCount=this._accColorArray.length;

        if (this._accColorVolume) {
            gl.deleteTexture(this._accColorVolume);
        }

        this._accColorVolume = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, this._accColorVolume);
       
        gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
        gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8,this._bufferSize, this._bufferSize, layerCount);
       
        const Data=this._mergeArrayOfTextures(this._accColorArray);
        const dataBuffer= gl.createBuffer();             
        WebGL.createBuffer(gl, {
            target: gl.PIXEL_UNPACK_BUFFER,
            buffer: dataBuffer,
            data: Data.buffer
        });
        
        gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, dataBuffer); 
        gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, 0,
            this._bufferSize, this._bufferSize, layerCount, 
            gl.RGBA, gl.UNSIGNED_BYTE, dataBuffer);
      
        gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null); 
        gl.deleteBuffer(dataBuffer);
        
    }
}
_mergeArrayOfTextures(textures)
{
    var accArray=new Uint8Array();
    console.log('start');
    textures.forEach(texture=>{
        const array=this._mapTextureToArray(texture);
        //console.log(this._computeSum(array));
        accArray = this._mergeTypedArrays(accArray, array);
    });
    console.log('done');
    return accArray;
}*/
}


