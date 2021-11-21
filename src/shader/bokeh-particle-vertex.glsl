#pragma glslify: noise = require('./noise.glsl')

varying float vAlpha;

uniform float uTime;

void main() {
    vec3 pos = position;
    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vec4 viewPosition = modelViewMatrix * vec4(pos, 1.0);
    viewPosition.z -= noise(pos.xyz * uTime * .03) * 1.5;
    //viewPosition.y -= noise(pos.yzx * uTime * .03) * 1.5;

    float size = min(max(3.2 + viewPosition.z, 0.), 3.) / 3.;
    gl_PointSize = size * size * 700.;

    vAlpha = size;

    gl_Position = projectionMatrix * viewPosition;
}