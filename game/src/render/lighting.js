// Lighting: warm low sun with shadows, hemisphere fill, cool fill and PMREM environment.
const THREE = window.THREE;
export function setupLighting(scene, renderer) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const sun = new THREE.DirectionalLight(0xffd9a0, 2.7);
  sun.position.set(130, 95, 70);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -190; sun.shadow.camera.right = 190;
  sun.shadow.camera.top = 190; sun.shadow.camera.bottom = -190;
  sun.shadow.camera.near = 10; sun.shadow.camera.far = 520;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(0xffe2b8, 0x51608a, 1.25);
  scene.add(hemi);
  const fill = new THREE.DirectionalLight(0x9db8ff, 0.85);
  fill.position.set(-90, 70, -60);
  scene.add(fill);
  const amb = new THREE.AmbientLight(0x93a5c4, 0.5);
  scene.add(amb);
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 32;
  const g = cv.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 32);
  grad.addColorStop(0, '#3a2a6a'); grad.addColorStop(0.45, '#ff7a3d');
  grad.addColorStop(0.62, '#ffd9a0'); grad.addColorStop(1, '#5a4a6a');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 32);
  const tex = new THREE.CanvasTexture(cv);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromEquirectangular(tex).texture;
  return { sun, hemi, fill, amb };
}
export function setNight(lights, night) {
  const f = night ? 0.35 : 1;
  lights.sun.intensity = 2.7 * f;
  lights.hemi.intensity = night ? 0.5 : 1.25;
  lights.fill.intensity = night ? 0.35 : 0.85;
  lights.amb.intensity = night ? 0.3 : 0.5;
  lights.sun.color.setHex(night ? 0x8fa8ff : 0xffd9a0);
}
