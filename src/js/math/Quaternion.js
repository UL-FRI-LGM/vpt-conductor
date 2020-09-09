// #package js/main

class Quaternion {

    constructor(x, y, z, w) {
        this.x = x || 0;
        this.y = y || 0;
        this.z = z || 0;
        this.w = (w !== undefined) ? w : 1;
    }

    clone() {
        return new Quaternion(this.x, this.y, this.z, this.w);
    }

    copy(q) {
        this.x = q.x;
        this.y = q.y;
        this.z = q.z;
        this.w = q.w;
        return this;
    }

    set(x, y, z, w) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
        return this;
    }

    identity() {
        this.x = this.y = this.z = 0;
        this.w = 1;
        return this;
    }

    inverse() {
        this.x *= -1;
        this.y *= -1;
        this.z *= -1;
        return this;
    }

    multiply(a, b) {
        var ax = a.x, ay = a.y, az = a.z, aw = a.w;
        var bx = b.x, by = b.y, bz = b.z, bw = b.w;

        this.x = ax * bw + aw * bx + ay * bz - az * by;
        this.y = ay * bw + aw * by + az * bx - ax * bz;
        this.z = az * bw + aw * bz + ax * by - ay * bx;
        this.w = aw * bw - ax * bx - ay * by - az * bz;

        return this;
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
    }

    normalize() {
        var length = this.length();

        this.x /= length;
        this.y /= length;
        this.z /= length;
        this.w /= length;

        return this;
    }

    fromAxisAngle() {
        var s = Math.sin(this.w / 2);
        var c = Math.cos(this.w / 2);

        this.x *= s;
        this.y *= s;
        this.z *= s;
        this.w = c;

        return this;
    }

    fromDevice(alpha, beta, gamma) {
        var degtorad = Math.PI / 180;
        var x = beta * degtorad / 2;
        var y = gamma * degtorad / 2;
        var z = alpha * degtorad / 2;

        var cx = Math.cos(x);
        var sx = Math.sin(x);
        var cy = Math.cos(y);
        var sy = Math.sin(y);
        var cz = Math.cos(z);
        var sz = Math.sin(z);

        this.x = sx * cy * cz - cx * sy * sz;
        this.y = cx * sy * cz + sx * cy * sz;
        this.z = cx * cy * sz + sx * sy * cz;
        this.w = cx * cy * cz - sx * sy * sz;

        return this;
    }

    toRotationMatrix(m) {
        var x = this.x, y = this.y, z = this.z, w = this.w;
        var x2 = x + x, y2 = y + y, z2 = z + z;
        var xx = x * x2, xy = x * y2, xz = x * z2;
        var yy = y * y2, yz = y * z2, zz = z * z2;
        var wx = w * x2, wy = w * y2, wz = w * z2;

        m[0] = 1 - (yy + zz);
        m[4] = xy - wz;
        m[8] = xz + wy;

        m[1] = xy + wz;
        m[5] = 1 - (xx + zz);
        m[9] = yz - wx;

        m[2] = xz - wy;
        m[6] = yz + wx;
        m[10] = 1 - (xx + yy);

        m[3] = m[7] = m[11] = m[12] = m[13] = m[14] = 0;
        m[15] = 1;
    }

    static slerp(q1, q2, t) {
        /*
        var dotproduct = q1.x * q2.x + q1.y * q2.y + q1.z * q2.z + q1.w * q2.w;
        
        // algorithm adapted from Shoemake's paper
        time = time / 2.0;

        var theta = Math.acos(dotproduct);

        if (theta < 0.0) 
            theta = -theta;

        var st = Math.sin(theta);
        var sut = Math.sin(time * theta);
        var sout = Math.sin((1 - time) * theta);
        var coeff1 = sout / st;
        var coeff2 = sut / st;

        var res = new Quaternion();
        res.x = coeff1 * q1.x + coeff2 * q2.x;
        res.y = coeff1 * q1.y + coeff2 * q2.y;
        res.z = coeff1 * q1.z + coeff2 * q2.z;
        res.w = coeff1 * q1.w + coeff2 * q2.w;

        res.normalize();

        return res;
        */

        var theta, mult1, mult2;

        var w1 = q1.w;
        var x1 = q1.x;
        var y1 = q1.y;
        var z1 = q1.z;
        var w2 = q2.w;
        var x2 = q2.x;
        var y2 = q2.y;
        var z2 = q2.z;

        // Reverse the sign of q2 if q1.q2 < 0.
        if (w1 * w2 + x1 * x2 + y1 * y2 + z1 * z2 < 0) {
            w2 = -w2; x2 = -x2; y2 = -y2; z2 = -z2;
        }

        theta = Math.acos(w1 * w2 + x1 * x2 + y1 * y2 + z1 * z2);

        if (theta > 0.000001) {
            mult1 = Math.sin((1 - t) * theta) / Math.sin(theta);
            mult2 = Math.sin(t * theta) / Math.sin(theta);
        }

        // To avoid division by 0 and by very small numbers the approximation of sin(angle)
        // by angle is used when theta is small (0.000001 is chosen arbitrarily).
        else {
            mult1 = 1 - t;
            mult2 = t;
        }

        var w3 = mult1 * w1 + mult2 * w2;
        var x3 = mult1 * x1 + mult2 * x2;
        var y3 = mult1 * y1 + mult2 * y2;
        var z3 = mult1 * z1 + mult2 * z2;

        return new Quaternion(x3, y3, z3, w3);
    }

}
