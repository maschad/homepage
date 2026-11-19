uniform float uTime;
uniform float uActive;
uniform vec3 uColor;

varying vec2 vUv;

float hash(float n) {
  return fract(sin(n) * 43758.5453);
}

void main() {
  float d = length(vUv - 0.5) * 2.0; // 0 at center, 1 at the plane's edge
  float r = d * 3.0;                 // ring space: the eye fills the inner third

  float core  = 1.0 - smoothstep(0.10, 0.15, r);
  float ring1 = smoothstep(0.26, 0.30, r) - smoothstep(0.34, 0.38, r);
  float ring2 = smoothstep(0.52, 0.56, r) - smoothstep(0.60, 0.64, r);

  // Flashing: a steady heartbeat plus a faint electrical flicker
  float beat = pow(0.5 + 0.5 * sin(uTime * 3.2), 2.0);
  float flicker = 0.85 + 0.15 * hash(floor(uTime * 18.0));
  float flash = mix(0.3, 1.0, beat) * flicker;

  // Hazy red bloom around the eye, brighter while the cursor is moving
  float haze = exp(-d * d * 6.0) * (0.35 + 0.45 * uActive) * flash;

  float rings = max(core, max(ring1, ring2 * 0.85)) * mix(0.7, 1.0, flash);
  float alpha = clamp(max(rings, haze), 0.0, 1.0);
  vec3 color = uColor * (1.0 + 0.5 * core * flash);

  gl_FragColor = vec4(color, alpha);
}
