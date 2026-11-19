uniform float uOpacity;
uniform float uBandLow;
uniform vec3 uColor;

varying float vBand;

void main() {
  float alpha = uOpacity * mix(uBandLow, 1.0, vBand);
  gl_FragColor = vec4(uColor, alpha);
}
