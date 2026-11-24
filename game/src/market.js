function radialTex(inner, outer) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function box(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

const STALL_COLOURS = [0xc23a5a, 0xe8b83a, 0x3a9a5a, 0x2e6ac2, 0xe87a3a];
const GOODS_COLOURS = [0xe85a8a, 0xf2c94c, 0x7ac2c2, 0xe8b83a, 0x9a5ae8, 0xe85a3a];

function makeStall(i, rng, glowTex) {
  const g = new THREE.Group();
  const col = STALL_COLOURS[i % STALL_COLOURS.length];
  const awnMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.85, side: THREE.DoubleSide });
  const postMat = new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 0.9 });
  const counterMat = new THREE.MeshStandardMaterial({ color: 0x7a5c3a, roughness: 0.9 });
  for (const sx of [-1.4, 1.4]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.6, 8), postMat);
    post.position.set(sx, 1.3, 0);
    g.add(post);
  }
  const awn = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.6), awnMat);
  awn.rotation.x = -Math.PI / 2 + 0.35;
  awn.position.set(0, 2.7, 0.3);
  awn.castShadow = true;
  g.add(awn);
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.85, side: THREE.DoubleSide });
  for (let s = -1; s <= 1; s++) {
    const st = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 1.6), stripeMat);
    st.rotation.x = -Math.PI / 2 + 0.35;
    st.position.set(s * 1.1, 2.72, 0.3);
    g.add(st);
  }
  g.add(box(3.0, 0.9, 1.2, counterMat, 0, 0.45, 0));
  for (let k = 0; k < 7; k++) {
    const gm = new THREE.MeshStandardMaterial({ color: GOODS_COLOURS[(i * 7 + k) % GOODS_COLOURS.length], roughness: 0.8 });
    const kind = (i + k) % 3;
    if (kind === 0) {
      g.add(box(0.4, 0.3, 0.4, gm, -1.1 + k * 0.38, 1.05, 0));
    } else if (kind === 1) {
      const fr = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), gm);
      fr.position.set(-1.1 + k * 0.38, 1.02, 0.15);
      g.add(fr);
    } else {
      const cl = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.25, 8), gm);
      cl.position.set(-1.1 + k * 0.38, 1.02, -0.15);
      g.add(cl);
    }
  }
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff2c8, emissive: 0xffd98a, emissiveIntensity: 2.2, roughness: 0.4 });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), bulbMat);
  bulb.position.set(0, 2.35, 0.2);
  g.add(bulb);
  // A paper lantern hangs under each awning so every stall glows warm
  // from within — the market reads as lit, not just striped canvas.
  const lantern = makeLantern(glowTex, -0.9, 2.1, 0.35, 0.8);
  g.add(lantern);
  const lantern2 = makeLantern(glowTex, 0.9, 2.1, 0.35, 0.8);
  g.add(lantern2);
  return g;
}

function makeLantern(glowTex, x, y, z, scale) {
  const g = new THREE.Group();
  const lm = new THREE.MeshStandardMaterial({ color: 0xff6a3a, emissive: 0xff8a3a, emissiveIntensity: 1.6, roughness: 0.6 });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.22 * scale, 10, 8), lm);
  g.add(ball);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xffb36b, opacity: 0.55, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  halo.scale.set(1.6 * scale, 1.6 * scale, 1);
  g.add(halo);
  g.position.set(x, y, z);
  return g;
}

export function buildMarket(rng) {
  const group = new THREE.Group();
  const glowTex = radialTex('rgba(255,179,107,0.9)', 'rgba(255,179,107,0)');
  const bokehTex = radialTex('rgba(255,217,150,0.8)', 'rgba(255,217,150,0)');
  // The market row sits well north of the on-foot camera, so no stall ever
  // crowds the foreground: the nearest awning stays a mid-ground prop,
  // and the street in front of Rook stays open for the firefight.
  const baseX = 172;
  const baseZ = 104;
  const stallFronts = [];
  for (let i = 0; i < 5; i++) {
    const stall = makeStall(i, rng, glowTex);
    const sx = baseX;
    const sz = baseZ + i * 7;
    stall.position.set(sx, 0, sz);
    stall.rotation.y = Math.PI / 2;
    group.add(stall);
    stallFronts.push({ x: sx + 2.2, z: sz });
  }
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.6, metalness: 0.4 });
  const poleSpots = [[baseX - 1, baseZ - 4], [baseX - 1, baseZ + 32], [baseX - 14, baseZ + 8], [baseX - 14, baseZ + 22]];
  for (const [px, pz] of poleSpots) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 4.6, 8), poleMat);
    pole.position.set(px, 2.3, pz);
    group.add(pole);
  }
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff2c8, emissive: 0xffd98a, emissiveIntensity: 2.0, roughness: 0.4 });
  function stringLights(x1, z1, x2, z2, n) {
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const x = x1 + (x2 - x1) * t;
      const z = z1 + (z2 - z1) * t;
      const sag = Math.sin(t * Math.PI) * 0.7;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), bulbMat);
      bulb.position.set(x, 4.4 - sag, z);
      group.add(bulb);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: bokehTex, color: 0xffd98a, opacity: 0.4, transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      halo.position.set(x, 4.4 - sag, z);
      halo.scale.set(0.9, 0.9, 1);
      group.add(halo);
    }
  }
  stringLights(baseX - 1, baseZ - 4, baseX - 1, baseZ + 32, 10);
  stringLights(baseX - 1, baseZ + 8, baseX - 14, baseZ + 8, 5);
  stringLights(baseX - 1, baseZ + 22, baseX - 14, baseZ + 22, 5);
  const lanternSpots = [
    [baseX - 1, 3.9, baseZ - 4, 1.2], [baseX - 1, 3.9, baseZ + 32, 1.2],
    [baseX - 7, 3.6, baseZ + 6, 1.0], [baseX - 7, 3.6, baseZ + 14, 1.0],
    [baseX - 7, 3.6, baseZ + 22, 1.0], [baseX - 7, 3.6, baseZ + 30, 1.0],
    [baseX - 14, 3.9, baseZ + 8, 1.2], [baseX - 14, 3.9, baseZ + 22, 1.2],
  ];
  for (const [lx, ly, lz, ls] of lanternSpots) {
    group.add(makeLantern(glowTex, lx, ly, lz, ls));
  }
  for (let i = 0; i < 14; i++) {
    const b = new THREE.Sprite(new THREE.SpriteMaterial({
      map: bokehTex, color: 0xffd98a, opacity: 0.22 + rng() * 0.2, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    const s = 0.8 + rng() * 1.6;
    b.scale.set(s, s, 1);
    b.position.set(baseX - 2 - rng() * 12, 2.5 + rng() * 3.5, baseZ - 2 + rng() * 34);
    group.add(b);
  }
  const crateMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.9 });
  const crateSpots = [[baseX - 1, baseZ - 6], [baseX + 1, baseZ - 6.5], [baseX - 1, baseZ + 34], [baseX + 1, baseZ + 34.5]];
  for (const [cx, cz] of crateSpots) {
    group.add(box(0.8, 0.8, 0.8, crateMat, cx, 0.4, cz));
    group.add(box(0.6, 0.6, 0.6, crateMat, cx + 0.2, 1.1, cz));
  }
  return { group, stallFronts, baseX, baseZ };
}
