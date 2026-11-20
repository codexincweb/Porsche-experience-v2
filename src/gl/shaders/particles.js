// GPU particle simulation. Velocity and position live in float textures that
// are updated by GPUComputationRenderer; nothing is computed per particle on
// the CPU. The target texture holds points sampled from the real model.

const noise = /* glsl */ `
float hash11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
vec3 hash31(float p) {
  vec3 p3 = fract(vec3(p) * vec3(.1031, .1030, .0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xxy + p3.yzz) * p3.zyx);
}
// Cheap divergence-free-looking swirl from layered sines.
vec3 swirl(vec3 p, float t) {
  return vec3(
    sin(p.y * 1.7 + t) + sin(p.z * 2.3 - t * 0.7),
    sin(p.z * 1.9 + t * 0.8) + sin(p.x * 2.1 + t),
    sin(p.x * 1.6 - t * 0.9) + sin(p.y * 2.4 + t * 0.6)
  ) * 0.5;
}
`;

export const velocityShader = /* glsl */ `
uniform sampler2D uTarget;
uniform float uMix;
uniform float uTime;
uniform float uDt;
uniform float uRepel;
uniform float uImpulse;
uniform float uMotion;
uniform vec3 uPointer;
uniform vec3 uCentre;
uniform vec2 uHalf;
${noise}

// Free-flight cloud spread across the whole screen.
vec3 home(float seed, float t) {
  float a = seed * 6.2831853 * 7.0 + t * 0.05 * uMotion;
  float x = (hash11(seed * 13.7) * 2.0 - 1.0) * uHalf.x * 1.05;
  float y = (hash11(seed * 91.3) * 2.0 - 1.0) * uHalf.y;
  return vec3(x + cos(a) * 0.3, y + sin(a * 1.3) * 0.3, (hash11(seed * 7.7) - 0.5) * 0.8);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 p = texture2D(texturePosition, uv);
  vec4 v = texture2D(textureVelocity, uv);
  float seed = p.w;
  vec3 target = texture2D(uTarget, uv).xyz;

  vec3 goal = mix(home(seed, uTime), target, uMix);
  float k = mix(0.9, 5.0 + 5.0 * seed, uMix);
  v.xyz += (goal - p.xyz) * k * uDt;

  vec3 sw = swirl(p.xyz * 0.55, uTime * 0.35);
  v.xyz += sw * (mix(0.9, 0.05, uMix) * uMotion) * uDt;

  // Pointer repulsion, falling off smoothly with distance.
  vec3 d = p.xyz - uPointer;
  float dist = length(d);
  float push = uRepel * smoothstep(0.7, 0.0, dist);
  v.xyz += normalize(d + vec3(1e-4)) * push * 22.0 * uDt;

  // Disintegration impulse: outward burst with per-particle variation.
  vec3 away = normalize(p.xyz - uCentre + (hash31(seed * 57.0) - 0.5) * 1.6);
  v.xyz += away * uImpulse * (3.0 + 9.0 * hash11(seed * 5.0)) * uDt * 60.0 * 0.04;

  v.xyz *= exp(-mix(1.3, 3.4, uMix) * uDt);
  gl_FragColor = v;
}
`;

export const positionShader = /* glsl */ `
uniform float uDt;
void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 p = texture2D(texturePosition, uv);
  vec4 v = texture2D(textureVelocity, uv);
  p.xyz += v.xyz * uDt;
  gl_FragColor = p;
}
`;

export const renderVertex = /* glsl */ `
attribute vec2 aRef;
attribute float aSeed;
uniform sampler2D uPos;
uniform sampler2D uVel;
uniform float uSize;
uniform float uPixelRatio;
uniform float uDensity;
uniform float uFade;
varying float vSpeed;
varying float vAlpha;
varying vec3 vColour;
uniform sampler2D uColour;
void main() {
  vColour = texture2D(uColour, aRef).rgb;
  vec4 pos = texture2D(uPos, aRef);
  vec3 vel = texture2D(uVel, aRef).xyz;
  vSpeed = length(vel);
  vec4 mv = modelViewMatrix * vec4(pos.xyz, 1.0);
  float keep = step(aSeed, uDensity);
  vAlpha = keep * uFade * (0.55 + 0.45 * aSeed);
  gl_PointSize = keep * uSize * uPixelRatio * (1.0 + vSpeed * 0.25) * (6.0 / max(0.5, -mv.z));
  gl_Position = projectionMatrix * mv;
}
`;

export const renderFragment = /* glsl */ `
varying float vSpeed;
varying float vAlpha;
varying vec3 vColour;
uniform vec3 uAccent;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float soft = smoothstep(0.5, 0.05, d);
  vec3 col = mix(vColour, uAccent, smoothstep(1.2, 4.5, vSpeed) * 0.45);
  gl_FragColor = vec4(col, soft * vAlpha);
}
`;
