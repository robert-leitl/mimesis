varying vec2 vUv;

uniform vec2 uResolution;
uniform float uTime;
uniform sampler2D uTexture;

void main() {
    vec2 st = gl_FragCoord.xy / uResolution.xy;
    gl_FragColor = texture2D(uTexture, vUv);
}
