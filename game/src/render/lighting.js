import { DAYTIME } from '../config.js';

export function createLighting(scene, renderer) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const sun = new THREE.DirectionalLight(DAYTIME.golden.sun, DAYTIME.golden.sunStrength);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 260;
  sun.shadow.camera.left = -45;
  sun.shadow.camera.right = 45;
  sun.shadow.camera.top = 45;
  sun.shadow.camera.bottom = -45;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  scene.add(sun.target);

  const hemi = new THREE.HemisphereLight(0x9a9da2, 0x8a8a8a, 0.5);
  scene.add(hemi);

  const fill = new THREE.DirectionalLight(0xb0bccd, 0.35);
  fill.position.set(-60, 40, -80);
  scene.add(fill);

  function setTime(presetKey, target) {
    const preset = DAYTIME[presetKey];
    const isNight = presetKey === 'night';
    const elev = isNight ? 0.05 : 0.12;
    const azim = ((preset.hour - 12) / 12) * Math.PI + 0.6;
    const dir = new THREE.Vector3(
      Math.cos(elev) * Math.sin(azim),
      Math.sin(elev),
      Math.cos(elev) * Math.cos(azim),
    );
    sun.position.copy(target).addScaledVector(dir, 120);
    sun.target.position.copy(target);
    sun.color.setHex(preset.sun);
    sun.intensity = preset.sunStrength;
    hemi.intensity = preset.hemiStrength;
    fill.intensity = isNight ? 1.0 : 0.35;
    renderer.toneMappingExposure = 1.15 * (preset.exposure ?? 1);
    return { dir, isNight };
  }

  function setFlat() {
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = false;
    scene.background = new THREE.Color(0x9a9a9a);
    scene.environment = null;
    scene.fog = null;
  }

  function blobShadow(scaleX, scaleZ, opacity) {
    const geo = new THREE.CircleGeometry(1, 24);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.02;
    mesh.scale.set(scaleX, scaleZ, 1);
    mesh.renderOrder = 1;
    return mesh;
  }

  return { sun, hemi, fill, setTime, setFlat, blobShadow };
}
