// Vice Shores — lights, shadows and tone mapping.
//
// One warm sun with soft shadows, a hemisphere fill so shadowed faces stay
// readable, and a cool fill light from the opposite side so the city never
// goes muddy. ACES filmic tone mapping at a slightly lifted exposure keeps
// golden hour bright and readable — the streets are never near-black.
// blobShadow is the cheap ground haze disc used under cars: a soft black
// circle whose opacity is set by the caller (the hero car's is kept very
// faint so it reads as contact shadow, not a grey puddle).

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

  // Point the sun from the preset's hour: low in the evening, higher in
  // the afternoon, barely above the horizon at night. Returns the sun
  // direction (for the sky shader) and whether it is night.
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
    renderer.toneMappingExposure = 1.15;
    return { dir, isNight };
  }

  // Flat mode for the dossier's clean reference renders: no tone mapping,
  // no shadows, a plain grey backdrop.
  function setFlat() {
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = false;
    scene.background = new THREE.Color(0x9a9a9a);
    scene.environment = null;
    scene.fog = null;
  }

  // A soft elliptical contact shadow. The caller picks the opacity: hero
  // cars use a faint one (0.07) so the asphalt still reads through it.
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
