// render/sky.js — sky dome shader (horizon orange -> pink -> deep blue, sun disc
// with glow, soft cloud sprites), fog matched to the horizon, and a PMREM
// environment map built from the sky so paint and glass reflect it.
export function createSky(scene) {
  const skyGeo = new THREE.SphereGeometry(900, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
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
  const dome = new THREE.Mesh(skyGeo, skyMat);
  scene.add(dome);

  // A few soft cloud sprites drifting high up (radial-gradient texture so they are soft blobs, not squares).
  const clouds = [];
  const cloudCanvas = document.createElement('canvas');
  cloudCanvas.width = 256; cloudCanvas.height = 128;
  const cg = cloudCanvas.getContext('2d');
  const cgrad = cg.createRadialGradient(128, 64, 8, 128, 64, 120);
  cgrad.addColorStop(0, 'rgba(255,255,255,1)');
  cgrad.addColorStop(0.6, 'rgba(255,255,255,0.55)');
  cgrad.addColorStop(1, 'rgba(255,255,255,0)');
  cg.fillStyle = cgrad; cg.fillRect(0, 0, 256, 128);
  const cloudTex = new THREE.CanvasTexture(cloudCanvas);
  const cloudMat = new THREE.SpriteMaterial({ color: 0xffd9c0, map: cloudTex, transparent: true, opacity: 0.32, depthWrite: false });
  for (let i = 0; i < 9; i += 1) {
    const s = new THREE.Sprite(cloudMat.clone());
    s.material.opacity = 0.32 + ((i * 37) % 10) / 50;
    const a = (i / 9) * Math.PI * 2;
    s.position.set(Math.cos(a) * (300 + (i % 3) * 120), 95 + (i % 4) * 16, Math.sin(a) * (300 + (i % 3) * 100));
    s.scale.set(140 + (i % 3) * 50, 22 + (i % 2) * 8, 1);
    scene.add(s);
    clouds.push(s);
  }

  const fog = new THREE.Fog(0xf2a35e, 90, 620);
  scene.fog = fog;

  let pmrem = null;
  function applyTime(tod, sunDir) {
    skyMat.uniforms.top.value.setHex(tod.skyTop);
    skyMat.uniforms.mid.value.setHex(tod.skyMid);
    skyMat.uniforms.bot.value.setHex(tod.skyBot);
    skyMat.uniforms.sunDir.value.copy(sunDir).normalize();
    skyMat.uniforms.sunCol.value.setHex(tod.sun);
    fog.color.setHex(tod.fog);
    fog.near = tod.hour >= 20 ? 60 : 90;
    fog.far = tod.hour >= 20 ? 420 : 620;
    for (const c of clouds) c.material.opacity = tod.hour >= 20 ? 0.12 : 0.3;
  }

  // Build the environment map from the sky itself (needs a renderer, once per time).
  function buildEnvironment(renderer) {
    if (!pmrem) pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    const dome2 = new THREE.Mesh(skyGeo, skyMat);
    envScene.add(dome2);
    const tex = pmrem.fromScene(envScene, 0.04).texture;
    scene.environment = tex;
  }

  return { dome, clouds, applyTime, buildEnvironment };
}
