// The 3D renderer for Vice Shores: a bright, sun-soaked, colourful coastal
// city rendered with the vendored three.js (UMD build, loaded as a classic
// script, so it lives on window.THREE). Golden-hour sun low over the ocean,
// warm haze, saturated buildings with neon signs, palms, a bright blue ocean
// and a wide beachfront boulevard. Cars are shaped (body + cabin + windshield
// + wheels + lights + bumper), people are multi-part with walk animation, and
// the police helicopter is white/red with a spinning rotor and a spotlight
// beam slanting down onto the player.

const THREE = window.THREE;

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function std(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, ...opts });
}

function basic(color, opts = {}) {
  return new THREE.MeshBasicMaterial({ color, ...opts });
}

function box(w, h, d, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** A building facade: the building's colour with a grid of windows, some lit warm. */
const facadeCache = new Map();
function facadeTexture(color, seed) {
  const key = `${color}|${seed % 5}`;
  if (facadeCache.has(key)) return facadeCache.get(key);
  const tex = canvasTexture(128, 256, (g, w, h) => {
    g.fillStyle = color;
    g.fillRect(0, 0, w, h);
    // A vertical gradient, darker at the street, so the building has depth
    // and the sun does not wash it out to white.
    const shade = g.createLinearGradient(0, 0, 0, h);
    shade.addColorStop(0, 'rgba(255,255,255,0.10)');
    shade.addColorStop(0.55, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,0,0,0.28)');
    g.fillStyle = shade;
    g.fillRect(0, 0, w, h);
    let s = seed;
    const rnd = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    const cols = 6;
    const rows = 14;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const lit = rnd() < 0.42;
        g.fillStyle = lit ? (rnd() < 0.6 ? '#ffd98a' : '#ffeec2') : '#2a3a4a';
        g.fillRect(6 + c * 20, 8 + r * 17, 13, 11);
      }
    }
  });
  facadeCache.set(key, tex);
  return tex;
}

/** A neon sign: glowing text on a transparent plane. */
function neonSignTexture(text, color) {
  return canvasTexture(256, 96, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.font = '900 44px Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = color;
    g.shadowBlur = 22;
    g.fillStyle = color;
    g.fillText(text, w / 2, h / 2);
    g.shadowBlur = 6;
    g.fillStyle = '#ffffff';
    g.fillText(text, w / 2, h / 2);
  });
}

