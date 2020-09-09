// #package glsl/shaders

// #section AttribCompute/compute

#version 310 es
precision mediump sampler3D;
layout (local_size_x = @localSizeX, local_size_y = @localSizeY, local_size_z = @localSizeZ) in;

struct Instance {
    @instance
};
layout (std430, binding = 0) buffer bAttributes {
    Instance sInstances[];
};
layout (std430, binding = 1) buffer bGroupMembership {
    uint sGroupMembership[];
};
layout (std430, binding = 2) buffer visibilityStatus {
    uint vData[];
};

layout (r32ui, binding = 0) restrict readonly highp uniform uimage3D iID;
layout (rgba8, binding = 1) restrict writeonly highp uniform image3D oMask;

@rand
vec2 rules(Instance instance, uint visStatus, uint id) {
    if (id == 0u) {
        sGroupMembership[id] = 0u;
        return vec2(0.5);
    }

    //float prob = (rand(vec2(float(id))).x);
    
    @rules

    sGroupMembership[id] = 0u;
    return vec2(0.5);
}

void main() {
    ivec3 voxel = ivec3(gl_GlobalInvocationID);
    ivec3 imageSize = imageSize(iID);
    if (voxel.x < imageSize.x && voxel.y < imageSize.y && voxel.z < imageSize.z) {

        uint id = imageLoad(iID, voxel).r;
        Instance instance = sInstances[id];
        uint visStatus = vData[id] ;
    
        vec2 mask = rules(instance, visStatus, id);
        imageStore(oMask, voxel, vec4(mask, 0, 0));

    }

}
