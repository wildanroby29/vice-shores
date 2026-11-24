// Vice Shores — the sky dome, clouds and environment map.
//
// The dome is a shader sphere: three gradient stops (top, mid, bottom)
// plus a sun glow. The bottom stop is always the same colour as the fog
// (see config DAYTIME), so the horizon dissolves instead of drawing a
// hard line — the sea meets the sky through haze and there is never a
// flat band of a different colour at the horizon. Clouds are soft radial
// sprites drifting high above the city.

import { DAYTIME } from '../config.js';

// A soft radial falloff texture: bright centre fading to transparent edge.
function radialTexture(inner, outer) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const SKY_VERT = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
}
`;

// h is the view direction's height: below the horizon it clamps to the
// bottom stop, so the lowest band of sky is exactly the fog colour and
// the sea fades into it. The sun adds a tight hot core, a warm halo and
// a wide soft wash, all in the sun's own colour.
const SKY_FRAG = `
uniform vec3 uTop;
uniform vec3 uMid;
uniform vec3 uBot;
uniform vec3 uSunDir;
uniform vec3 uSunCol;
varying vec3 vDir;
void main() {
  float h = clamp(vDir.y, -0.08, 1.0);
  vec3 col = mix(uBot, uMid, smoothstep(0.0, 0.22, h));
  col = mix(col, uTop, smoothstep(0.18, 0.65, h));
  float s = max(dot(normalize(vDir), normalize(uSunDir)), 0.0);
  col += uSunCol * (pow(s, 120.0) * 2.0 + pow(s, 18.0) * 0.35 + pow(s, 5.0) * 0.05);
  gl_FragColor = vec4(col, 1.0);
}
`;

export function createSky(scene, rng) {
  const uniforms = {
    uTop: { value: new THREE.Color(DAYTIME.golden.top) },
    uMid: { value: new THREE.Color(DAYTIME.golden.mid) },
    uBot: { value: new THREE.Color(DAYTIME.golden.bot) },
    uSunDir: { value: new THREE.Vector3(0, 0.3, -1).normalize() },
    uSunCol: { value: new THREE.Color(DAYTIME.golden.sun) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), mat);
  scene.add(dome);

  // Nine wide, thin cloud sprites, warm-lit, scattered high and far so
  // they read as a golden-hour sky rather than clutter near the city.
  const cloudTex = radialTexture('rgba(255,217,192,0.85)', 'rgba(255,217,192,0)');
  const clouds = [];
  for (let i = 0; i < 9; i++) {
    const ang = rng() * Math.PI * 2;
    const radius = 300 + rng() * 240;
    const height = 95 + rng() * 48;
    const sx = 140 + rng() * 100;
    const sy = 22 + rng() * 8;
    const op = 0.32 + rng() * 0.12;
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: cloudTex, color: 0xffd9c0, opacity: op, depthWrite: false,
    }));
    spr.position.set(Math.cos(ang) * radius, height, Math.sin(ang) * radius);
    spr.scale.set(sx, sy, 1);
    spr.userData.baseOpacity = op;
    scene.add(spr);
    clouds.push(spr);
  }
  // Four more wide, low clouds on the horizon for the title frame: the
  // aerial shot looks across the city, and a bare red sky above the
  // rooftops reads flat — low haze clouds give the horizon depth.
  for (let i = 0; i < 4; i++) {
    const ang = rng() * Math.PI * 2;
    const radius = 450 + rng() * 200;
    const height = 55 + rng() * 20;
    const op = 0.25 + rng() * 0.1;
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: cloudTex, color: 0xffd9c0, opacity: op, depthWrite: false,
    }));
    spr.position.set(Math.cos(ang) * radius, height, Math.sin(ang) * radius);
    spr.scale.set(180 + rng() * 80, 18 + rng() * 6, 1);
    spr.userData.baseOpacity = op;
    scene.add(spr);
    clouds.push(spr);
  }

  let envMap = null;

  // Bake the sky into an environment map so car paint, glass and chrome
  // pick up the golden-hour light instead of looking flat.
  function buildEnvironment(renderer) {
    const envScene = new THREE.Scene();
    const envDome = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), mat);
    envScene.add(envDome);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const target = pmrem.fromScene(envScene, 0.04);
    if (envMap) envMap.dispose();
    envMap = target.texture;
    scene.environment = envMap;
    pmrem.dispose();
  }

  // Switch the whole sky to a preset: gradient stops, sun colour and
  // direction, and fog. Fog starts closer at night and reaches further in
  // the day; its colour is the preset's fog, which always matches the
  // sky's bottom stop, so the horizon stays smooth.
  function applyTime(preset, sunDir, isNight) {
    uniforms.uTop.value.setHex(preset.top);
    uniforms.uMid.value.setHex(preset.mid);
    uniforms.uBot.value.setHex(preset.bot);
    uniforms.uSunCol.value.setHex(preset.sun);
    uniforms.uSunDir.value.copy(sunDir).normalize();
    scene.fog = new THREE.Fog(preset.fog, isNight ? 60 : 90, isNight ? 420 : 620);
    for (const cl of clouds) {
      cl.material.opacity = cl.userData.baseOpacity * (isNight ? 0.375 : 1);
    }
  }

  return { dome, clouds, applyTime, buildEnvironment };
}
