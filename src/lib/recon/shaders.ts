/** Native Three.js replacements for the Blender node graphs that glTF cannot carry.
 *  All colour maths is linear-light; tone mapping + sRGB encode are applied by the renderer chunks at the end of each shader. */
export const VERT = /* glsl */ `
varying vec2 vUv; varying vec3 vNormalW; varying vec3 vPosL; varying vec3 vWorld;
void main(){ vUv = uv; vPosL = position; vNormalW = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;

/** Placeholder look of the planet before any texture has arrived: a dark sphere lit from the sun side with a soft blue limb. Also the colour the textured Earth fades in from (uFade), so nothing pops. */
export const SHELL_GLSL = /* glsl */ `
vec3 shellColor(vec3 n, vec3 v, float ndl){ vec3 c = vec3(0.010, 0.014, 0.024) + vec3(0.060, 0.090, 0.150) * smoothstep(-0.05, 0.65, ndl);
  float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0); return c + vec3(0.30, 0.45, 0.75) * rim * smoothstep(-0.25, 0.55, ndl) * 0.55; }`;

const TAIL = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>`;

/** Earth surface: day texture (+ regional tile), brand-graded, lit by the sun direction, with the Blender "sky fill / Rayleigh haze / twilight" terms. */
export const EARTH_FRAG = /* glsl */ `
${SHELL_GLSL}
uniform float uFade;
uniform sampler2D uDay; uniform sampler2D uRegion; uniform vec3 uSunDir; uniform float uSunI; uniform float uStage; uniform float uRegionMix;
uniform vec4 uRegionBox; // lon0 lon1 lat0 lat1 (radians)
varying vec2 vUv; varying vec3 vNormalW; varying vec3 vPosL; varying vec3 vWorld;
const float PI = 3.14159265359;
float ss(float a, float b, float x){ return smoothstep(a, b, x); }
vec3 grade(vec3 c){ // brand grade: contrast .22, saturation .78, value .96, warm gain (as in the approved Blender v2 look)
  c = clamp((c - 0.5) * 1.22 + 0.5, 0.0, 1.0); float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); c = mix(vec3(l), c, 0.78) * 0.96; return c * vec3(1.0, 0.955, 0.87); }
void main(){
  vec3 n = normalize(vNormalW); vec3 day = texture2D(uDay, vUv).rgb;
  // regional tile: analytic lon/lat from the local position (Y-up globe frame), feathered at the footprint edges
  vec3 p = normalize(vPosL); float lon = atan(-p.z, p.x); float lat = asin(clamp(p.y, -1.0, 1.0));
  vec2 ruv = vec2((lon - uRegionBox.x) / (uRegionBox.y - uRegionBox.x), 1.0 - (lat - uRegionBox.z) / (uRegionBox.w - uRegionBox.z)); // textures are not Y-flipped (glTF/KTX2 convention): v=0 is north
  float inside = ss(0.0, 0.04, ruv.x) * ss(0.0, 0.04, 1.0 - ruv.x) * ss(0.0, 0.04, ruv.y) * ss(0.0, 0.04, 1.0 - ruv.y);
  vec3 reg = texture2D(uRegion, clamp(ruv, 0.0, 1.0)).rgb; day = mix(day, reg, inside * uRegionMix);
  float ndl = dot(n, uSunDir); vec3 col;
  if (uStage < 1.5) { col = day * max(ndl, 0.0) * uSunI; }           // stage A: plain Lambert on the raw texture
  else {
    vec3 g = grade(day); float lit = max(ndl, 0.0);
    col = g * lit * uSunI;                                              // direct sun
    float tw = ss(-0.18, 0.02, ndl) * (1.0 - ss(0.02, 0.28, ndl));    // terminator band
    vec3 twc = mix(vec3(0.30, 0.38, 0.62), vec3(0.672, 0.323, 0.150), ss(-0.12, 0.10, ndl));
    col += g * twc * (tw * 0.06 + ss(-0.10, 0.50, ndl) * 0.22);         // sky fill + twilight
    col += vec3(0.030, 0.044, 0.060) * ss(-0.05, 0.55, ndl);           // Rayleigh haze (day side, desaturated)
    col += g * vec3(0.10, 0.11, 0.14) * (1.0 - 0.5 * ss(0.0, 0.5, ndl)); // daylight: soft fill so the shadow side reads on the light sky
    col += vec3(1.0, 0.80, 0.50) * pow(max(ndl, 0.0), 6.0) * 0.06; // warm sun bloom on the lit side
  }
  col = mix(shellColor(n, normalize(cameraPosition - vWorld), ndl), col, uFade);
  gl_FragColor = vec4(col, 1.0);${TAIL}
}`;

