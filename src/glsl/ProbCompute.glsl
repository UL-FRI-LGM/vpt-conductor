// #package glsl/shaders

// #section ProbCompute/compute

#version 310 es
//precision mediump sampler2DArray;
layout (local_size_x = @localSizeX, local_size_y = @localSizeY, local_size_z = @localSizeZ) in;

uniform mat4 uMvpInverseMatrix;
uniform float vx;
uniform float vy;
uniform float vz;
uniform int uRemovalSelect; 
//------------ for context preserve formula ---------- 
uniform float uMinGM;
uniform float uMaxGM;
uniform float uMinDist;
uniform float uMaxDist;
uniform float uKs;
uniform float uKt;
uniform vec3 uLightPos;
uniform vec3 uCameraPos;
//----------- for testing context preserve formula ----
uniform int uShadingTerm;
uniform int uDistTerm;
uniform float uCa;//ambient lighting coefficient
uniform float uCd;//diffuse lighting coefficient
uniform float uCs;//specular lighting coefficient
uniform float uCe;//shininess;
//------------------------------------------------------
layout (r32ui, binding = 1) restrict readonly highp uniform uimage3D iID;
layout (rgba8, binding = 2) restrict readonly highp uniform image3D uDataVolume;
//uniform sampler2DArray uAccColorVolume;

layout (std430, binding = 0) buffer ssbo {
	uint counter[];
};
vec3 getPosition3D(ivec3 voxel)
{    
    vec3 pos = vec3(float(voxel.x) * vx, float(voxel.y) * vy, float(voxel.z) * vz); // corner
    pos += vec3(vx * 0.5, vy * 0.5, vz * 0.5); // center
    //vec4 dirty = uMvpInverseMatrix * vec4(pos, 1);
    return pos;//(dirty.xyz / dirty.w); // division by 1?
}
vec3 getGradient(ivec3 voxel) {
    vec4 dataVolumeSample = imageLoad(uDataVolume, voxel);
    return dataVolumeSample.gba;
}
uint convertProbToInt(float x)
{
    return uint(round(x*100.0));
}
@computeCPF
@rand
void main() {
    ivec3 voxel = ivec3(gl_GlobalInvocationID);
    ivec3 imageSize = imageSize(iID);
    uint id = imageLoad(iID, voxel).r;
    if (voxel.x < imageSize.x && voxel.y < imageSize.y && voxel.z < imageSize.z) {
        vec3 pos = getPosition3D(voxel);
        float prob;
        if(uRemovalSelect == 0) // based on depth
        {
            prob = distance(pos,uCameraPos); 
        }
        else if(uRemovalSelect == 1) // based on context preserved formula
        {
           // float accOpacity = texture(uAccColorVolume, pos).a;
            prob = computeCPF(pos,voxel);//,accOpacity); // prob 
        }
        else //if(uRemovalSelect == 2) // random
        {
           prob = (rand(vec2(float(id))).x);
           //prob = 1.0;
        }
        uint p = convertProbToInt(prob); 
        int index=(int(id))*2;
        atomicAdd(counter[index], p);            
        atomicAdd(counter[index + 1], uint(1));
    }

}