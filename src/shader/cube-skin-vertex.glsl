varying vec2 vUv;
varying vec3 vNormal;

uniform samplerCube uCubeMap;
uniform float uDisplacement;

vec3 distort(vec3 pos) {
    vec3 distortedPos = vec3(pos);
    float displacement = texture(uCubeMap, vNormal).r;
    displacement = smoothstep(0.4, .7, displacement);

    distortedPos += vNormal * displacement * uDisplacement;

    return distortedPos;
}

void main() {
    vUv = uv;
    vNormal = normal;

    vec3 pos = distort(position);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
