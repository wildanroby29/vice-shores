// render/sky.js — sky dome shader (horizon orange -> pink -> deep blue, sun disc
// with glow, soft cloud sprites), fog matched to the horizon, and a PMREM
// environment map built from the sky so paint and glass reflect it.
export function createSky(scn) {
  const domeGeo = new THREE.SphereGeometry(900, 32, 16);
  const domeMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(0x2e4a8f) },
      mid: { value: new THREE.Color(0xe87a4a) },
      bot: { value: new THREE.Color(0xffb36b) },
      sunDir: { value: new THREE.Vector3(0.6, 0.25, 0.4).normalize() },
      sunCol: { value: new THREE.Color(0xffd9a0) },
    },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: [
      'varying vec3 vDir; uniform vec3 top; uniform vec3 mid; uniform vec3 bot;',
      'uniform vec3 sunDir; uniform vec3 sunCol;',
      'void main(){',
      '  float h = clamp(vDir.y, -0.08, 1.0);',
      '  vec3 col = mix(bot, mid, smoothstep(0.0, 0.22, h));',
      '  col = mix(col, top, smoothstep(0.18, 0.65, h));',
      '  float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0);',
      '  col += sunCol * (pow(s, 120.0) * 2.5 + pow(s, 18.0) * 0.7 + pow(s, 5.0) * 0.18);',
      '  gl_FragColor = vec4(col, 1.0);',
      '}',
    ].join('\n'),
  });
  const dome = new THREE.Mesh(domeGeo, domeMat);
  scn.add(dome);

  // A few soft cloud sprites drifting high up (radial-gradient texture so they are soft blobs, not squares).
  const clouds = [];
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 128;
  const g2 = cv.getContext('2d');
  const grad = g2.createRadialGradient(128, 64, 8, 128, 64, 120);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g2.fillStyle = grad;
  g2.fillRect(0, 0, 256, 128);
  const tex = new THREE.CanvasTexture(cv);
  const mat = new THREE.SpriteMaterial({ color: 0xffd9c0, map: tex, transparent: true, opacity: 0.32, depthWrite: false });
  for (let i = 0; i < 9; i += 1) {
    const spr = new THREE.Sprite(mat.clone());
    spr.material.opacity = 0.32 + ((i * 37) % 10) / 50;
    const ang = (i / 9) * Math.PI * 2;
    spr.position.set(Math.cos(ang) * (300 + (i % 3) * 120), 95 + (i % 4) * 16, Math.sin(ang) * (300 + (i % 3) * 100));
    spr.scale.set(140 + (i % 3) * 50, 22 + (i % 2) * 8, 1);
    scn.add(spr);
    clouds.push(spr);
  }

  const haze = new THREE.Fog(0xf2a35e, 90, 620);
  scn.fog = haze;

  let pm = null;
  function applyTime(when, sunDir) {
    domeMat.uniforms.top.value.setHex(when.skyTop);
    domeMat.uniforms.mid.value.setHex(when.skyMid);
    domeMat.uniforms.bot.value.setHex(when.skyBot);
    domeMat.uniforms.sunDir.value.copy(sunDir).normalize();
    domeMat.uniforms.sunCol.value.setHex(when.sun);
    haze.color.setHex(when.fog);
    haze.near = when.hour >= 20 ? 60 : 90;
    haze.far = when.hour >= 20 ? 420 : 620;
    for (const c of clouds) c.material.opacity = when.hour >= 20 ? 0.12 : 0.3;
  }

  // Build the environment map from the sky itself (needs a renderer, once per time).
  function buildEnvironment(rdr) {
    if (!pm) pm = new THREE.PMREMGenerator(rdr);
    const env = new THREE.Scene();
    const copy = new THREE.Mesh(domeGeo, domeMat);
    env.add(copy);
    const tex = pm.fromScene(env, 0.04).texture;
    scn.environment = tex;
  }

  return { dome, clouds, applyTime, buildEnvironment };
}
