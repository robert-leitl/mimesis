varying vec2 vTexelSize;

uniform vec2 uResolution;

void main() {
    vTexelSize = vec2(1. / uResolution);

    gl_Position = vec4(position, 1.0);
}
