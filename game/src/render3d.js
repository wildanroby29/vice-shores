// The 3D renderer for Vice Shores: a golden-hour sky dome with a gradient and a
// sun disc, warm directional sunlight, haze fog, and the cameras — chase cam behind
// the car, over-the-shoulder on foot, the low cinematic title camera, and the
// workshop camera. A shot camera override lets the screenshot scenes frame exactly.
export function createRenderer3D(THREE, canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xffd9a0, 90, 260);

  // Sky dome: a big sphere painted with a sunset gradient, sun low in the west.
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 16;
  skyCanvas.height = 512;
  const sg = skyCanvas.getContext('2d');
  const grad = sg.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#2e6fb0');
  grad.addColorStop(0.45, '#7fb3d5');
  grad.addColorStop(0.62, '#ffd98a');
  grad.addColorStop(0.72, '#ff9a4d');
  grad.addColorStop(0.8, '#ff7a3c');
  grad.addColorStop(1, '#e85d3d');
  sg.fillStyle = grad;
  sg.fillRect(0, 0, 16, 512);
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(420, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false }),
  );
  scene.add(sky);

  // The sun: a bright disc low over the ocean.
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(26, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff3c4, fog: false }),
  );
  sun.position.set(-330, 42, -60);
  sun.lookAt(0, 0, 0);
  scene.add(sun);
  const sunGlow = new THREE.Mesh(
    new THREE.CircleGeometry(46, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.35, fog: false }),
  );
  sunGlow.position.set(-330, 42, -60);
  sunGlow.lookAt(0, 0, 0);
  scene.add(sunGlow);

  // Golden-hour light: warm sun from the west, cool sky fill from above.
  const sunLight = new THREE.DirectionalLight(0xffd9a0, 1.9);
  sunLight.position.set(-120, 70, -40);
  scene.add(sunLight);
  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0xffc46b, 0.85);
  scene.add(hemi);
  const bounce = new THREE.DirectionalLight(0xff9a4d, 0.35);
  bounce.position.set(80, 30, 60);
  scene.add(bounce);

  const camera = new THREE.PerspectiveCamera(62, 1280 / 800, 0.1, 900);

  let shotCam = null;

  function resize(w, h) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // Smooth camera helper: ease the camera toward a target position and look point.
  const camPos = new THREE.Vector3(0, 8, 20);
  const camLook = new THREE.Vector3(0, 1, 0);

  function frameCamera(mode, player, car, dt, t) {
    if (shotCam) {
      camera.position.set(shotCam.pos.x, shotCam.pos.y, shotCam.pos.z);
      camera.lookAt(shotCam.look.x, shotCam.look.y, shotCam.look.z);
      return;
    }
    let targetPos;
    let targetLook;
    if (mode === 'title') {
      // Low cinematic camera looking down the boulevard at the city, angled
      // slightly east so the ocean shows on the left and the road runs diagonal.
      targetPos = new THREE.Vector3(-54, 4.5, 20);
      targetLook = new THREE.Vector3(-50, 7, -70);
    } else if (mode === 'garage') {
      targetPos = new THREE.Vector3(-44.5, 2.6, 88);
      targetLook = new THREE.Vector3(-52, 1.2, 96);
    } else if (car) {
      // Close chase cam behind the car.
      const back = 9.5;
      const height = 3.4;
      const hx = Math.cos(car.heading);
      const hz = -Math.sin(car.heading);
      targetPos = new THREE.Vector3(car.x - hx * back, height, car.z - hz * back);
      targetLook = new THREE.Vector3(car.x + hx * 6, 1.2, car.z + hz * 6);
    } else {
      // Close over-the-shoulder on foot.
      const hx = Math.cos(player.heading);
      const hz = -Math.sin(player.heading);
      targetPos = new THREE.Vector3(player.x - hx * 4.2, 2.3, player.z - hz * 4.2);
      targetLook = new THREE.Vector3(player.x + hx * 8, 1.5, player.z + hz * 8);
    }
    const ease = Math.min(1, dt * 5);
    camPos.lerp(targetPos, ease);
    camLook.lerp(targetLook, ease);
    // A touch of life: the camera breathes with the golden hour.
    camera.position.set(camPos.x, camPos.y + Math.sin(t * 0.5) * 0.05, camPos.z);
    camera.lookAt(camLook);
  }

  return {
    renderer,
    scene,
    camera,
    resize,
    frameCamera,
    setShotCam(cam) {
      shotCam = cam;
    },
    clearShotCam() {
      shotCam = null;
    },
    render() {
      renderer.render(scene, camera);
    },
  };
}