/** Night lights shell: NASA Black Marble tinted Light Gold, only on the unlit hemisphere, alpha = light intensity. */
export const NIGHT_FRAG = /* glsl */ `
uniform sampler2D uNight; uniform vec3 uSunDir; uniform vec3 uTint; uniform float uStrength;
varying vec2 vUv; varying vec3 vNormalW;
float ss(float a, float b, float x){ return smoothstep(a, b, x); }
void main(){
  vec3 n = normalize(vNormalW); float mask = 1.0 - ss(-0.14, 0.06, dot(n, uSunDir)); vec3 t = texture2D(uNight, vUv).rgb;
  float lum = dot(t, vec3(0.2126, 0.7152, 0.0722)); float a = clamp(lum * 8.0, 0.0, 1.0) * mask;
  gl_FragColor = vec4(t * uTint * uStrength, a);${TAIL}
}`;

/** Ocean specular shell: masked by the Natural Earth land mask, Fresnel(1.333) x GGX sun glint (space is black, so only the sun is reflected). */
export const OCEAN_FRAG = /* glsl */ `
uniform sampler2D uMask; uniform vec3 uSunDir; uniform float uRough; uniform float uStrength; uniform float uSunI;
varying vec2 vUv; varying vec3 vNormalW; varying vec3 vWorld;
float ggx(float nh, float a){ float a2 = a * a; float d = nh * nh * (a2 - 1.0) + 1.0; return a2 / (3.14159265 * d * d); }
void main(){
  vec3 n = normalize(vNormalW); vec3 v = normalize(cameraPosition - vWorld); vec3 l = uSunDir; vec3 h = normalize(l + v);
  float land = texture2D(uMask, vUv).r; float ocean = 1.0 - land;
  float nv = max(dot(n, v), 0.0), nl = max(dot(n, l), 0.0), nh = max(dot(n, h), 0.0), vh = max(dot(v, h), 0.0);
  float F = 0.02 + 0.98 * pow(1.0 - vh, 5.0); float a = uRough * uRough;
  float spec = ggx(nh, max(a, 0.002)) * F * nl / max(4.0 * nv * nl + 1e-4, 1e-3);
  spec = min(spec, 6.0) * uStrength * uSunI * ocean;
  gl_FragColor = vec4(vec3(1.0, 0.95, 0.88) * spec, 1.0);${TAIL}
}`;

/** Clouds: baked procedural alpha map on an independent shell, lit by the sun (diffuse), smooth edges come from the baked map. */
export const CLOUD_FRAG = /* glsl */ `
uniform sampler2D uCloud; uniform vec3 uSunDir; uniform vec3 uColor; uniform float uSunI; uniform float uOpacity;
varying vec2 vUv; varying vec3 vNormalW;
void main(){ vec3 n = normalize(vNormalW); float c = texture2D(uCloud, vUv).r * uOpacity; float l = max(dot(n, uSunDir), 0.0);
  gl_FragColor = vec4(uColor * (l * uSunI + 0.015), c * step(0.002, l + 0.02));${TAIL}
}`;

