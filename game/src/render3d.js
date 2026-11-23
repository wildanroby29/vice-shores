// Vice Shores — the 3D renderer. Golden-hour sunlight, a gradient sky dome
// with a sun disc, warm haze, and the cameras: third-person on foot, chase
// cam behind the car, and the fixed shot camera the screenshot system uses.
// three.js is loaded by the page as a classic script (game/vendor/three.min.js),
// so the modules read it from the window global instead of importing the UMD
// build (an ES-module import of a UMD file yields an empty namespace).
const THREE = window.THREE;

export function makeRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  return renderer;
}

export function makeScene() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xf2c98a, 90, 240);
  // Warm golden-hour sun, low over the ocean to the west, so it lights the
  // west and south faces the cameras see (never a black wall in shadow).
  const sun = new THREE.DirectionalLight(0xffd9a0, 2.6);
  sun.position.set(-70, 55, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -90;
  sun.shadow.camera.right = 90;
  sun.shadow.camera.top = 90;
  sun.shadow.camera.bottom = -90;
  sun.shadow.camera.far = 260;
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x8a6a4a, 1.25);
  scene.add(hemi);
  // Gradient sky dome.
  const skyGeo = new THREE.SphereGeometry(400, 24, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(0x7fb8e8) },
      mid: { value: new THREE.Color(0xf2c98a) },
      low: { value: new THREE.Color(0xff9a5a) },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP;
      uniform vec3 top; uniform vec3 mid; uniform vec3 low;
      void main(){
        float h = normalize(vP).y;
        vec3 c = h > 0.25 ? mix(mid, top, smoothstep(0.25, 0.8, h)) : mix(low, mid, smoothstep(-0.08, 0.25, h));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));
  // Sun disc low over the ocean to the west, visible in chase/title shots:
  // a warm ORANGE glow hugging the horizon — a sunset sun, never a big
  // white circle like a moon.
  const disc = new THREE.Mesh(new THREE.CircleGeometry(12, 32), new THREE.MeshBasicMaterial({ color: 0xff9a3d, fog: false }));
  disc.position.set(-200, 34, -180);
  disc.lookAt(0, 0, 0);
  scene.add(disc);
  // Soft orange halo around the disc so it glows instead of looking flat.
  const halo = new THREE.Mesh(new THREE.CircleGeometry(22, 32), new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.28, fog: false }));
  halo.position.set(-206, 34, -186);
  halo.lookAt(0, 0, 0);
  scene.add(halo);
  // A few soft clouds, kept flat and faint so they never read as grey
  // balloons crowding the sky.
  for (let i = 0; i < 8; i++) {
    const cloud = new THREE.Mesh(
      new THREE.SphereGeometry(1, 8, 6),
      new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })
    );
    cloud.scale.set(14 + i * 2, 1.4, 5);
    cloud.position.set(-160 + i * 45, 60 + (i % 3) * 12, -180 - (i % 2) * 40);
    scene.add(cloud);
  }
  return scene;
}

export function makeCamera() {
  const cam = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 600);
  cam.position.set(0, 4, 10);
  return cam;
}

// Third-person follow camera. On foot: close over-the-shoulder. Driving:
// a chase cam behind the car. The camera eases toward its target so it
// never snaps.
export function updateCamera(cam, target, onFoot, dt) {
  const back = onFoot ? 4.2 : 9.5;
  const height = onFoot ? 2.3 : 3.4;
  const side = 0.9;
  const fx = Math.sin(target.rot);
  const fz = Math.cos(target.rot);
  const px = -fz * side;
  const pz = fx * side;
  const tx = target.x - fx * back + px;
  const tz = target.z - fz * back + pz;
  const ty = height;
  const k = 1 - Math.exp(-6 * dt);
  cam.position.x += (tx - cam.position.x) * k;
  cam.position.y += (ty - cam.position.y) * k;
  cam.position.z += (tz - cam.position.z) * k;
  cam.lookAt(target.x + fx * 6, onFoot ? 1.4 : 1.2, target.z + fz * 6);
}

// A fixed shot camera: place it exactly and look exactly at a point.
export function setShotCamera(cam, pos, look) {
  cam.position.set(pos[0], pos[1], pos[2]);
  cam.lookAt(look[0], look[1], look[2]);
}

export function resize(renderer, cam) {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  cam.aspect = w / h;
  cam.updateProjectionMatrix();
}
