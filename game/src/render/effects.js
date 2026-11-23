// render/effects.js — soft sprite smoke, muzzle flash and skid/tyre smoke.
// Smoke is fading additive sprites, never grey blobs.
function spriteTexture(inner, outer) {
  const cv = document.createElement('canvas');
  cv.width = 64;
  cv.height = 64;
  const g2 = cv.getContext('2d');
  const gradient = g2.createRadialGradient(32, 32, 2, 32, 32, 30);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(1, outer);
  g2.fillStyle = gradient;
  g2.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(cv);
  return tex;
}

export function createEffects(scn) {
  const smoke = spriteTexture('rgba(255,255,255,0.85)', 'rgba(255,255,255,0)');
  const flame = spriteTexture('rgba(255,220,120,1)', 'rgba(255,80,0,0)');
  const bits = [];

  function spawnSmoke(x, y, z, size, life, color) {
    const material = new THREE.SpriteMaterial({ map: smoke, color: color ?? 0xcfc8bd, transparent: true, opacity: 0.25, depthWrite: false });
    const spr = new THREE.Sprite(material);
    spr.position.set(x, y, z);
    spr.scale.set(size, size, 1);
    spr.userData = { life, maxLife: life, vy: 1.2 + Math.random() * 0.8, grow: size * 0.9, baseOp: 0.25 };
    scn.add(spr);
    bits.push(spr);
    if (bits.length > 90) {
      const old = bits.shift();
      scn.remove(old);
      old.material.dispose();
    }
    return spr;
  }

  function spawnFlame(x, y, z, size) {
    const material = new THREE.SpriteMaterial({ map: flame, color: 0xffc46b, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    const spr = new THREE.Sprite(material);
    spr.position.set(x, y, z);
    spr.scale.set(size, size * 1.6, 1);
    spr.userData = { life: 0.5, maxLife: 0.5, vy: 2.5, grow: size * 0.4, baseOp: 0.9 };
    scn.add(spr);
    bits.push(spr);
    return spr;
  }

  function muzzleFlash(x, y, z) {
    // Small flash sprite + a brief point light so the shot reads at 8+ m.
    const spr = spawnFlame(x, y, z, 1.1);
    spr.material.opacity = 1;
    spr.userData.life = 0.5;
    spr.userData.maxLife = 0.5;
    spr.userData.baseOp = 1;
    const lamp = new THREE.PointLight(0xffc46b, 4, 12);
    lamp.position.set(x, y, z);
    scn.add(lamp);
    bits.push({ isLight: true, light: lamp, life: 0.12, maxLife: 0.12 });
    return spr;
  }

  // Bullet tracer: a thin bright streak from A to B, gone in ~0.15 s.
  function tracer(x1, y1, z1, x2, y2, z2) {
    const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1;
    const len = Math.hypot(dx, dy, dz) || 1;
    const material = new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, len), material);
    mesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
    mesh.lookAt(x2, y2, z2);
    scn.add(mesh);
    bits.push({ isMesh: true, mesh, life: 0.15, maxLife: 0.15 });
    return mesh;
  }

  // Sparks: a burst of tiny bright points that fade in ~0.4 s.
  function sparks(x, y, z, n) {
    const count = n || 8;
    for (let i = 0; i < count; i += 1) {
      const material = new THREE.SpriteMaterial({ map: flame, color: 0xffe9a0, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
      const spr = new THREE.Sprite(material);
      const ang = Math.random() * Math.PI * 2;
      const rad = 0.3 + Math.random() * 0.9;
      spr.position.set(x + Math.cos(ang) * rad, y + (Math.random() - 0.3) * 0.8, z + Math.sin(ang) * rad);
      spr.scale.set(0.35, 0.35, 1);
      spr.userData = { life: 0.4, maxLife: 0.4, vy: 0.5 + Math.random(), grow: 0.1, baseOp: 0.9 };
      scn.add(spr);
      bits.push(spr);
    }
  }

  function update(dt) {
    for (let i = bits.length - 1; i >= 0; i -= 1) {
      const bit = bits[i];
      bit.userData = bit.userData || {};
      if (bit.isLight) {
        bit.life -= dt;
        if (bit.life <= 0) {
          scn.remove(bit.light);
          bits.splice(i, 1);
          continue;
        }
        bit.light.intensity = 6 * (bit.life / bit.maxLife);
        continue;
      }
      if (bit.isMesh) {
        bit.life -= dt;
        if (bit.life <= 0) {
          scn.remove(bit.mesh);
          bit.mesh.material.dispose();
          bits.splice(i, 1);
          continue;
        }
        bit.mesh.material.opacity = 0.9 * (bit.life / bit.maxLife);
        continue;
      }
      bit.userData.life -= dt;
      if (bit.userData.life <= 0) {
        scn.remove(bit);
        bit.material.dispose();
        bits.splice(i, 1);
        continue;
      }
      const frac = bit.userData.life / bit.userData.maxLife;
      bit.material.opacity = (bit.userData.baseOp ?? 0.55) * frac;
      bit.position.y += bit.userData.vy * dt;
      const grow = 1 + (1 - frac) * 0.6;
      bit.scale.multiplyScalar(1 + dt * 0.5 * grow);
    }
  }

  return { spawnSmoke, spawnFlame, muzzleFlash, tracer, sparks, update };
}
