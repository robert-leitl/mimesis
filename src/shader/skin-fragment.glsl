varying vec2 vUv;

uniform vec2 uResolution;
uniform float uTime;
uniform sampler2D uTexture;

void main() {
    vec2 st = gl_FragCoord.xy / uResolution.xy;
    vec4 color = texture2D(uTexture, vUv);

    gl_FragColor = vec4(smoothstep(0.4, 0.47, color.r));
}
