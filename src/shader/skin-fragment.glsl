varying vec2 vUv;
varying vec3 vNormal;

uniform vec2 uResolution;
uniform float uTime;
uniform sampler2D uTexture;
uniform samplerCube uCubeMap;

#define PI 3.14159265359
#define PI_05 1.5707963268

vec2 fold(vec2 pos) {
    vec2 st = 1. - abs((pos - 0.5) * 2.);
    if (st.x > st.y) st = st.yx;
    return st;
}

vec4 cubemap( sampler2D sam, in vec3 d )
{
    // intersect cube
    vec3 n = abs(d);
    vec3 v = (n.x>n.y && n.x>n.z) ? d.xyz: 
             (n.y>n.x && n.y>n.z) ? d.yxz:
                                    d.zxy;
    // project into face
    vec2 q = v.yz/v.x;
    // undistort in the edges
    //q *= 1.25 - 0.25*q*q;
    return texture2D( sam, fold(0.5+0.5*q) );
}

void main() {
    vec2 st = gl_FragCoord.xy / uResolution.xy;

    //vec4 color = cubemap(uTexture, normalize(vNormal));
    //color = texture2D(uTexture, fold(vUv));

    //gl_FragColor = vec4(smoothstep(0.4, 0.47, color.r));
    gl_FragColor = vec4(smoothstep(0.4, 0.47, texture2D(uTexture, vUv).r));
    //gl_FragColor = texture2D(uTexture, vUv);
}
