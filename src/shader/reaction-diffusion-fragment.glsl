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

#define PI 3.14159265359
#define PI_2 6.2831853072
#define PI_05 1.5707963268
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535

// converts [phi,cos theta] into [x,y,z] for unit sphere
vec3 s2c(vec2 s) {
    float sinTheta = sqrt(1.0 - s.y * s.y);
    return vec3(cos(s.x) * sinTheta,
                sin(s.x) * sinTheta,
                s.y);
}

// converts [x,y,z] into [phi, cos theta] for unit sphere
vec2 c2s(vec3 c) {
    return vec2(atan(c.y, c.x),
                c.z);
}

vec2 c2uv(vec3 c) {
    vec2 uv = c2s(c);
    uv.y = acos(uv.y);
    uv *= vec2(RECIPROCAL_PI2, RECIPROCAL_PI);
    return uv;
}

vec4 laplacian(vec2 pos, vec3 dir, vec2 pol) {
    vec4 result = vec4(0., 0., 0., 1.);

    vec3 kernel[3] = vec3[](
        vec3(.05, .2, .05),
        vec3(.2, -1., .2),
        vec3(.05, .2, .05)
    );

    /*float a = 0.01;
    pol.y = acos(pol.y);
    vec2 pp = vec2(RECIPROCAL_PI2, .5);
    vec2 p1 = ((vec2(pol.x - a, cos(pol.y - a) + 1.))) * pp;
    vec2 p2 = ((vec2(pol.x    , cos(pol.y - a) + 1.))) * pp;
    vec2 p3 = ((vec2(pol.x + a, cos(pol.y - a) + 1.))) * pp;
    vec2 p4 = ((vec2(pol.x - a, cos(pol.y    ) + 1.))) * pp;
    vec2 p5 = ((vec2(pol.x + a, cos(pol.y    ) + 1.))) * pp;
    vec2 p6 = ((vec2(pol.x - a, cos(pol.y + a) + 1.))) * pp;
    vec2 p7 = ((vec2(pol.x    , cos(pol.y + a) + 1.))) * pp;
    vec2 p8 = ((vec2(pol.x + a, cos(pol.y + a) + 1.))) * pp;


    result += texture2D(uTexture, p1) * kernel[0][0];
    result += texture2D(uTexture, p2) * kernel[0][1];
    result += texture2D(uTexture, p3) * kernel[0][2];
    result += texture2D(uTexture, p4) * kernel[1][0];

    result += texture2D(uTexture, p5) * kernel[1][2];
    result += texture2D(uTexture, p6) * kernel[2][0];
    result += texture2D(uTexture, p7) * kernel[2][1];
    result += texture2D(uTexture, p8) * kernel[2][2];*/

    
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

vec4 react(vec2 pos, vec3 dir, vec2 pol) {
    vec4 result = texture2D(uTexture, pos);
    vec4 convolution = laplacian(pos, dir, pol);

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

vec4 drawNoiseSeed(vec4 pixel, vec3 dir) {
    vec4 result = vec4(pixel);

    float t = uTime * 0.05;
    vec3 c = dir;
    vec3 noisePos = vec3(
        (cos(t * 0.5) * .3 + 1.) * c.x, 
        (sin(t * 0.7) * .3 + 1.) * c.y,
        (sin(t * 0.7) * .3 + 1.) * c.z
        );
    noisePos.x += noise((sin(c + t * 1.2) * .5 + 1.) * 0.6);
    noisePos.y += noise((cos(c + t * 0.5) * .5 + 1.) * 0.6);
    noisePos.z += noise((cos(c + t * 2.5) * .5 + 1.) * 0.6);
    float n = noise(noisePos * 5. + 4.);

    result.b += 1. - smoothstep(0.0, 0.04, n);
    return result;
}

void main() {
    vec2 st = gl_FragCoord.xy / uResolution.xy;
    vec2 pol = vec2(st.x * PI_2, st.y * PI);
    vec3 dir = vec3(sin(pol.y) * sin(pol.x), cos(pol.y), sin(pol.y) * cos(pol.x));

    vec4 pixel = react(st, dir, pol);
    pixel = clamp(pixel, 0.0, 1.0);
    //pixel = drawSeed(pixel, (uPointer.xy + 1.) / 2., st);
    pixel = drawNoiseSeed(pixel, st);

    gl_FragColor = pixel;
}

