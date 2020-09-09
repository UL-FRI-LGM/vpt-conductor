// #package glsl/shaders
// #section GmCompute/compute

#version 310 es
precision mediump sampler3D;
layout (local_size_x = @localSizeX, local_size_y = @localSizeY, local_size_z = @localSizeZ) in;
layout (rgba8, binding = 1) restrict readonly highp uniform image3D uDataVolume;
layout (std430, binding = 0) buffer gm_ssbo {
	uint gmBounds[];
};

vec3 getGradient(ivec3 voxel) {
    vec4 dataVolumeSample = imageLoad(uDataVolume, voxel);
    return dataVolumeSample.gba;
}

float computeGradientMagnitude(ivec3 voxel) {
    vec3 g = getGradient(voxel);
	return sqrt(g.x*g.x + g.y*g.y + g.z*g.z);
}
uint convertToInt(float x)
{
    return uint(floor(x*10000.0));
}
void main() {
    ivec3 voxel = ivec3(gl_GlobalInvocationID);
    ivec3 imageSize = imageSize(uDataVolume);
    if (voxel.x < imageSize.x && voxel.y < imageSize.y && voxel.z < imageSize.z) {
        float gm = computeGradientMagnitude(voxel);
        atomicMin(gmBounds[0],convertToInt(gm)); //minGM
        atomicMax(gmBounds[1],convertToInt(gm)); // maxGM 
    }

}