function glowTexture() {
  return canvasTexture(64, 64, (g, w, h) => {
    const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,255,255,.6)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
}

export class Renderer {
  constructor(canvas, city, cfg) {
    this.canvas = canvas;
    this.city = city;
    this.cfg = cfg;
    this.time = 0;
    this.cameraMode = 'title';
    this.shotCamera = null;
    this.carMeshes = new Map();
    this.pedMeshes = new Map();
    this.particles = [];
    this.glowTex = glowTexture();

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xffc98a, 280, 750);
    this.camera = new THREE.PerspectiveCamera(62, 1280 / 800, 0.1, 1600);

    // Bright golden-hour sun, low over the ocean in the south-east.
    this.sun = new THREE.DirectionalLight(0xffd9a0, 2.0);
    this.sun.position.set(150, 48, 110);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -110;
    this.sun.shadow.camera.right = 110;
    this.sun.shadow.camera.top = 110;
    this.sun.shadow.camera.bottom = -110;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 500;
    this.sun.shadow.bias = -0.0004;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
    this.scene.add(new THREE.HemisphereLight(0xffd9a8, 0x8a6a4a, 0.8));
    this.scene.add(new THREE.AmbientLight(0xffe0b8, 0.25));

    this.buildSky();
    this.buildGround();
    this.buildCity();
    this.buildBeachAndOcean();
    this.buildMarker();
    this.heloMesh = this.makeHelicopterMesh();
    this.heloMesh.visible = false;
    this.scene.add(this.heloMesh);
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  buildSky() {
    const tex = canvasTexture(16, 512, (g, w, h) => {
      const grad = g.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#6fb7ec');
      grad.addColorStop(0.42, '#a8d4f0');
      grad.addColorStop(0.62, '#ffd9a0');
      grad.addColorStop(0.78, '#ff9a4d');
      grad.addColorStop(1, '#ff7a2e');
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
    });
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(900, 24, 16),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false }),
    );
    this.scene.add(sky);
    // The sun disc, low over the ocean to the south-east — it sits in the
    // title frame over the water.
    const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: 0xfff3c0, fog: false, depthWrite: false }));
    sunSprite.scale.set(180, 180, 1);
    sunSprite.position.set(520, 95, 300);
    this.scene.add(sunSprite);
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: 0xffffff, fog: false, depthWrite: false }));
    core.scale.set(70, 70, 1);
    core.position.set(520, 95, 300);
    this.scene.add(core);
  }

  buildGround() {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(1100, 1100), std(0xcbb98f));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, 0);
    ground.receiveShadow = true;
    this.scene.add(ground);
    // Parks: green patches on the park blocks.
    for (const block of this.city.blocks) {
      if (block.type !== 'park') continue;
      const p = new THREE.Mesh(new THREE.PlaneGeometry(66, 66), std(0x6fae4e));
      p.rotation.x = -Math.PI / 2;
      p.position.set(block.cx, 0.02, block.cz);
      p.receiveShadow = true;
      this.scene.add(p);
    }
    // Roads: the city grid runs on an 80-unit pitch; the streets are the
    // centrelines at -240, -160, -80, 0, 80, 160 and 240, plus the boulevard.
    const STREETS = [-240, -160, -80, 0, 80, 160, 240];
    const roadList = [];
    for (const s of STREETS) {
      roadList.push({ x1: s, z1: -280, x2: s, z2: 280 });
      roadList.push({ x1: -280, z1: s, x2: 280, z2: s });
    }
    const roadTex = canvasTexture(128, 128, (g, w, h) => {
      g.fillStyle = '#3a3f46';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#f7d54d';
      g.fillRect(w / 2 - 2, 8, 4, 34);
      g.fillRect(w / 2 - 2, 72, 4, 34);
    });
    roadTex.wrapS = THREE.RepeatWrapping;
    roadTex.wrapT = THREE.RepeatWrapping;
    for (const road of roadList) {
      const len = Math.hypot(road.x2 - road.x1, road.z2 - road.z1);
      const walk = new THREE.Mesh(new THREE.PlaneGeometry(len, 16), std(0xd8d2c4));
      walk.rotation.x = -Math.PI / 2;
      walk.rotation.z = -Math.atan2(road.z2 - road.z1, road.x2 - road.x1);
      walk.position.set((road.x1 + road.x2) / 2, 0.015, (road.z1 + road.z2) / 2);
      walk.receiveShadow = true;
      this.scene.add(walk);
      const tex = roadTex.clone();
      tex.needsUpdate = true;
      tex.repeat.set(len / 24, 1);
      const asphalt = new THREE.Mesh(new THREE.PlaneGeometry(len, 11), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
      asphalt.rotation.x = -Math.PI / 2;
      asphalt.rotation.z = -Math.atan2(road.z2 - road.z1, road.x2 - road.x1);
      asphalt.position.set((road.x1 + road.x2) / 2, 0.03, (road.z1 + road.z2) / 2);
      asphalt.receiveShadow = true;
      this.scene.add(asphalt);
    }
  }

  buildCity() {
    for (const block of this.city.blocks) {
      for (const b of block.buildings) {
        this.addBuilding(b);
      }
    }
    // Street lamps along the boulevard.
    for (let z = -240; z <= 240; z += 40) {
      this.addLamp(232, z);
      this.addLamp(248, z + 20);
    }
    // Market stalls with striped awnings, in the parking lot at (-120, 200).
    const awning = canvasTexture(64, 64, (g, w, h) => {
      for (let i = 0; i < 8; i += 1) {
        g.fillStyle = i % 2 === 0 ? '#ff5a5a' : '#ffffff';
        g.fillRect(i * 8, 0, 8, h);
      }
    });
    for (let i = 0; i < 5; i += 1) {
      const stall = new THREE.Group();
      stall.add(box(6, 2.4, 4, std(0x8a5a2a), 0, 1.2, 0));
      const roof = new THREE.Mesh(new THREE.BoxGeometry(7, 0.25, 5), new THREE.MeshStandardMaterial({ map: awning }));
      roof.position.set(0, 2.7, 0);
      roof.castShadow = true;
      stall.add(roof);
      stall.position.set(-138 + i * 9, 0, 192);
      this.scene.add(stall);
    }
    // The pier reaching into the ocean from the beach at z = 0.
    const pier = box(46, 0.8, 8, std(0x9a6a3a), 296, 0.6, 0);
    this.scene.add(pier);
    for (let i = 0; i < 6; i += 1) {
      this.scene.add(box(0.8, 2.4, 0.8, std(0x6a4520), 278 + i * 8, 0.4, 4));
      this.scene.add(box(0.8, 2.4, 0.8, std(0x6a4520), 278 + i * 8, 0.4, -4));
    }
  }

  addBuilding(b) {
    const facade = facadeTexture(b.color, Math.round(b.x * 7 + b.z * 3));
    const roofMat = std(0x5a4a3a);
    const sideMat = new THREE.MeshStandardMaterial({ map: facade, roughness: 0.9 });
    const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
    const mesh = new THREE.Mesh(geo, [sideMat, sideMat, roofMat, roofMat, sideMat, sideMat]);
    mesh.position.set(b.x, b.h / 2, b.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    // Rooftop clutter on taller buildings.
    if (b.h > 18) {
      this.scene.add(box(2.4, 1.6, 2.4, std(0x9aa0a6), b.x + b.w * 0.2, b.h + 0.8, b.z));
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 2.6, 10), std(0x7ec8e3));
      tank.position.set(b.x - b.w * 0.2, b.h + 1.3, b.z + b.d * 0.15);
      tank.castShadow = true;
      this.scene.add(tank);
    }
    // Neon sign on buildings that carry one, facing the street.
    if (b.sign) {
      const signTex = neonSignTexture(b.sign, b.signColor || '#ff5ad9');
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(Math.min(16, b.w * 0.9), 6),
        new THREE.MeshBasicMaterial({ map: signTex, transparent: true, side: THREE.DoubleSide }),
      );
      const faceEast = b.x < 200;
      sign.position.set(b.x + (faceEast ? b.w / 2 + 0.15 : -b.w / 2 - 0.15), b.h * 0.62, b.z);
      sign.rotation.y = faceEast ? Math.PI / 2 : -Math.PI / 2;
      this.scene.add(sign);
    }
  }

  addPalm(x, z, scale = 1) {
    const palm = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * scale, 0.42 * scale, 7 * scale, 7), std(0x8a6a3a));
    trunk.position.y = 3.5 * scale;
    trunk.rotation.z = 0.08;
    trunk.castShadow = true;
    palm.add(trunk);
    const frondMat = std(0x2fae4e, { roughness: 0.9 });
    for (let i = 0; i < 6; i += 1) {
      const frond = box(0.3 * scale, 0.12 * scale, 3.4 * scale, frondMat, 0, 0, 1.6 * scale);
      const holder = new THREE.Group();
      holder.position.y = 7 * scale;
      holder.rotation.y = (i / 6) * Math.PI * 2;
      holder.rotation.x = 0.5;
      holder.add(frond);
      palm.add(holder);
    }
    const nuts = new THREE.Mesh(new THREE.SphereGeometry(0.35 * scale, 8, 6), std(0x7a4a1a));
    nuts.position.y = 6.6 * scale;
    palm.add(nuts);
    palm.position.set(x, 0, z);
    this.scene.add(palm);
    return palm;
  }

  addLamp(x, z) {
    const lamp = new THREE.Group();
    lamp.add(box(0.25, 6, 0.25, std(0x2a2f36), 0, 3, 0));
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), basic(0xfff2b0));
    head.position.y = 6.1;
    lamp.add(head);
    lamp.position.set(x, 0, z);
    this.scene.add(lamp);
  }

  buildBeachAndOcean() {
    // Sand beach along the east edge, then the bright blue ocean.
    const beach = new THREE.Mesh(new THREE.PlaneGeometry(32, 520), std(0xf2d492));
    beach.rotation.x = -Math.PI / 2;
    beach.position.set(268, 0.02, 0);
    beach.receiveShadow = true;
    this.scene.add(beach);
    // Bright blue ocean with white wave streaks.
    const waveTex = canvasTexture(256, 256, (g, w, h) => {
      g.fillStyle = '#1e9fd8';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(255,255,255,.55)';
      g.lineWidth = 3;
      for (let i = 0; i < 14; i += 1) {
        g.beginPath();
        const y = 12 + i * 18;
        g.moveTo(0, y);
        for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x * 0.09 + i) * 5);
        g.stroke();
      }
      g.fillStyle = 'rgba(255,255,255,.25)';
      for (let i = 0; i < 40; i += 1) g.fillRect(Math.random() * w, Math.random() * h, 8, 2);
    });
    waveTex.wrapS = THREE.RepeatWrapping;
    waveTex.wrapT = THREE.RepeatWrapping;
    waveTex.repeat.set(6, 6);
    const ocean = new THREE.Mesh(
      new THREE.PlaneGeometry(260, 1100),
      new THREE.MeshStandardMaterial({ map: waveTex, roughness: 0.25, metalness: 0.35 }),
    );
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.set(414, 0.05, 0);
    this.scene.add(ocean);
    // Palms and umbrellas along the beachfront.
    for (const palm of this.city.palms) this.addPalm(palm.x, palm.z, palm.scale);
    for (let i = 0; i < 8; i += 1) {
      const ux = 258 + (i % 2) * 5;
      const uz = -180 + i * 52;
      const pole = box(0.18, 3, 0.18, std(0xffffff), ux, 1.5, uz);
      this.scene.add(pole);
      const shade = new THREE.Mesh(new THREE.ConeGeometry(2.0, 0.9, 8), std(i % 2 === 0 ? '#ff5a5a' : '#ffd21f'));
      shade.position.set(ux, 3.1, uz);
      shade.castShadow = true;
      this.scene.add(shade);
    }
    // Marina boats bobbing near the beach.
    for (let i = 0; i < 3; i += 1) {
      const boat = new THREE.Group();
      boat.add(box(6, 1.2, 2.2, std(0xffffff), 0, 0.6, 0));
      boat.add(box(4, 0.8, 1.6, std(0x2f7fc4), 0, 1.4, 0));
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5, 6), std(0x8a6a3a));
      mast.position.y = 3.5;
      boat.add(mast);
      const sail = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.4), basic(0xffffff, { side: THREE.DoubleSide }));
      sail.position.set(0.9, 3.4, 0);
      boat.add(sail);
      boat.position.set(292 + i * 14, 0.1, 110 + i * 26);
      boat.rotation.y = 0.4;
      this.scene.add(boat);
    }
  }

  buildMarker() {
    const geo = new THREE.CylinderGeometry(1.4, 1.4, 24, 12, 1, true);
    this.markerBeam = new THREE.Mesh(geo, basic(0xffd21f, { transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
    this.markerBeam.visible = false;
    this.scene.add(this.markerBeam);
    this.markerDiamond = new THREE.Mesh(new THREE.OctahedronGeometry(1.6), basic(0xffd21f));
    this.markerDiamond.visible = false;
    this.scene.add(this.markerDiamond);
  }

  /** A shaped car: lower body + cabin + darker windshield + 4 visible wheels
   *  + headlights, taillights and bumpers. Sports cars get a spoiler, police
   *  cars a flashing light bar, taxis a roof sign. */
  makeCarMesh(car) {
    const g = new THREE.Group();
    const L = car.length;
    const W = car.width;
    const low = car.kind === 'sports';
    const bodyH = low ? 0.5 : 0.62;
    const bodyY = low ? 0.42 : 0.5;
    const paint = std(car.color, { roughness: 0.35, metalness: 0.45 });
    g.add(box(L, bodyH, W, paint, 0, bodyY, 0));
    // Cabin.
    const cabin = box(L * 0.48, 0.52, W * 0.82, std(car.color, { roughness: 0.4, metalness: 0.4 }), -L * 0.06, bodyY + bodyH / 2 + 0.24, 0);
    g.add(cabin);
    // Darker windshield, slanted at the front of the cabin.
    const shield = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.78, 0.5), std(0x12202e, { roughness: 0.12, metalness: 0.85 }));
    shield.position.set(L * 0.19, bodyY + bodyH / 2 + 0.26, 0);
    shield.rotation.y = Math.PI / 2;
    shield.rotation.x = 0;
    shield.rotation.z = 0;
    shield.rotation.order = 'YXZ';
    shield.rotation.y = Math.PI / 2;
    shield.rotateX(-0.5);
    g.add(shield);
    // Rear window.
    const rear = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.78, 0.44), std(0x12202e, { roughness: 0.12, metalness: 0.85 }));
    rear.position.set(-L * 0.31, bodyY + bodyH / 2 + 0.26, 0);
    rear.rotation.y = -Math.PI / 2;
    rear.rotateX(0.5);
    g.add(rear);
    // Four visible wheels with hubcaps and a spoke so the spin reads.
    const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 14);
    const tyre = std(0x14161a, { roughness: 0.95 });
    const hub = std(0xd8dce2, { roughness: 0.3, metalness: 0.8 });
    this.wheels = this.wheels || [];
    const wheelGroup = new THREE.Group();
    for (const [wx, wz] of [[L * 0.32, W * 0.5], [L * 0.32, -W * 0.5], [-L * 0.32, W * 0.5], [-L * 0.32, -W * 0.5]]) {
      const holder = new THREE.Group();
      holder.position.set(wx, 0.36, wz);
      const tyreMesh = new THREE.Mesh(wheelGeo, tyre);
      tyreMesh.rotation.x = Math.PI / 2;
      tyreMesh.castShadow = true;
      holder.add(tyreMesh);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.28, 10), hub);
      cap.rotation.x = Math.PI / 2;
      holder.add(cap);
      const spoke = box(0.05, 0.3, 0.3, std(0x2a2f36), 0, 0, wz > 0 ? 0.15 : -0.15);
      holder.add(spoke);
      holder.userData.spin = holder;
      wheelGroup.add(holder);
      g.userData.wheels = g.userData.wheels || [];
      g.userData.wheels.push(holder);
    }
    g.add(wheelGroup);
    // Headlights and taillights.
    const headMat = basic(0xfff8c0);
    g.add(box(0.08, 0.14, 0.34, headMat, L / 2 + 0.01, bodyY + 0.08, W * 0.28));
    g.add(box(0.08, 0.14, 0.34, headMat, L / 2 + 0.01, bodyY + 0.08, -W * 0.28));
    const tailMat = basic(0xff2a2a);
    g.add(box(0.08, 0.14, 0.34, tailMat, -L / 2 - 0.01, bodyY + 0.08, W * 0.28));
    g.add(box(0.08, 0.14, 0.34, tailMat, -L / 2 - 0.01, bodyY + 0.08, -W * 0.28));
    // Bumpers.
    g.add(box(0.22, 0.2, W * 0.96, std(0xd8dce2, { roughness: 0.3, metalness: 0.7 }), L / 2 + 0.05, 0.3, 0));
    g.add(box(0.22, 0.2, W * 0.96, std(0xd8dce2, { roughness: 0.3, metalness: 0.7 }), -L / 2 - 0.05, 0.3, 0));
    if (low) {
      // Sports spoiler on two small supports.
      g.add(box(0.1, 0.22, 0.3, std(0x1a1d22), -L * 0.42, bodyY + bodyH / 2 + 0.1, W * 0.3));
      g.add(box(0.1, 0.22, 0.3, std(0x1a1d22), -L * 0.42, bodyY + bodyH / 2 + 0.1, -W * 0.3));
      g.add(box(0.5, 0.08, W * 0.95, std(0x1a1d22, { roughness: 0.4, metalness: 0.5 }), -L * 0.48, bodyY + bodyH / 2 + 0.24, 0));
    }
    if (car.isPolice) {
      // White body with a red/blue light bar on the roof.
      const bar = new THREE.Group();
      const red = box(0.7, 0.16, 0.4, basic(0xff2a2a), 0, 0, 0.22);
      const blue = box(0.7, 0.16, 0.4, basic(0x2a5aff), 0, 0, -0.22);
      bar.add(red);
      bar.add(blue);
      bar.position.set(-L * 0.06, bodyY + bodyH / 2 + 0.56, 0);
      g.add(bar);
      g.userData.lightBar = { red, blue };
      // "VSPD" door badge: a small dark stripe.
      g.add(box(1.4, 0.3, 0.02, basic(0x1a3a5c), 0, bodyY + 0.05, W / 2 + 0.01));
      g.add(box(1.4, 0.3, 0.02, basic(0x1a3a5c), 0, bodyY + 0.05, -W / 2 - 0.01));
    }
    if (car.kind === 'taxi') {
      g.add(box(0.9, 0.24, 0.5, basic(0xffd21f), -L * 0.06, bodyY + bodyH / 2 + 0.6, 0));
    }
    return g;
  }

  /** A person from parts: torso, head, two arms, two legs — each with its own
   *  colour — so every pedestrian reads as a distinct person. */
  makePersonMesh(body) {
    const g = new THREE.Group();
    const shirt = std(body.shirt);
    const pants = std(body.pants);
    const skin = std(body.skin);
    const hair = std(body.hair);
    const mkLimb = (mat, w, len, x, y) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, 0);
      const part = box(w, len, w, mat, 0, -len / 2, 0);
      pivot.add(part);
      return pivot;
    };
    const legL = mkLimb(pants, 0.17, 0.55, -0.11, 0.58);
    const legR = mkLimb(pants, 0.17, 0.55, 0.11, 0.58);
    g.add(legL);
    g.add(legR);
    g.add(box(0.44, 0.58, 0.26, shirt, 0, 0.88, 0));
    const armL = mkLimb(shirt, 0.13, 0.52, -0.29, 1.12);
    const armR = mkLimb(shirt, 0.13, 0.52, 0.29, 1.12);
    g.add(armL);
    g.add(armR);
    // Hands.
    armL.children[0].position.y = -0.26;
    armR.children[0].position.y = -0.26;
    g.add(box(0.27, 0.27, 0.27, skin, 0, 1.34, 0));
    g.add(box(0.29, 0.1, 0.29, hair, 0, 1.5, 0));
    if (body.hat) {
      const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.09, 10), std('#ffd21f'));
      hat.position.y = 1.56;
      g.add(hat);
    }
    g.scale.set(body.wide, body.tall, body.wide);
    g.userData.limbs = { legL, legR, armL, armR };
    return g;
  }

  /** The helicopter: white body with a red stripe, tail boom, spinning main
   *  rotor, and a bright spotlight beam that slants down to the player. */
  makeHelicopterMesh() {
    const g = new THREE.Group();
    g.add(box(3.4, 1.3, 1.7, std(0xf4f4f4, { roughness: 0.4, metalness: 0.3 }), 0, 0, 0));
    g.add(box(3.42, 0.3, 1.72, std(0xe63946), 0, 0.1, 0));
    // Cockpit glass.
    const glass = box(0.9, 0.8, 1.5, std(0x12202e, { roughness: 0.12, metalness: 0.85 }), 1.6, 0.1, 0);
    g.add(glass);
    // Tail boom + tail fin + tail rotor.
    g.add(box(3.6, 0.42, 0.42, std(0xf4f4f4), -3.2, 0.25, 0));
    g.add(box(0.2, 1.1, 0.5, std(0xe63946), -4.9, 0.6, 0));
    const tailRotor = new THREE.Group();
    tailRotor.position.set(-4.9, 0.6, 0.35);
    tailRotor.add(box(0.06, 1.4, 0.1, std(0x222222)));
    tailRotor.add(box(0.06, 0.1, 1.4, std(0x222222)));
    g.add(tailRotor);
    g.userData.tailRotor = tailRotor;
    // Skids.
    g.add(box(3.2, 0.12, 0.14, std(0x222222), 0, -0.85, 0.6));
    g.add(box(3.2, 0.12, 0.14, std(0x222222), 0, -0.85, -0.6));
    // Main rotor: two long thin blades, spinning fast.
    const rotor = new THREE.Group();
    rotor.position.y = 0.85;
    rotor.add(box(7.2, 0.07, 0.34, std(0x222222)));
    rotor.add(box(0.34, 0.07, 7.2, std(0x222222)));
    g.add(rotor);
    g.userData.rotor = rotor;
    // Spotlight beam: a translucent cone, apex at the helicopter. It is a
    // scene-level mesh so it can be aimed from the helicopter down onto the
    // player every frame (see update()).
    const beamGeo = new THREE.ConeGeometry(3, 42, 16, 1, true);
    this.beamMesh = new THREE.Mesh(beamGeo, basic(0xfff2b0, { transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.beamMesh.visible = false;
    this.scene.add(this.beamMesh);
    // The pool of light where the beam lands.
    this.spotPool = new THREE.Mesh(new THREE.CircleGeometry(5.5, 20), basic(0xfff2b0, { transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.spotPool.rotation.x = -Math.PI / 2;
    this.spotPool.position.y = 0.08;
    this.scene.add(this.spotPool);
    return g;
  }

  /** Fire + smoke sprites above a wreck. */
  spawnWreckFx(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const parts = [];
    for (let i = 0; i < 7; i += 1) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: i % 2 === 0 ? 0xff7a1e : 0xffd21f, transparent: true, depthWrite: false }));
      s.position.set((Math.random() - 0.5) * 2, 0.8 + Math.random() * 1.2, (Math.random() - 0.5) * 2);
      s.scale.set(1.6, 1.6, 1);
      s.userData = { phase: Math.random() * Math.PI * 2, speed: 0.8 + Math.random() * 0.8, fire: true };
      group.add(s);
      parts.push(s);
    }
    for (let i = 0; i < 4; i += 1) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: 0x555555, transparent: true, opacity: 0.5, depthWrite: false }));
      s.position.set((Math.random() - 0.5) * 2, 2 + Math.random() * 2, (Math.random() - 0.5) * 2);
      s.scale.set(2.4, 2.4, 1);
      s.userData = { phase: Math.random() * Math.PI * 2, speed: 0.5 + Math.random() * 0.4, fire: false };
      group.add(s);
      parts.push(s);
    }
    this.scene.add(group);
    this.particles.push({ group, parts });
  }

  setShotCamera(pos, look) {
    this.shotCamera = { pos, look };
  }

  clearShotCamera() {
    this.shotCamera = null;
  }

  setCameraMode(mode) {
    this.cameraMode = mode;
  }

  syncCars(cars) {
    for (const car of cars) {
      let mesh = this.carMeshes.get(car.id);
      if (!mesh) {
        mesh = this.makeCarMesh(car);
        this.scene.add(mesh);
        this.carMeshes.set(car.id, mesh);
      }
      mesh.position.set(car.x, 0, car.z);
      mesh.rotation.y = -car.heading;
      if (car.wrecked) {
        mesh.rotation.z = 0.07;
        if (!mesh.userData.fx) {
          mesh.userData.fx = true;
          this.spawnWreckFx(car.x, car.z);
        }
      }
      if (car.isPolice && mesh.userData.lightBar) {
        const flash = Math.sin(this.time * 14) > 0;
        mesh.userData.lightBar.red.material = basic(flash ? 0xff2a2a : 0x7a1010);
        mesh.userData.lightBar.blue.material = basic(flash ? 0x10105a : 0x2a5aff);
      }
      if (mesh.userData.wheels) {
        for (const wheel of mesh.userData.wheels) {
          wheel.rotation.z -= (car.speed * 0.016) / 0.36;
        }
      }
    }
  }

  syncPeds(peds, playerBody) {
    for (const ped of peds) {
      let mesh = this.pedMeshes.get(ped.id);
      if (!mesh) {
        mesh = this.makePersonMesh(ped.body);
        this.scene.add(mesh);
        this.pedMeshes.set(ped.id, mesh);
      }
      mesh.position.set(ped.x, 0, ped.z);
      mesh.rotation.y = -ped.heading;
      const limbs = mesh.userData.limbs;
      if (ped.state === 'down') {
        mesh.rotation.x = -1.35;
        mesh.position.y = 0.3;
      } else {
        mesh.rotation.x = 0;
        mesh.position.y = 0;
        const swing = Math.sin(ped.body.walkPhase) * (ped.speed > 0.1 ? 0.55 : 0);
        limbs.legL.rotation.x = swing;
        limbs.legR.rotation.x = -swing;
        limbs.armL.rotation.x = -swing * 0.8;
        limbs.armR.rotation.x = swing * 0.8;
      }
    }
  }

  update(state, dt) {
    this.time += dt;
    // Sync the world.
    this.syncCars(state.allCars);
    this.syncPeds(state.peds, state.player.body);
    // Player character mesh.
    let playerMesh = this.pedMeshes.get('player');
    if (!playerMesh) {
      playerMesh = this.makePersonMesh(state.player.body);
      this.scene.add(playerMesh);
      this.pedMeshes.set('player', playerMesh);
    }
    playerMesh.position.set(state.player.x, 0, state.player.z);
    playerMesh.rotation.y = -state.player.heading;
    const pl = playerMesh.userData.limbs;
    if (state.player.car) {
      playerMesh.visible = false;
    } else {
      playerMesh.visible = true;
      const moving = Math.abs(state.player.speed) > 0.1 || state.input.moveMag > 0.1;
      const swing = Math.sin(state.player.body.walkPhase) * (moving ? 0.6 : 0);
      pl.legL.rotation.x = swing;
      pl.legR.rotation.x = -swing;
      pl.armL.rotation.x = -swing * 0.8;
      pl.armR.rotation.x = swing * 0.8;
    }
    // Helicopter.
    const helo = state.helo;
    this.heloMesh.visible = !!helo.active;
    this.spotPool.visible = !!helo.active;
    this.beamMesh.visible = !!helo.active;
    if (helo.active) {
      this.heloMesh.position.set(helo.x, helo.y, helo.z);
      this.heloMesh.rotation.y = -helo.heading;
      this.heloMesh.userData.rotor.rotation.y = helo.rotor;
      this.heloMesh.userData.tailRotor.rotation.z = helo.rotor * 2.4;
      // Aim the beam from the helicopter down onto the player: the cone's
      // apex sits at the helicopter and its base lands on the player car.
      const dx = state.player.x - helo.x;
      const dy = 0 - helo.y;
      const dz = state.player.z - helo.z;
      const dist = Math.hypot(dx, dy, dz) || 1;
      this.beamMesh.position.set((helo.x + state.player.x) / 2, helo.y / 2, (helo.z + state.player.z) / 2);
      const toHelo = new THREE.Vector3(-dx / dist, -dy / dist, -dz / dist);
      this.beamMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), toHelo);
      this.beamMesh.scale.set(1, dist / 42, 1);
      this.spotPool.position.set(state.player.x, 0.08, state.player.z);
      const pulse = 0.26 + Math.sin(this.time * 6) * 0.06;
      this.spotPool.material.opacity = pulse;
    }
    // Mission marker beacon.
    if (state.marker) {
      this.markerBeam.visible = true;
      this.markerDiamond.visible = true;
      this.markerBeam.position.set(state.marker.x, 12, state.marker.z);
      this.markerBeam.material.opacity = 0.16 + Math.sin(this.time * 3) * 0.07;
      this.markerDiamond.position.set(state.marker.x, 5 + Math.sin(this.time * 2) * 0.8, state.marker.z);
      this.markerDiamond.rotation.y = this.time * 1.5;
    } else {
      this.markerBeam.visible = false;
      this.markerDiamond.visible = false;
    }
    // Fire and smoke.
    for (const fx of this.particles) {
      for (const s of fx.parts) {
        s.position.y += s.userData.speed * dt;
        const sc = s.scale.x + dt * (s.userData.fire ? 1.4 : 1.0);
        s.scale.set(sc, sc, 1);
        if (s.position.y > 7) {
          s.position.y = 0.8;
          s.scale.set(1.6, 1.6, 1);
        }
      }
    }
    // Sun shadow follows the focus point.
    const focus = state.player.car || state.player;
    this.sun.position.set(focus.x + 150, 48, focus.z + 110);
    this.sun.target.position.set(focus.x, 0, focus.z);
    // Camera.
    if (this.shotCamera) {
      this.camera.position.set(this.shotCamera.pos[0], this.shotCamera.pos[1], this.shotCamera.pos[2]);
      this.camera.lookAt(this.shotCamera.look[0], this.shotCamera.look[1], this.shotCamera.look[2]);
    } else if (this.cameraMode === 'title') {
      // Looking south down the beachfront boulevard: palms and neon on both
      // sides, the beach and ocean on the left, the sun low over the water.
      const t = this.time * 0.045;
      const cx = 254 + Math.sin(t) * 10;
      const cz = -150 + Math.cos(t) * 10;
      this.camera.position.set(cx, 21 + Math.sin(t * 0.7) * 2, cz);
      this.camera.lookAt(244, 5, 60);
    } else if (this.cameraMode === 'garage') {
      const car = state.player.car || state.garageCar;
      const gx = car ? car.x : state.player.x;
      const gz = car ? car.z : state.player.z;
      // The car sits right of centre, clear of the shop panel (which the
      // garage shot docks on the left) and above the bottom HUD panels.
      this.camera.position.set(gx + 10, 4, gz + 10);
      this.camera.lookAt(gx - 14, 1, gz - 2);
    } else if (state.player.car) {
      const car = state.player.car;
      const fx = Math.cos(car.heading);
      const fz = Math.sin(car.heading);
      const wantX = car.x - fx * 11.5;
      const wantZ = car.z - fz * 11.5;
      this.camera.position.x += (wantX - this.camera.position.x) * Math.min(1, dt * 5);
      this.camera.position.y += (4.6 - this.camera.position.y) * Math.min(1, dt * 5);
      this.camera.position.z += (wantZ - this.camera.position.z) * Math.min(1, dt * 5);
      this.camera.lookAt(car.x + fx * 10, 1.2, car.z + fz * 10);
    } else {
      const p = state.player;
      const fx = Math.cos(p.heading);
      const fz = Math.sin(p.heading);
      const wantX = p.x - fx * 6.5;
      const wantZ = p.z - fz * 6.5;
      this.camera.position.x += (wantX - this.camera.position.x) * Math.min(1, dt * 6);
      this.camera.position.y += (3.1 - this.camera.position.y) * Math.min(1, dt * 6);
      this.camera.position.z += (wantZ - this.camera.position.z) * Math.min(1, dt * 6);
      this.camera.lookAt(p.x + fx * 7, 1.4, p.z + fz * 7);
    }
    this.renderer.render(this.scene, this.camera);
  }
}
