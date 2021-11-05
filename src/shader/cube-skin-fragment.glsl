varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vViewPosition;

uniform vec2 uResolution;
uniform float uTime;
uniform samplerCube uCubeMap;

void main() {
    vec2 st = gl_FragCoord.xy / uResolution.xy;

    vec4 color = texture(uCubeMap, (vPosition));
    color = 1. - vec4(smoothstep(0.4, 0.43, color.r));
    color += 0.2;
    color *= vec4(normalize(vNormal), 1.);

    //vec3 normal = normalize( cross( dFdx( vViewPosition ), dFdy( vViewPosition ) ) );
    //color = vec4(normalize(normal), 1.);
    gl_FragColor = color;
}