// #package js/main

// #include math

class DistanceFinder {

    constructor() {
        this.minDist = Number.POSITIVE_INFINITY;
        this.maxDist = Number.NEGATIVE_INFINITY;
    }
    _findShortestANDLongestDistance(cameraPos) {
        const positions = [
            // Front face
            [0.0, 0.0, 1.0],
            [1.0, 0.0, 1.0],
            [1.0, 1.0, 1.0],
            [0.0, 1.0, 1.0],
            // Back face
            [0.0, 0.0, 0.0],
            [0.0, 1.0, 0.0],
            [1.0, 1.0, 0.0],
            [1.0, 0.0, 0.0],
            // Top face
            [0.0, 1.0, 0.0],
            [0.0, 1.0, 1.0],
            [1.0, 1.0, 1.0],
            [1.0, 1.0, 0.0],
            // Bottom face
            [0.0, 0.0, 0.0],
            [1.0, 0.0, 0.0],
            [1.0, 0.0, 1.0],
            [0.0, 0.0, 1.0],
            // Right face
            [1.0, 0.0, 0.0],
            [1.0, 1.0, 0.0],
            [1.0, 1.0, 1.0],
            [1.0, 0.0, 1.0],
            // Left face
            [0.0, 0.0, 0.0],
            [0.0, 0.0, 1.0],
            [0.0, 1.0, 1.0],
            [0.0, 1.0, 0.0],
        ];
        const triangles = [
            // front face
            [0, 1, 2],
            [0, 2, 3],
            // back face
            [4, 5, 6],
            [4, 6, 7],
            // top face
            [8, 9, 10],
            [8, 10, 11],
            // bottom face
            [12, 13, 14],
            [12, 14, 15],
            // right
            [16, 17, 18],
            [16, 18, 19],
            // left  
            [20, 21, 22],
            [20, 22, 23],
        ];

        this.minDist = Number.POSITIVE_INFINITY;
        for (var i = 0; i < triangles.length; i++) {
            var closestPoint = this._closestPointOnTriangle(cameraPos, positions, triangles[i]);

            var newMinDist = this.distance(closestPoint, cameraPos);

            this.minDist = Math.min(this.minDist, newMinDist);
        }

        this.maxDist = Number.NEGATIVE_INFINITY;
        for (var i = 0; i < positions.length; i++) {
            var dist = this.distance(cameraPos, positions[i]);

            if (dist > this.maxDist) {
                this.maxDist = dist;
            }
        }

        return [
            this.minDist,
            this.maxDist
        ];
    }
    _closestPointOnTriangle(point, positions, triangle) {
        var v1 = positions[triangle[0]];
        var v2 = positions[triangle[1]];
        var v3 = positions[triangle[2]];

        var edge0 = this.subtract3D(v2, v1);
        var edge1 = this.subtract3D(v3, v1);
        var v0 = this.subtract3D(v1, point);

        var a = this.dotProduct3D(edge0, edge0);
        var b = this.dotProduct3D(edge0, edge1);
        var c = this.dotProduct3D(edge1, edge1);
        var d = this.dotProduct3D(edge0, v0);
        var e = this.dotProduct3D(edge1, v0);

        var det = a * c - b * b;
        var s = b * e - c * d;
        var t = b * d - a * e;

        if (s + t < det) {
            if (s < 0) {
                if (t < 0) {
                    if (d < 0) {
                        s = this.clamp(-d / a, 0, 1);
                        t = 0;
                    }
                    else {
                        s = 0;
                        t = this.clamp(-e / c, 0, 1);
                    }
                }
                else {
                    s = 0;
                    t = this.clamp(-e / c, 0, 1);
                }
            }
            else if (t < 0) {
                s = this.clamp(-d / a, 0, 1);
                t = 0;
            }
            else {
                var invDet = 1 / det;
                s *= invDet;
                t *= invDet;
            }
        }
        else {
            if (s < 0) {
                var tmp0 = b + d;
                var tmp1 = c + e;
                if (tmp1 > tmp0) {
                    var numer = tmp1 - tmp0;
                    var denom = a - 2 * b + c;
                    s = this.clamp(numer / denom, 0, 1);
                    t = 1 - s;
                }
                else {
                    t = this.clamp(-e / c, 0, 1);
                    s = 0;
                }
            }
            else if (t < 0) {
                if (a + d > b + e) {
                    var numer = c + e - b - d;
                    var denom = a - 2 * b + c;
                    s = this.clamp(numer / denom, 0, 1);
                    t = 1 - s;
                }
                else {
                    s = this.clamp(-e / c, 0, 1);
                    t = 0;
                }
            }
            else {
                var numer = c + e - b - d;
                var denom = a - 2 * b + c;
                s = this.clamp(numer / denom, 0, 1);
                t = 1 - s;
            }
        }

        return this.add3D(this.add3D(v1, this.scalarMultiplication(s, edge0)), this.scalarMultiplication(t, edge1));

    }
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
    subtract3D(v1, v2) {
        return [
            v1[0] - v2[0],
            v1[1] - v2[1],
            v1[2] - v2[2],
        ];
    }
    add3D(v1, v2) {
        return [
            v1[0] + v2[0],
            v1[1] + v2[1],
            v1[2] + v2[2],
        ];
    }
    dotProduct3D(v1, v2) {
        return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
    }
    distance(p1, p2) {
        return Math.sqrt(Math.pow((p2[0] - p1[0]), 2) + Math.pow((p2[1] - p1[1]), 2) + Math.pow((p2[2] - p1[2]), 2));
    }
    scalarMultiplication(s, v) {
        return [
            s * v[0],
            s * v[1],
            s * v[2],
        ];
    }
    inverse3DPoint(v) {
        return [
            -1 * v[0],
            -1 * v[1],
            -1 * v[2],
        ];
    }


}
