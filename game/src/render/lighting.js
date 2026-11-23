// render/lighting.js — renderer, sun, hemisphere light and shadows.
// ACES filmic tone mapping, sRGB output, PCF soft shadows. The sun is a warm
// low directional light whose shadow camera follows the camera target.
export function createLighting(scn, rdr) {
  rdr.toneMapping = THREE.ACESFilmicToneMapping;
  rdr.toneMappingExposure = 1.15;
  rdr.outputColorSpace = THREE.SRGBColorSpace;
  rdr.shadowMap.enabled = true;
  rdr.shadowMap.type = THREE.PCFSoftShadowMap;
  rdr.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const sun = new THREE.DirectionalLight(0xffb36b, 2.6);
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
  scn.add(sun);
  scn.add(sun.target);

  // Hemisphere: desaturated neutral sky (a saturated blue hemi is what
  // made the roads read navy/lavender) over a warm brown-grey ground, so
  // asphalt reads grey-brown in warm light with a cool shadow.
  const hemi = new THREE.HemisphereLight(0x9a9da2, 0x9a7a5c, 0.5);
  scn.add(hemi);

  const fillLight = new THREE.DirectionalLight(0xb0bccd, 0.35);
  fillLight.position.set(-60, 40, -80);
  scn.add(fillLight);

  // Move the sun + its shadow camera so the 90 m shadow box follows a target.
  function setTime(when, target) {
    const el = (when.hour >= 20 || when.hour < 6) ? 0.05 : 0.3; // low sun; night sun barely above the horizon (moonlight)
    const azim = ((when.hour - 12) / 12) * Math.PI + 0.6;
    const vec = new THREE.Vector3(Math.cos(azim) * Math.cos(el), Math.sin(el), Math.sin(azim) * Math.cos(el));
    const t = target || new THREE.Vector3();
    sun.position.copy(t).addScaledVector(vec, 120);
    sun.target.position.copy(t);
    sun.color.setHex(when.sun);
    sun.intensity = when.sunI;
    hemi.intensity = when.hemiI;
    fillLight.intensity = when.hour >= 20 ? 1.0 : 0.35;
    rdr.toneMappingExposure = when.hour >= 20 ? 1.15 : 1.15;
  }

  // Soft dark ellipse under a car or a pedestrian (shadow fallback on sand/roads).
  // Small and faint: a big pale octagon under the hero reads as a render artifact.
  const blobShape = new THREE.CircleGeometry(1, 32);
  function blobShadow(scaleX, scaleZ, opacity) {
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: opacity ?? 0.22, depthWrite: false });
    const m = new THREE.Mesh(blobShape, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.02;
    m.scale.set(scaleX, scaleZ, 1);
    m.renderOrder = 1;
    return m;
  }

  return { sun, hemi, setTime, blobShadow };
}
