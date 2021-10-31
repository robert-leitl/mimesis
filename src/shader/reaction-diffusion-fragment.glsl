#pragma glslify: noise = require('./noise.glsl')

varying vec2 vTexelSize;

uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uTime;
uniform sampler2D uTexture;
uniform float uDiffusionA;
uniform float uDiffusionB;
uniform float uFeedRate;
uniform float uKillRate;

vec4 laplacian(vec2 pos) {
    vec4 result = vec4(0., 0., 0., 1.);

    vec3 kernel[3] = vec3[](
        vec3(.05, .2, .05),
        vec3(.2, -1., .2),
        vec3(.05, .2, .05)
    );

    result += texture2D(uTexture, vec2(pos.x - vTexelSize.x, pos.y - vTexelSize.y)) * kernel[0][0];
    result += texture2D(uTexture, vec2(pos.x, pos.y - vTexelSize.y)) * kernel[0][1];
    result += texture2D(uTexture, vec2(pos.x + vTexelSize.x, pos.y - vTexelSize.y)) * kernel[0][2];
    result += texture2D(uTexture, vec2(pos.x - vTexelSize.x, pos.y)) * kernel[1][0];

    result += texture2D(uTexture, vec2(pos.x + vTexelSize.x, pos.y)) * kernel[1][2];
    result += texture2D(uTexture, vec2(pos.x - vTexelSize.x, pos.y + vTexelSize.y)) * kernel[2][0];
    result += texture2D(uTexture, vec2(pos.x, pos.y + vTexelSize.y)) * kernel[2][1];
    result += texture2D(uTexture, vec2(pos.x + vTexelSize.x, pos.y + vTexelSize.y)) * kernel[2][2];

    result += texture2D(uTexture, pos) * kernel[1][1];

    return result;
}

vec4 react(vec2 pos) {
    vec4 result = texture2D(uTexture, pos);
    vec4 convolution = laplacian(pos);

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

vec4 drawSeed(vec4 pixel, vec2 seedPosition, vec2 pos) {
    vec4 result = vec4(pixel);
    float dist = distance(seedPosition, pos);

    result.b += 1. - smoothstep(0.005 - .0001, 0.005, dist);

    return result;
}

vec4 drawNoiseSeed(vec4 pixel, vec2 pos) {
    vec4 result = vec4(pixel);

    float t = uTime * 0.05;
    vec2 c = (pos - 0.5) * 2.;
    vec2 noisePos = vec2((cos(t * 0.5) * .3 + 1.) * c.x, (sin(t * 0.7) * .3 + 1.) * c.y);
    noisePos.x += noise((sin(c + t * 1.2) * .5 + 1.) * 0.6);
    noisePos.y += noise((cos(c + t * 0.5) * .5 + 1.) * 0.6);
    float n = noise(noisePos * 5. + 4.);

    result.b += 1. - smoothstep(0.0, 0.04, n);
    return result;
}

void main() {
    vec2 st = gl_FragCoord.xy / uResolution.xy;

    vec4 pixel = react(st);
    pixel = clamp(pixel, 0.0, 1.0);
    //pixel = drawSeed(pixel, (uPointer.xy + 1.) / 2., st);
    pixel = drawNoiseSeed(pixel, st);
    
    gl_FragColor = pixel;
}

