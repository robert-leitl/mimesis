#pragma glslify: noise = require('./noise.glsl')

varying vec2 vTexelSize;
varying vec3 vNormal;
varying vec3 vTangent;
varying vec3 vBitangent;

attribute vec3 tangent;

uniform vec2 uResolution;

// https://sciencing.com/plane-3-points-8123924.html
vec3 getRandomPerpendicular(vec3 n, vec3 b) {
    float r1 = noise(n.x);
    float r2 = noise(n.z);
    vec3 t = vec3(r1, r2, 0.);
    t.z = (-n.x * t.x - n.y * t.y) / n.z;
    return t;
}

mat4 rotationMatrix(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    
    return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
                oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
                0.0,                                0.0,                                0.0,                                1.0);
}

vec3 rotate(vec3 v, vec3 axis, float angle) {
	mat4 m = rotationMatrix(axis, angle);
	return (m * vec4(v, 1.0)).xyz;
}

void main() {
    vTexelSize = vec2(1. / uResolution);
    vNormal = normal;
    vTangent = tangent;
    vTangent = rotate(tangent, normal, noise(position));
    vBitangent = cross(vNormal, vTangent);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
