varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vViewPosition;

uniform samplerCube uCubeMap;
uniform float uDisplacement;

vec3 distort(vec3 pos) {
    vec3 distortedPos = vec3(pos);
    float displacement = 1. - texture(uCubeMap, pos).r;
    displacement = smoothstep(0.4, .85, displacement);
    distortedPos += normalize(pos) * displacement * uDisplacement;
    return distortedPos;
}

vec3 orthogonal(vec3 v) {
    return normalize(abs(v.x) > abs(v.z) ? 
    vec3(-v.y, v.x, 0.0) : 
    vec3(0.0, -v.z, v.y));
}

vec3 distortNormal(vec3 p, vec3 dp, vec3 n) {
    float f = 0.007;
    float radius = length(p);
    vec3 t1 = orthogonal(n);
    vec3 t2 = cross(t1, n);
    vec3 q = normalize(p + t1 * f) * radius;
    vec3 r = normalize(p + t2 * f) * radius;
    vec3 dq = distort(q);
    vec3 dr = distort(r);
    return normalize(cross(dq - dp, dr - dp));
}

vec3 distortNormalSmooth(vec3 p, vec3 dp, vec3 n) {
    float f = 0.007;
    float radius = length(p);
    vec3 t = orthogonal(n);
    vec3 b = cross(t, n);
    vec3 o1 = normalize(p + t * f) * radius;
    vec3 o2 = normalize(p + b * f) * radius;
    vec3 o3 = normalize(p - t * f) * radius;
    vec3 o4 = normalize(p - b * f) * radius;
    vec3 da = distort(o1);
    vec3 db = distort(o2);
    vec3 dc = distort(o3);
    vec3 dd = distort(o4);
    vec3 nn1 = normalize(cross(da - dp, db - dp));
    vec3 nn2 = normalize(cross(da - dp, dd - dp));
    vec3 nn3 = normalize(cross(dc - dp, dd - dp));
    vec3 nn4 = normalize(cross(db - dp, dc - dp));
    return normalize(nn1 + nn2 + nn3 + nn4);
}

void main() {
    vUv = uv;
    vPosition = position;
    vec3 pos = distort(position);
    vNormal = distortNormal(position, pos, normal);
    vViewPosition = (modelViewMatrix * vec4(pos, 1.0)).xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
