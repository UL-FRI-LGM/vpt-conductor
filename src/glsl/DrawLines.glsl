// #package glsl/shaders

// #section DrawLines/vertex

#version 300 es
precision highp float;

uniform mat4 uMvpInverseMatrix;
//uniform vec3 color;

in vec3 coordinates;
in vec3 colors;

out vec3 oColor;

void main() {
    oColor = colors;
    gl_Position = uMvpInverseMatrix * vec4(coordinates, 1.0);
}

// #section DrawLines/fragment
         
#version 300 es
precision highp float;

in vec3 oColor;
out vec4 fragColor;

void main() {
    fragColor = vec4(oColor, 0.1);
}