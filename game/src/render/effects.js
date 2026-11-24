// Vice Shores — short-lived combat and driving effects.
//
// Smoke puffs, flames, muzzle flashes, tracers and sparks. Everything is a
// sprite or a thin box that ages out on its own: each effect carries its
// age and lifetime, update() ticks them, and anything past its life is
// removed from the scene and disposed. The list is capped so a long
// firefight can never pile up hundreds of live sprites. Muzzle flashes are
// deliberately small (a third of a metre) so they read as a gunshot, not
// an explosion; tracers are thin additive boxes that fade in a blink.

function makeRadial(inner, outer) {
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

export function createEffects(scene) {
  const smokeTex = makeRadial('rgba(255,255,255,0.9)', 'rgba(255,255,255,0)');
  const fireTex = makeRadial('rgba(255,220,120,1)', 'rgba(255,80,0,0)');
  const live = [];

  function add(item) {
    live.push(item);
    if (live.length > 220) {
      const old = live.shift();
      if (old.mesh) scene.remove(old.mesh);
    }
  }

  // A drifting smoke puff that grows and thins as it rises. Colour and
  // size are the caller's: tyre smoke is pale grey, gun smoke is warm.
  function smoke(x, y, z, opts = {}) {
    const size = opts.size ?? 1.5;
    const life = opts.life ?? 0.9;
    const colour = opts.color ?? 0xcfc8bd;
    const mat = new THREE.SpriteMaterial({
      map: smokeTex, color: colour, opacity: 0.25,
      transparent: true, depthWrite: false,
    });
    const spr = new THREE.Sprite(mat);
    spr.position.set(x, y, z);
    spr.scale.set(size, size, 1);
    scene.add(spr);
    add({
      mesh: spr, age: 0, life,
      tick(dt) {
        this.age += dt;
        spr.position.y += (1.2 + Math.random() * 0.8) * dt;
        const k = 1 + (this.age / life) * 0.8;
        spr.scale.set(size * k, size * k, 1);
        mat.opacity = 0.25 * (1 - this.age / life);
      },
    });
  }

  // A short additive flame, used when a police car takes a hit.
  function flame(x, y, z, size) {
    const mat = new THREE.SpriteMaterial({
      map: fireTex, color: 0xffc46b, opacity: 0.9,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const spr = new THREE.Sprite(mat);
    spr.position.set(x, y, z);
    spr.scale.set(size, size * 1.6, 1);
    scene.add(spr);
    add({
      mesh: spr, age: 0, life: 0.5,
      tick(dt) {
        this.age += dt;
        mat.opacity = 0.9 * (1 - this.age / 0.5);
      },
    });
  }

  // Small muzzle flash at the barrel: a third of a metre across, gone in
  // under a tenth of a second. Small is the point — it marks the shot
  // without hiding the shooter.
  function muzzle(x, y, z) {
    const mat = new THREE.SpriteMaterial({
      map: fireTex, color: 0xffe9a8, opacity: 0.85,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const spr = new THREE.Sprite(mat);
    spr.position.set(x, y, z);
    spr.scale.set(0.35, 0.35, 1);
    scene.add(spr);
    add({
      mesh: spr, age: 0, life: 0.08,
      tick(dt) {
        this.age += dt;
        mat.opacity = 0.85 * (1 - this.age / 0.08);
      },
    });
  }

  // A thin glowing line from muzzle to target, fading fast.
  function tracer(from, to) {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const len = a.distanceTo(b);
    const geo = new THREE.BoxGeometry(0.03, 0.03, len);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffe9a0, transparent: true, opacity: 0.35,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(a).lerp(b, 0.5);
    mesh.lookAt(b);
    scene.add(mesh);
    add({
      mesh, age: 0, life: 0.15,
      tick(dt) {
        this.age += dt;
        mat.opacity = 0.35 * (1 - this.age / 0.15);
      },
    });
  }

  // A burst of bright sparks that fly out and fade.
  function sparks(x, y, z, n) {
    for (let i = 0; i < n; i++) {
      const mat = new THREE.SpriteMaterial({
        map: fireTex, color: 0xffc46b, opacity: 1,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const spr = new THREE.Sprite(mat);
      spr.position.set(x, y, z);
      spr.scale.set(0.35, 0.35, 1);
      scene.add(spr);
      const vx = (Math.random() - 0.5) * 6;
      const vy = Math.random() * 4 + 1;
      const vz = (Math.random() - 0.5) * 6;
      add({
        mesh: spr, age: 0, life: 0.4,
        tick(dt) {
          this.age += dt;
          spr.position.x += vx * dt;
          spr.position.y += vy * dt;
          spr.position.z += vz * dt;
          mat.opacity = 1 - this.age / 0.4;
        },
      });
    }
  }

  // Tick every live effect; drop the finished ones.
  function update(dt) {
    for (let i = live.length - 1; i >= 0; i--) {
      const item = live[i];
      item.tick(dt);
      if (item.age >= item.life) {
        scene.remove(item.mesh);
        if (item.mesh.material) item.mesh.material.dispose();
        live.splice(i, 1);
      }
    }
  }

  return { smoke, flame, muzzle, tracer, sparks, update };
}
