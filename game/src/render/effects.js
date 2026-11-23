// render/effects.js — soft sprite smoke, muzzle flash and skid/tyre smoke.
// Smoke is fading additive sprites, never grey blobs.
function spriteTexture(inner, outer) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  return t;
}

export function createEffects(scene) {
  const smokeTex = spriteTexture('rgba(255,255,255,0.85)', 'rgba(255,255,255,0)');
  const fireTex = spriteTexture('rgba(255,220,120,1)', 'rgba(255,80,0,0)');
  const puffs = [];

  function spawnSmoke(x, y, z, size, life, color) {
    const mat = new THREE.SpriteMaterial({ map: smokeTex, color: color ?? 0xcfc8bd, transparent: true, opacity: 0.25, depthWrite: false });
    const s = new THREE.Sprite(mat);
    s.position.set(x, y, z);
    s.scale.set(size, size, 1);
    s.userData = { life, maxLife: life, vy: 1.2 + Math.random() * 0.8, grow: size * 0.9, baseOp: 0.25 };
    scene.add(s);
    puffs.push(s);
    if (puffs.length > 90) { const old = puffs.shift(); scene.remove(old); old.material.dispose(); }
    return s;
  }

  function spawnFlame(x, y, z, size) {
    const mat = new THREE.SpriteMaterial({ map: fireTex, color: 0xffc46b, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    const s = new THREE.Sprite(mat);
    s.position.set(x, y, z);
    s.scale.set(size, size * 1.6, 1);
    s.userData = { life: 0.5, maxLife: 0.5, vy: 2.5, grow: size * 0.4, baseOp: 0.9 };
    scene.add(s);
    puffs.push(s);
    return s;
  }

  function muzzleFlash(x, y, z) {
    // Small flash sprite + a brief point light so the shot reads at 8+ m.
    const s = spawnFlame(x, y, z, 1.1);
    s.material.opacity = 1;
    s.userData.life = 0.5;
    s.userData.maxLife = 0.5;
    s.userData.baseOp = 1;
    const light = new THREE.PointLight(0xffc46b, 4, 12);
    light.position.set(x, y, z);
    scene.add(light);
    puffs.push({ isLight: true, light, life: 0.12, maxLife: 0.12 });
    return s;
  }

  // Bullet tracer: a thin bright streak from A to B, gone in ~0.15 s.
  function tracer(x1, y1, z1, x2, y2, z2) {
    const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1;
    const len = Math.hypot(dx, dy, dz) || 1;
    const mat = new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, len), mat);
    m.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
    m.lookAt(x2, y2, z2);
    scene.add(m);
    puffs.push({ isMesh: true, mesh: m, life: 0.15, maxLife: 0.15 });
    return m;
  }

  // Sparks: a burst of tiny bright points that fade in ~0.4 s.
  function sparks(x, y, z, n) {
    const count = n || 8;
    for (let i = 0; i < count; i += 1) {
      const mat = new THREE.SpriteMaterial({ map: fireTex, color: 0xffe9a0, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
      const s = new THREE.Sprite(mat);
      const a = Math.random() * Math.PI * 2;
      const r = 0.3 + Math.random() * 0.9;
      s.position.set(x + Math.cos(a) * r, y + (Math.random() - 0.3) * 0.8, z + Math.sin(a) * r);
      s.scale.set(0.35, 0.35, 1);
      s.userData = { life: 0.4, maxLife: 0.4, vy: 0.5 + Math.random(), grow: 0.1, baseOp: 0.9 };
      scene.add(s);
      puffs.push(s);
    }
  }

  function update(dt) {
    for (let i = puffs.length - 1; i >= 0; i -= 1) {
      const p = puffs[i];
      p.userData = p.userData || {};
      if (p.isLight) {
        p.life -= dt;
        if (p.life <= 0) { scene.remove(p.light); puffs.splice(i, 1); continue; }
        p.light.intensity = 6 * (p.life / p.maxLife);
        continue;
      }
      if (p.isMesh) {
        p.life -= dt;
        if (p.life <= 0) { scene.remove(p.mesh); p.mesh.material.dispose(); puffs.splice(i, 1); continue; }
        p.mesh.material.opacity = 0.9 * (p.life / p.maxLife);
        continue;
      }
      p.userData.life -= dt;
      if (p.userData.life <= 0) { scene.remove(p); p.material.dispose(); puffs.splice(i, 1); continue; }
      const k = p.userData.life / p.userData.maxLife;
      p.material.opacity = (p.userData.baseOp ?? 0.55) * k;
      p.position.y += p.userData.vy * dt;
      const g = 1 + (1 - k) * 0.6;
      p.scale.multiplyScalar(1 + dt * 0.5 * g);
    }
  }

  return { spawnSmoke, spawnFlame, muzzleFlash, tracer, sparks, update };
}
