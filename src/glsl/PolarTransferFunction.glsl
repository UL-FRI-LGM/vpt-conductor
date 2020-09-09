// #package glsl/shaders

// #section PolarTransferFunction/vertex

#version 300 es
precision mediump float;

layout(location = 0) in vec2 aPosition;
out vec2 vPosition;

void main() {
    vPosition = aPosition;
    gl_Position = vec4(aPosition, 0.0, 1.0);
}

// #section PolarTransferFunction/fragment

#version 300 es
precision mediump float;

#define INV_2PI 0.15915494309

uniform sampler2D uColorStrip;
uniform float uOffset;
uniform float uFalloffStart;
uniform float uFalloffEnd;

in vec2 vPosition;
out vec4 oColor;

void main() {
    float r = length(vPosition);
    float phi = atan(vPosition.y, vPosition.x);
    vec4 color = texture(uColorStrip, vec2(phi * INV_2PI + uOffset, 0));
    float falloff = smoothstep(uFalloffStart, uFalloffEnd, r);
    oColor = color * vec4(1, 1, 1, falloff);
}
