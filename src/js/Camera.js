// #package js/main

// #include math

class Camera {

    constructor(options) {
        Object.assign(this, {
            fovX: 1,
            fovY: 1,
            near: 0.1,
            far: 5,
            zoomFactor: 0.001
        }, options);

        this.position = new Vector();
        this.rotation = new Quaternion();
        this.viewMatrix = new Matrix();
        this.projectionMatrix = new Matrix();
        this.transformationMatrix = new Matrix();
        this.isDirty = false;

        this.createOnScreenControls();
    }

    updateViewMatrix() {
        this.rotation.toRotationMatrix(this.viewMatrix.m);
        this.viewMatrix.m[3] = this.position.x;
        this.viewMatrix.m[7] = this.position.y;
        this.viewMatrix.m[11] = this.position.z;
        this.viewMatrix.inverse();
    }

    updateProjectionMatrix() {
        const w = this.fovX * this.near;
        const h = this.fovY * this.near;
        this.projectionMatrix.fromFrustum(-w, w, -h, h, this.near, this.far);
    }

    get3DPosition() {
        //var pos = { x: 0, y: 0, z: 1.5, w: 0 };
        //this.transformationMatrix.transform(pos);
        return [this.position.x + 0.5, this.position.y + 0.5, this.position.z + 0.5];
        //var pos = [this.viewMatrix.m[12], this.viewMatrix.m[13], this.viewMatrix.m[14]];
        //return [pos.x, pos.y, pos.z];
    }
    updateMatrices() {
        this.updateViewMatrix();
        this.updateProjectionMatrix();
        this.transformationMatrix.multiply(this.projectionMatrix, this.viewMatrix);
    }

    resize(width, height) {
        this.fovX = width * this.zoomFactor;
        this.fovY = height * this.zoomFactor;
        this.isDirty = true;
    }

    zoom(amount) {
        const scale = Math.exp(amount);
        this.zoomFactor *= scale;
        this.fovX *= scale;
        this.fovY *= scale;
        this.isDirty = true;
    }

    createOnScreenControls() {
        var wrapper = document.createElement("div");
        wrapper.className = "camera-controls-wrapper";
        document.body.appendChild(wrapper);

        var _this = this;

        // zoom-in
        var btn = this.addButton(wrapper, 'camera-zoom-in');
        btn.onclick = function () {
            _this.zoom(-0.1);
        };
        // zoom-out
        var btn = this.addButton(wrapper, 'camera-zoom-out');
        btn.onclick = function () {
            _this.zoom(0.1);
        };

        // x+
        var btn = this.addButton(wrapper, 'camera-x-possitive');
        btn.onclick = function () {
            _this.startTransition(_this.position,
                new Vector(1.5, 0.0, 0.0),
                _this.rotation,
                new Quaternion(0, -0.707, 0, 0.707));
        };

        // x-
        var btn = this.addButton(wrapper, 'camera-x-negative');
        btn.onclick = function () {
            _this.startTransition(_this.position,
                new Vector(-1.5, 0.0, 0.0),
                _this.rotation,
                new Quaternion(0, -0.707, 0, -0.707));
        };

        // y+
        var btn = this.addButton(wrapper, 'camera-y-possitive');
        btn.onclick = function () {
            _this.startTransition(_this.position,
                new Vector(0.0, 1.5, 0.0),
                _this.rotation,
                new Quaternion(0.707, 0, 0, 0.707));
        };

        // y-
        var btn = this.addButton(wrapper, 'camera-y-negative');
        btn.onclick = function () {
            _this.startTransition(_this.position,
                new Vector(0.0, -1.5, 0.0),
                _this.rotation,
                new Quaternion(-0.707, 0, 0, 0.707));
        };

        // z+
        var btn = this.addButton(wrapper, 'camera-z-possitive');
        btn.onclick = function () {
            _this.startTransition(_this.position,
                new Vector(0.0, 0.0, 1.5),
                _this.rotation,
                new Quaternion(0, 0, 0, 1));
        };

        // z-
        var btn = this.addButton(wrapper, 'camera-z-negative');
        btn.onclick = function () {
            _this.startTransition(_this.position,
                new Vector(0.0, 0.0, -1.5),
                _this.rotation,
                new Quaternion(0, -1, 0, 0));
        };

    }

    addButton(parent, className) {
        var btn = document.createElement('div');
        btn.className = 'camera-button ' + className;
        parent.appendChild(btn);

        return btn;
    }

    startTransition(fromPos, toPos, fromRot, toRot) {
        var time = 0;
        var _this = this;

        var timer = setInterval(function () {
            _this.position = _this.lerp(fromPos, toPos, time);
            _this.rotation = Quaternion.slerp(fromRot, toRot, time);
            _this.isDirty = true;

            if (time >= 1) {
                // just to be sure that the correct position and rotation is set
                _this.position = toPos;
                _this.rotation = toRot;
                _this.isDirty = true;

                clearInterval(timer);
            }

            time += 0.1;            
        }, 10);
    }

    lerp(from, to, time) {
        return new Vector((to.x - from.x) * time + from.x,
            (to.y - from.y) * time + from.y,
            (to.z - from.z) * time + from.z);
    }
}
