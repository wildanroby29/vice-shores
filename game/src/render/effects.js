// Transient effects for Vice Shores: smoke, muzzle flashes, tracers and
// sparks. Everything here is a sprite or a thin stretched box that lives
// for a fraction of a second and then removes itself. The smoke is kept
// small and faint on purpose — the old big white sprites read as a huge
// haze swallowing the hero car, so every puff is capped at car length and
// at 0.25 opacity.

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

  function muzzle(x, y, z) {
    flame(x, y, z, 1.1);
    const light = new THREE.PointLight(0xffc46b, 4, 12);
    light.position.set(x, y, z);
    scene.add(light);
    add({
      mesh: light, age: 0, life: 0.12,
      tick(dt) {
        this.age += dt;
        light.intensity = 4 * (1 - this.age / 0.12);
      },
    });
  }

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
