varying vec2 vUv;
varying vec3 vNormal;

uniform samplerCube uCubeMap;

vec3 distort(vec3 pos) {
    vec3 distortedPos = vec3(pos);
    float displacement = texture(uCubeMap, vNormal).r;
    displacement = smoothstep(0.3, 1.0, displacement);

    distortedPos += vNormal * displacement * 0.1;

    return distortedPos;
}

void main() {
    vUv = uv;
    vNormal = normal;

    vec3 pos = distort(position);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
