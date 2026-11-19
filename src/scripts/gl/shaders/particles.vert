uniform sampler2D positions;
uniform float uPointSize;
uniform float uTime;
uniform float uBandFreq;
uniform float uBandSpeed;

varying float vBand;

void main() {
  vec3 pos = texture2D(positions, position.xy).xyz;

  // Painted bands: soft horizontal stripes that drift slowly upward
  float s = 0.5 + 0.5 * sin(6.2831853 * (pos.y * uBandFreq - uTime * uBandSpeed));
  vBand = smoothstep(0.35, 0.65, s);

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = uPointSize;
}
