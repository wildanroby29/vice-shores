// The renderer: bright golden-hour sun, a sky with a real gradient, warm fog,
// and the cameras — a low close chase-cam behind the car, an over-the-shoulder
// camera on foot, a cinematic boulevard shot for the title, and a close
// workshop camera for the garage. Close and epic, never a distant overview.
import { S } from './config.js';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xffc98a, 180, 520);
  // Sky: a big gradient dome (warm horizon, soft blue above).
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 4; skyCanvas.height = 256;
  const sg = skyCanvas.getContext('2d');
  const grad = sg.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#5f9fd6');
  grad.addColorStop(0.45, '#9cc8e8');
  grad.addColorStop(0.72, '#ffc98a');
  grad.addColorStop(1, '#ff9a5c');
  sg.fillStyle = grad; sg.fillRect(0, 0, 4, 256);
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(900, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false }),
  );
  scene.add(sky);
  // Golden-hour sun: warm, low, strong, with shadows.
  const sun = new THREE.DirectionalLight(0xffd9a0, 2.6);
  sun.position.set(180, 120, -140);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -220; sun.shadow.camera.right = 220;
  sun.shadow.camera.top = 220; sun.shadow.camera.bottom = -220;
  sun.shadow.camera.far = 800;
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x8a6a4a, 0.9);
  scene.add(hemi);
  // A visible sun disc low over the ocean, so the golden hour reads.
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(26, 24),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8, fog: false }));
  sunDisc.position.set(420, 90, 60);
  sunDisc.lookAt(0, 40, 0);
  scene.add(sunDisc);
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 2000);
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  return { renderer, scene, camera, sun };
}

function lerp(a, b, t) { return a + (b - a) * t; }

// Close chase camera: low, tight behind the car, so the GT fills the frame
// and the street rushes past — never a distant overview.
export function chaseCamera(camera, car, dt) {
  const back = 9.5, height = 3.4;
  const bx = car.x - Math.cos(car.angle) * back;
  const bz = car.z + Math.sin(car.angle) * back;
  const tx = car.x + Math.cos(car.angle) * 10;
  const tz = car.z - Math.sin(car.angle) * 10;
  camera.position.x = lerp(camera.position.x, bx, Math.min(1, dt * 6));
  camera.position.y = lerp(camera.position.y, height, Math.min(1, dt * 6));
  camera.position.z = lerp(camera.position.z, bz, Math.min(1, dt * 6));
  camera.lookAt(tx, 1.4, tz);
}

// Over-the-shoulder on foot: close behind the player's right shoulder.
export function footCamera(camera, person, dt) {
  const back = 4.2, height = 2.6, side = 1.1;
  const fx = Math.cos(person.angle), fz = -Math.sin(person.angle);
  const rx = -fz, rz = fx;
  const bx = person.x - fx * back + rx * side;
  const bz = person.z - fz * back + rz * side;
  camera.position.x = lerp(camera.position.x, bx, Math.min(1, dt * 8));
  camera.position.y = lerp(camera.position.y, height, Math.min(1, dt * 8));
  camera.position.z = lerp(camera.position.z, bz, Math.min(1, dt * 8));
  camera.lookAt(person.x + fx * 8, 1.5, person.z + fz * 8);
}

// Title camera: low on the boulevard looking south, beach and ocean on the
// left, skyline on the right, the sun ahead — the city at its best.
export function titleCamera(camera, t) {
  camera.position.set(150, 6, -60 + Math.sin(t * 0.05) * 8);
  camera.lookAt(140, 8, 120);
}

// Garage camera: close inside the workshop, three-quarter view from the
// south-east — the GT on its lift in the centre, the painter at its flank,
// the lift posts to the sides, never between camera and car.
export function garageCamera(camera, spot) {
  camera.position.set(spot.x + 8, 3, spot.z + 8);
  camera.lookAt(spot.x - 1, 1.2, spot.z);
}
