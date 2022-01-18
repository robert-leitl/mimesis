varying vec2 vUv;
varying float vLineDistance;

uniform float uDashOffset;

void main() {
  if ( mod( vLineDistance + uDashOffset, 0.5 ) > 0.015 ) {
    discard;
  }

  vec3 color = vec3(1.);
  gl_FragColor = vec4(color, .07);
}