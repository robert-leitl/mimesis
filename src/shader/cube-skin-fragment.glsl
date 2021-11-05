varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

uniform vec2 uResolution;
uniform float uTime;
uniform samplerCube uCubeMap;

void main() {
    vec2 st = gl_FragCoord.xy / uResolution.xy;

    vec4 color = texture(uCubeMap, vPosition);
    color = 1. - vec4(smoothstep(0.4, 0.45, color.r));
    color += 0.2;
    color *= vec4(normalize(vNormal), 1.);
    gl_FragColor = color;
}