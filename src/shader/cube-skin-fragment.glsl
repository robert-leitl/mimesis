#pragma glslify: hsv2rgb = require('glsl-hsv2rgb')

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

uniform vec2 uResolution;
uniform float uTime;
uniform samplerCube uCubeMap;
uniform sampler2D uNormalTexture;
uniform sampler2D uMatcapTexture;
uniform sampler2D uEnvTexture;
uniform vec3 uSurfaceColorA;
uniform vec3 uSurfaceColorB;
uniform vec3 uWrapColor;
uniform float uColorBalance;

#define RECIPROCAL_PI2 0.15915494
#define saturate(a) clamp( a, 0.0, 1.0 );

vec3 calmSurfaceColorA = vec3(0.2, 0.871, 1.);
vec3 calmSurfaceColorB = vec3(0., 0.565, 0.89);
vec3 calmWrapColor = vec3(0.282, 0.204, 0.788);

vec3 upsetSurfaceColorA = vec3(1., 0.886, 0.231);
vec3 upsetSurfaceColorB = vec3(1., 0.329, 0.008);
vec3 upsetWrapColor = vec3(1., 0., 0.);

vec3 calmSurfaceColorAHsv = vec3(190., 90., 100.) / vec3(360., 100., 100.);
vec3 calmSurfaceColorBHsv = vec3(202., 100., 98.) / vec3(360., 100., 100.);
vec3 calmWrapColorHsv = vec3(248., 74., 78.) / vec3(360., 100., 100.);

vec3 upsetSurfaceColorAHsv = vec3(51., 77., 100.) / vec3(360., 100., 100.);
vec3 upsetSurfaceColorBHsv = vec3(19., 99., 100.) / vec3(360., 100., 100.);
vec3 upsetWrapColorHsv = vec3(0., 100., 100.) / vec3(360., 100., 100.);

/*vec3 upsetSurfaceColorAHsv = vec3(181., 20., 100.) / vec3(360., 100., 100.);
vec3 upsetSurfaceColorBHsv = vec3(183., 78., 100.) / vec3(360., 100., 100.);
vec3 upsetWrapColorHsv = vec3(219., 100., 80.) / vec3(360., 100., 100.);*/

float lambertDiffuse(
  vec3 lightDirection,
  vec3 surfaceNormal
) {
  return max(0.0, dot(lightDirection, surfaceNormal));
}

float lambertDiffuseWrap(
  vec3 lightDirection,
  vec3 surfaceNormal,
  float wrap
) {
  return max(0.0, (dot(lightDirection, surfaceNormal) + wrap) / (1. + wrap));
}

float blinnPhongSpecular(
  vec3 lightDirection,
  vec3 viewDirection,
  vec3 surfaceNormal,
  float shininess
) {
  float specExpo = exp2(shininess * 11.) + 2.;
  //Calculate Blinn-Phong power
  vec3 H = normalize(viewDirection + lightDirection);
  return pow(max(0.0, dot(surfaceNormal, H)), specExpo) * shininess;
}

void main() {
  // renormalize
  vec3 modelNormal = normalize(vModelNormal);
  vec3 N = normalize(vViewNormal);

    // light direction
  vec3 L = normalize(-vViewLightDirection);

  // direction from surface to camera
  vec3 worldEyeDirection = normalize(cameraPosition - vWorldSurfacePosition);
  vec3 V = normalize((viewMatrix * vec4(worldEyeDirection, 0.)).xyz);

  // texture color
  float skinTexture = texture(uCubeMap, normalize(vModelSurfacePosition)).r;
  float skinPattern = 1. - smoothstep(0.4, 0.49, skinTexture);

  // matcap texture
  vec2 muv = N.xy * 0.5 + .5;
  vec3 matcapColor = texture2D(uMatcapTexture, vec2(muv.x, muv.y)).rgb;
  float fresnel = 1. - lambertDiffuse(V, N);
  matcapColor *= fresnel * .9 + 0.2;
  matcapColor *= 0.6 + skinPattern;

  // normal map
  vec3 T = normalize(vViewTangent);
  vec3 B = normalize(cross(N, T));
  mat3 tangentSpace = mat3(T, B, N);
  vec4 normalColor = texture(uNormalTexture, fract(vec2(2., 1.) * vUv));
  vec3 normalMap = normalColor.rgb * 2. - 1.;
  float normalMapStrength = .2 + 0.7 * (1. - skinPattern);
  N = normalize(mix(N, tangentSpace * normalMap, normalMapStrength));

  // colors
  vec3 surfaceColorA = mix(calmSurfaceColorAHsv, upsetSurfaceColorAHsv, uColorBalance);
  vec3 surfaceColorB = mix(calmSurfaceColorBHsv, upsetSurfaceColorBHsv, uColorBalance);
  vec3 wrapColor = mix(calmWrapColorHsv, upsetWrapColorHsv, uColorBalance);
  surfaceColorA = hsv2rgb(surfaceColorA);
  surfaceColorB = hsv2rgb(surfaceColorB);
  wrapColor = hsv2rgb(wrapColor);
  vec3 surfaceColor = mix(surfaceColorB, surfaceColorA, normalize(vModelSurfacePosition).y);
  vec3 lightColor = vec3(1., 1., 1.);
  vec3 ambientColor =  vec3(0.0, 0.0, 0.0);
  float wrap = 0.3;
  float shininess = 0.2;
  

  float diffuse = lambertDiffuseWrap(L, N, wrap);
  vec3 mixedSurfaceColor = mix(wrapColor, surfaceColor, smoothstep(0., min(1., wrap * 2.), diffuse));
  mixedSurfaceColor *= skinPattern;
  vec3 diffuseColor = diffuse * lightColor * mixedSurfaceColor;
  vec3 specularColor = blinnPhongSpecular(L, V, N, shininess) * lightColor * diffuse;

  vec3 color = vec3(0.);
  color += ambientColor;
  color += diffuseColor;
  color += specularColor;
  color += matcapColor;

  color += mix(1., 0., smoothstep(0., min(1., wrap * 2.5), diffuse)) * 0.6 * diffuse * (1. - skinPattern);

  color = color;

  gl_FragColor = vec4(color, 1.);
}