/** Atmosphere: view-angle limb glow, sun aware (blue day limb -> warm terminator band), additive. Replicates the approved Blender node maths. */
export const ATMO_FRAG = /* glsl */ `
uniform vec3 uSunDir; uniform float uStrength; uniform vec3 uBlue; uniform vec3 uWarm; uniform float uPow;
varying vec3 vNormalW; varying vec3 vWorld;
float ss(float a, float b, float x){ return smoothstep(a, b, x); }
void main(){
  vec3 n = normalize(vNormalW); vec3 v = normalize(cameraPosition - vWorld); float facing = 1.0 - abs(dot(n, v));
  float rim = pow(facing, uPow) * (1.0 - smoothstep(0.93, 0.985, facing)); float ndl = dot(n, uSunDir); float lit = ss(-0.30, 0.45, ndl);
  float sunset = ss(-0.25, 0.0, ndl) * (1.0 - ss(0.0, 0.3, ndl)); vec3 c = mix(uBlue, uWarm, sunset * 0.85);
  gl_FragColor = vec4(c * rim * lit * uStrength, 1.0);${TAIL}
}`;

/** Cloud bake: seamless 3D fbm evaluated on the sphere for every texel of an equirect target (run once at load). */
export const CLOUD_BAKE_VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
export const CLOUD_BAKE_FRAG = /* glsl */ `
varying vec2 vUv; uniform float uCover;
float h(vec3 p){ vec3 q = fract(p * 0.1031); q += dot(q, q.zyx + 31.32); return fract((q.x + q.y) * q.z); }
float nz(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y), mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 6; i++) { s += a * nz(p); p *= 2.03; a *= 0.5; } return s; }
void main(){
  float lon = (vUv.x - 0.5) * 6.2831853, lat = (0.5 - vUv.y) * 3.14159265; vec3 n = vec3(cos(lat) * cos(lon), sin(lat), -cos(lat) * sin(lon));
  vec3 q = n * 3.0; q += 0.55 * vec3(fbm(q * 0.7), fbm(q * 0.7 + 3.1), fbm(q * 0.7 + 7.7));
  float big = fbm(q); float fine = fbm(q * 6.0); float d = big * 0.78 + fine * 0.22;
  float c = smoothstep(uCover, uCover + 0.2, d); gl_FragColor = vec4(vec3(c * 0.92), 1.0);
}`;

/** Border: constant on-screen width tube (vertex expands/shrinks the exported bevel along its normal), reveal swept around the Kingdom centroid. */
export const BORDER_VERT = /* glsl */ `
uniform float uPx; uniform float uViewH; uniform float uFov; uniform float uBase; uniform vec3 uCenter; varying float vAng; varying vec3 vNormalW; varying vec3 vWorld;
void main(){
  vec3 nrm = normalize(normal); vec4 w0 = modelMatrix * vec4(position, 1.0); float dist = length(cameraPosition - w0.xyz);
  float worldPerPx = dist * 2.0 * tan(uFov * 0.5) / uViewH; float target = 0.5 * uPx * worldPerPx;
  vec3 pos = position + nrm * (target - uBase); vec4 w = modelMatrix * vec4(pos, 1.0); vWorld = w.xyz; vNormalW = normalize(mat3(modelMatrix) * nrm);
  // angle around the Kingdom centroid in the tangent plane (north-up on the sphere)
  vec3 up = normalize(uCenter); vec3 north = normalize(vec3(0.0, 1.0, 0.0) - up * up.y); vec3 east = normalize(cross(north, up)); vec3 d = normalize(position) - up * dot(normalize(position), up);
  vAng = atan(dot(d, east), dot(d, north)); gl_Position = projectionMatrix * viewMatrix * w; }`;
export const BORDER_FRAG = /* glsl */ `
uniform vec3 uColor; uniform float uReveal; uniform float uAlpha; varying float vAng;
void main(){ float t = (vAng + 3.14159265) / 6.2831853; float a = (1.0 - smoothstep(uReveal - 0.02, uReveal + 0.005, t)) * uAlpha; if (a < 0.003) discard;
  gl_FragColor = vec4(uColor, a);${TAIL}
}`;

export const SHELL_FRAG = /* glsl */ `
${SHELL_GLSL}
uniform vec3 uSunDir; varying vec3 vNormalW; varying vec3 vWorld;
void main(){ vec3 n = normalize(vNormalW); vec3 v = normalize(cameraPosition - vWorld); gl_FragColor = vec4(shellColor(n, v, dot(n, uSunDir)), 1.0);${TAIL}
}`;
