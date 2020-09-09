// #package glsl/shaders

// #section DOSIntegrate/vertex

#version 310 es
precision mediump float;

uniform mat4 uMvpInverseMatrix;
uniform float uDepth;

layout (location = 0) in vec2 aPosition;

out vec2 vPosition2D;
out vec3 vPosition3D;
void main() {
    vec4 dirty = uMvpInverseMatrix * vec4(aPosition, uDepth, 1);
    vPosition3D = dirty.xyz / dirty.w;
    vPosition2D = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0, 1);
}

// #section DOSIntegrate/fragment

#version 310 es
precision mediump float;
precision mediump sampler2D;
precision mediump sampler3D;
precision mediump usampler2D;
precision mediump usampler3D;

uniform sampler3D uMaskVolume;
uniform usampler3D uIDVolume;
uniform sampler3D uDataVolume;
uniform sampler3D uAccOpacityVolume;
uniform sampler2D uMaskTransferFunction;
uniform sampler2D uDataTransferFunction;

uniform sampler2D uColor;
uniform sampler2D uOcclusion;
uniform sampler2D uOcclusionSamples;
uniform usampler2D uInstanceID;
uniform usampler2D uGroupID;

uniform vec2 uOcclusionScale;
uniform uint uOcclusionSamplesCount;
uniform float uExtinction;
uniform float uSliceDistance;
uniform float uColorBias;
uniform float uAlphaBias;
uniform float uAlphaTransfer;

in vec2 vPosition2D;
in vec3 vPosition3D;

layout (location = 0) out vec4 oColor;
layout (location = 1) out float oOcclusion;
layout (location = 2) out uint oInstanceID;
layout (location = 3) out uint oGroupID;

layout (std430, binding = 0) buffer bGroupMembership {
    uint sGroupMembership[];
};
layout (rgba8, binding = 1) restrict writeonly highp uniform image3D oAccColorVolume;

float computeGradientMagnitude(vec3 g) {
	return length(g);
}

vec4 sampleVolumeColor(vec3 position) {
    vec4 maskVolumeSample = texture(uMaskVolume, position);
    vec4 dataVolumeSample = texture(uDataVolume, position);
    vec4 maskTransferSample = texture(uMaskTransferFunction, maskVolumeSample.rg);
    //vec4 dataTransferSample = texture(uDataTransferFunction, dataVolumeSample.rg);
    float gm = computeGradientMagnitude(dataVolumeSample.gba);
    vec4 dataTransferSample = texture(uDataTransferFunction, vec2(dataVolumeSample.r, gm));
    //vec3 mixedColor = mix(maskTransferSample.rgb, dataTransferSample.rgb, dataTransferSample.a);
    //vec4 finalColor = vec4(mixedColor, maskTransferSample.a);
    vec3 finalColor = mix(maskTransferSample.rgb, dataTransferSample.rgb, uColorBias);
    float maskAlpha = maskTransferSample.a * mix(1.0, dataTransferSample.a, uAlphaTransfer);
    float finalAlpha = mix(maskAlpha, dataTransferSample.a, uAlphaBias);
    return vec4(finalColor, finalAlpha);
}

float calculateOcclusion(float extinction) {
    float occlusion = 0.0;
    for (uint i = 0u; i < uOcclusionSamplesCount; i++) {
        vec2 occlusionSampleOffset = texelFetch(uOcclusionSamples, ivec2(i, 0), 0).rg;
        vec2 occlusionSamplePosition = vPosition2D + occlusionSampleOffset * uOcclusionScale;
        occlusion += texture(uOcclusion, occlusionSamplePosition).r;
    }

    return (occlusion / float(uOcclusionSamplesCount)) * exp(-extinction * uSliceDistance);
}

void main() {
    float prevOcclusion = texture(uOcclusion, vPosition2D).r;
    vec4 prevColor = texture(uColor, vPosition2D);
    uint instanceID = texture(uInstanceID, vPosition2D).r;
    uint groupID = texture(uGroupID, vPosition2D).r;

    if (any(greaterThan(vPosition3D, vec3(1))) || any(lessThan(vPosition3D, vec3(0)))) {
        oColor = prevColor;
        oOcclusion = prevOcclusion;
        oInstanceID = instanceID;
        oGroupID = groupID;
        return;
    }

    if (groupID == 0u) {
        uint newInstanceID = texture(uIDVolume, vPosition3D).r;
        uint newGroupID = sGroupMembership[newInstanceID];
        if (newGroupID != 0u) {
            oInstanceID = newInstanceID;
            oGroupID = newGroupID;
        } else {
            oInstanceID = instanceID;
            oGroupID = groupID;
        }
    } else {
        oInstanceID = instanceID;
        oGroupID = groupID;
    }

    vec4 transferSample = sampleVolumeColor(vPosition3D);
    float extinction = transferSample.a * uExtinction;
    float alpha = 1.0 - exp(-extinction * uSliceDistance);
    vec3 color = transferSample.rgb * prevOcclusion * alpha;
    oColor = prevColor + vec4(color * (1.0 - prevColor.a), alpha);
    oColor.a = min(oColor.a, 1.0);
    oOcclusion = calculateOcclusion(extinction);
}

// #section DOSRender/vertex

#version 310 es
precision mediump float;

layout (location = 0) in vec2 aPosition;
out vec2 vPosition;

void main() {
    vPosition = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0, 1);
}

// #section DOSRender/fragment

#version 310 es
precision mediump float;

uniform mediump sampler2D uAccumulator;

in vec2 vPosition;
out vec4 oColor;

void main() {
    vec4 color = texture(uAccumulator, vPosition);
    oColor = mix(vec4(1), vec4(color.rgb, 1), color.a);
}

// #section DOSReset/vertex

#version 310 es
precision mediump float;

layout (location = 0) in vec2 aPosition;

void main() {
    gl_Position = vec4(aPosition, 0, 1);
}

// #section DOSReset/fragment

#version 310 es
precision mediump float;

layout (location = 0) out vec4 oColor;
layout (location = 1) out float oOcclusion;
layout (location = 2) out uint oInstanceID;
layout (location = 3) out uint oGroupID;

void main() {
    oColor = vec4(0);
    oOcclusion = 1.0;
    oInstanceID = 0u;
    oGroupID = 0u;
}
