#pragma glslify: noise = require('./noise.glsl')

varying float vAlpha;

uniform float uTime;

void main() {
    vec3 pos = position;
    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vec4 viewPosition = modelViewMatrix * vec4(pos, 1.0);
    float t = uTime * .05;
    /*viewPosition.z -= noise(pos.xyz * t + 10.);
    viewPosition.y -= noise(pos.xyz * t + 5.);
    viewPosition.x -= noise(pos.xyz * t + 2.);*/

    float size = min(max(3.2 + viewPosition.z, 0.), 3.) / 3.;
    gl_PointSize = size * size * 400.;

    vAlpha = size;

    gl_Position = projectionMatrix * viewPosition;
}