#pragma glslify: noise = require('./noise.glsl')

varying vec2 vTexelSize;
varying vec3 vNormal;
varying vec3 vTangent;
varying vec3 vBitangent;

uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uTime;
uniform samplerCube uCubeMap;
uniform float uDiffusionA;
uniform float uDiffusionB;
uniform float uFeedRate;
uniform float uKillRate;
uniform float uFlowSpeed;

vec4 laplacian(vec3 dir) {
    vec4 result = vec4(0., 0., 0., 1.);

    vec3 kernel[3] = vec3[](
        vec3(.05, .2, .05),
        vec3(.2, -1., .2),
        vec3(.05, .2, .05)
    );

    float offset = 0.02;

    // calculate the directions around the normal
    // to apply the filter kernel to
    vec3 n = dir;
    vec3 t = normalize(vTangent) * offset;
    vec3 b = normalize(vBitangent) * offset;
    vec3 d1 = n - t - b;
    vec3 d2 = n - b;
    vec3 d3 = n + t - b;
    vec3 d4 = n - t;
    vec3 d5 = n + t;
    vec3 d6 = n + t + b;
    vec3 d7 = n + b;
    vec3 d8 = n - t + b;

    result += texture(uCubeMap, d1) * kernel[0][0];
    result += texture(uCubeMap, d2) * kernel[0][1];
    result += texture(uCubeMap, d3) * kernel[0][2];
    result += texture(uCubeMap, d4) * kernel[1][0];

    result += texture(uCubeMap, d5) * kernel[1][2];
    result += texture(uCubeMap, d6) * kernel[2][0];
    result += texture(uCubeMap, d7) * kernel[2][1];
    result += texture(uCubeMap, d8) * kernel[2][2];

    result += texture(uCubeMap, n) * kernel[1][1];

    return result;
}

// reaction diffusion within the cube map for the given direction
vec4 react(vec3 dir) {
    vec4 result = texture(uCubeMap, dir);
    vec4 convolution = laplacian(dir);

    float a = result[0];
    float b = result[2];

    float diffusionA = uDiffusionA;
    float diffusionB = uDiffusionB;
    float killRate = uKillRate;
    float feedRate = uFeedRate;

    float da = diffusionA * convolution[0];
    float db = diffusionB * convolution[2];
    float feed = feedRate * (1. - a);
    float kill = (killRate + feedRate) * b;
    float reaction = a * (b * b);

    result[0] = a + (da - reaction + feed);
    result[2] = b + (db + reaction - kill);

    return result;
}

// draws small animated noise seeds
vec4 drawNoiseSeed(vec4 pixel, vec3 dir) {
    vec4 result = vec4(pixel);

    float t = uTime * 0.05;
    float a = 0.8;
    vec3 c = dir;
    vec3 noisePos = vec3(
        (cos(t * 0.5) * a + 1.) * c.x, 
        (sin(t * 0.7) * a + 1.) * c.y,
        (sin(t * 0.7) * a + 1.) * c.z
        );
    noisePos.x += noise((sin(c + t * 1.2) * .5 + 1.) * 0.6);
    noisePos.y += noise((cos(c + t * 0.5) * .5 + 1.) * 0.6);
    noisePos.z += noise((cos(c + t * 2.5) * .5 + 1.) * 0.6);
    float n = noise(noisePos * 5. + 4.);

    result.b += 1. - smoothstep(0.0, 0.03, n);
    return result;
}

void main() {
    vec2 st = gl_FragCoord.xy / uResolution.xy;
    vec3 normal = normalize(vNormal);
    normal.y -= uFlowSpeed;

    vec4 color = react(normal);
    color = clamp(color, 0.0, 1.0);
    color = drawNoiseSeed(color, normal);

    gl_FragColor = color;
}

