varying vec2 vUv;
varying vec3 vModelPosition;
varying vec3 vWorldPosition;
varying vec3 vModelNormal;
varying vec3 vViewNormal;
varying vec3 vWorldSurfacePosition;
varying vec3 vViewSurfacePosition;
varying vec3 vViewLightPosition;
varying vec3 vViewLightDirection;
varying vec3 vModelTangent;
varying vec3 vViewTangent;

uniform vec2 uResolution;
uniform float uTime;
uniform samplerCube uCubeMap;
uniform sampler2D uNormalTexture;
uniform sampler2D uMatcapTexture;
uniform sampler2D uEnvTexture;

#define RECIPROCAL_PI2 0.15915494
#define saturate(a) clamp( a, 0.0, 1.0 );

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
  float skinPattern = texture(uCubeMap, vModelPosition).r;
  skinPattern = 1. - smoothstep(0.4, 0.43, skinPattern);

  // matcap texture
  vec2 muv = N.xy * 0.5 + .5;
  vec3 matcapColor = texture2D(uMatcapTexture, vec2(muv.x, muv.y)).rgb;
  float fresnel = 1. - lambertDiffuse(V, N);
  matcapColor *= fresnel * .9 + 0.3;
  //matcapColor *= skinPattern + 0.3;

  // normal map
  vec3 T = normalize(vViewTangent);
  vec3 B = normalize(cross(N, T));
  mat3 tangentSpace = mat3(T, B, N);
  vec3 normalMap = texture(uNormalTexture, fract(vec2(.7, .4) * vUv)).rgb * 2. - 1.;
  float normalMapStrength = 0.5;
  N = normalize(mix(N, tangentSpace * normalMap, normalMapStrength));

  // surface settings
  //vec3 surfaceColor = vec3(0.1137, 0.3961, 1.0);
  //vec3 wrapColor = vec3(0.7059, 0.8, 1.0);
  //vec3 surfaceColor = vec3(0.5333, 0.9137, 0.6784);
  //vec3 wrapColor = vec3(0.0196, 1.0, 1.0);
  vec3 surfaceColor = mix(vec3(1.0, 0.7882, 0.2039), vec3(0.5961, 1.0, 0.0667), normalize(vWorldPosition).y);
  vec3 wrapColor = vec3(0.9216, 0.0078, 0.1294);
  //vec3 surfaceColor = vec3(0.0392, 0.9882, 0.3255);
  //vec3 wrapColor = vec3(0.6627, 1.0, 0.1216);
  vec3 lightColor = vec3(1., 1., 1.);
  vec3 ambientColor =  vec3(0.0392, 0.0392, 0.0392);
  float wrap = 0.2;
  float shininess = 0.3;
  

  float diffuse = lambertDiffuseWrap(L, N, wrap);
  vec3 mixedSurfaceColor = mix(wrapColor, surfaceColor, smoothstep(0., min(1., wrap * 2.), diffuse));
  mixedSurfaceColor *= skinPattern;
  //mixedSurfaceColor *= mixedSurfaceColor;
  vec3 diffuseColor = diffuse * lightColor * mixedSurfaceColor;
  vec3 specularColor = blinnPhongSpecular(L, V, N, shininess) * lightColor * diffuse;

  vec3 color = vec3(0.);
  color += ambientColor;
  color += diffuseColor;
  color += specularColor;
  color += matcapColor;

  color = color;

  gl_FragColor = vec4(color, 1.);
}