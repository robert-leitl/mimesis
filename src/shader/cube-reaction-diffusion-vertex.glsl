varying vec2 vTexelSize;
varying vec3 vNormal;
varying vec3 vTangent;
varying vec3 vBitangent;

attribute vec3 tangent;

uniform vec2 uResolution;

void main() {
    vTexelSize = vec2(1. / uResolution);
    vNormal = normal;
    vTangent = tangent;
    vBitangent = cross(vNormal, vTangent);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
