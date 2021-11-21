varying float vAlpha;

uniform sampler2D uTexture;

void main() {
    vec2 uv = vec2(gl_PointCoord.x, 1. - gl_PointCoord.y);
    vec2 st = uv * 2. - 1.;

    float abberation = 0.06 * vAlpha;
    vec4 color = vec4(1.);
    color.r = texture(uTexture, uv - abberation).r;
    color.ga = texture(uTexture, uv).ga;
    color.b = texture(uTexture, uv + abberation).b;
    color.b *= 0.95;

    float alpha = vAlpha * .2;
    color.a *= alpha;

    gl_FragColor = color;
}
