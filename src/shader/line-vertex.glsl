attribute float lineDistance;

varying vec2 vUv;
varying float vLineDistance;

void main() {
    vUv = uv;
    vLineDistance = lineDistance;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
