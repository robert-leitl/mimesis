varying vec2 vUv;
varying vec3 vModelSurfacePosition;
varying vec3 vWorldSurfacePosition;
varying vec3 vViewSurfacePosition;
varying vec3 vModelNormal;
varying vec3 vViewNormal;
//varying vec3 vViewLightPosition;
varying vec3 vViewLightDirection;
varying vec3 vModelTangent;
varying vec3 vViewTangent;

attribute vec3 tangent;

uniform samplerCube uCubeMap;
uniform float uDisplacement;

// creates a vector which is orthogonal to the given vector
vec3 orthogonal(vec3 v) {
    return normalize(abs(v.x) > abs(v.z) ? 
    vec3(-v.y, v.x, 0.0) : 
    vec3(0.0, -v.z, v.y));
}

// distorts the give position vector according to the cubemap texel
vec3 distort(vec3 pos) {
    vec3 distortedPos = vec3(pos);
    float displacement = 1. - texture(uCubeMap, pos).r;
    displacement = smoothstep(0.4, .85, displacement);
    distortedPos += normalize(pos) * displacement * uDisplacement;
    return distortedPos;
}

// distorts the normal according to the position distortion
vec3 distortNormal(vec3 pos, vec3 distortedPos, vec3 normal) {
    // the offset to the vertex position
    float f = 0.007;
    float radius = length(pos);
    // find the tangents to the normal
    vec3 t1 = orthogonal(normal);
    vec3 t2 = cross(t1, normal);
    // create the offset points along the tangents
    // set the length to the radius of the sphere
    vec3 q = normalize(pos + t1 * f) * radius;
    vec3 r = normalize(pos + t2 * f) * radius;
    vec3 dq = distort(q);
    vec3 dr = distort(r);
    return normalize(cross(dr - distortedPos, dq - distortedPos));
}

void main() {
    vUv = uv;
    vModelSurfacePosition = position;
    vec3 pos = distort(position);
    vWorldSurfacePosition = (modelMatrix * vec4(position, 1.)).xyz;
    vViewSurfacePosition = (viewMatrix * vec4(vWorldSurfacePosition, 1.)).xyz;
    vModelNormal = distortNormal(position, pos, normal);
    vModelTangent = tangent;
    vViewNormal = normalize(normalMatrix * vModelNormal);
    vViewTangent = normalize(normalMatrix * vModelTangent);

    vec3 worldLightPosition = vec3(1., 1., 1.);
    vec3 worldLightDirection = vec3(0.) - worldLightPosition;
    //vViewLightPosition = (modelViewMatrix * vec4(worldLightPosition, 1.)).xyz;
    //vViewLightDirection = normalize(modelViewMatrix * vec4(worldLightDirection, 0.)).xyz;
    // fake light direction to move with camera
    vViewLightDirection = normalize(worldLightDirection);


    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
