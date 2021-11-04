varying vec2 vUv;
varying vec3 vNormal;

uniform vec2 uResolution;
uniform float uTime;
uniform samplerCube uCubeMap;

void main() {
    vec2 st = gl_FragCoord.xy / uResolution.xy;

    vec4 color = texture(uCubeMap, vNormal);
    color = vec4(smoothstep(0.4, 0.43, color.r));
    color += 0.2;
    gl_FragColor = color;
}