// Effects: muzzle flash, tracers, sparks, smoke, halos, heli beam, rotor disc.
const THREE = window.THREE;
function glowTex(inner, outer) {
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64;
  const g = cv.getContext('2d');
  const rg = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  rg.addColorStop(0, inner); rg.addColorStop(1, outer);
  g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(cv);
}
const flashTex = glowTex('rgba(255,240,180,1)', 'rgba(255,140,40,0)');
const smokeTex = glowTex('rgba(200,200,200,0.55)', 'rgba(120,120,120,0)');
const haloTex = glowTex('rgba(255,230,160,0.9)', 'rgba(255,180,80,0)');
export class Effects {
  constructor(scene) {
    this.scene = scene; this.items = [];
  }
  add(sprite, life) { this.scene.add(sprite); this.items.push({ s: sprite, life, max: life }); }
  flash(pos) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, blending: THREE.AdditiveBlending, depthWrite: false }));
    sp.position.copy(pos); sp.scale.set(2.8, 2.8, 1);
    this.add(sp, 0.22);
  }
  tracer(a, b) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const geo = new THREE.CylinderGeometry(0.08, 0.08, len, 5, 1, true);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.copy(a).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    this.add(m, 0.25);
  }
  sparks(pos) {
    for (let i = 0; i < 7; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, blending: THREE.AdditiveBlending, depthWrite: false }));
      sp.position.set(pos.x + (Math.random() - 0.5), pos.y + Math.random() * 0.5, pos.z + (Math.random() - 0.5));
      sp.scale.set(0.5, 0.5, 1);
      sp.userData.v = new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 4, (Math.random() - 0.5) * 6);
      this.add(sp, 0.35);
    }
  }
  smoke(pos, big) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, opacity: 0.6, depthWrite: false }));
    sp.position.copy(pos); sp.position.y += 0.6;
    const s = big ? 3.2 : 1.4; sp.scale.set(s, s, 1);
    sp.userData.v = new THREE.Vector3(0, 1.2, 0);
    this.add(sp, 1.1);
  }
  halo(pos, size, color) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55 }));
    sp.position.copy(pos); sp.scale.set(size, size, 1);
    this.scene.add(sp);
    return sp;
  }
  beam(from, to) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    const cone = new THREE.Mesh(new THREE.ConeGeometry(3.2, len, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    cone.position.copy(from).addScaledVector(dir, 0.5);
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize().negate());
    this.scene.add(cone);
    const ell = new THREE.Mesh(new THREE.CircleGeometry(3.4, 24), new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false }));
    ell.rotation.x = -Math.PI / 2; ell.position.set(to.x, 0.12, to.z);
    this.scene.add(ell);
    return { cone, ell };
  }
  rotorDisc(pos) {
    const d = new THREE.Mesh(new THREE.CircleGeometry(4.4, 24), new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }));
    d.rotation.x = -Math.PI / 2; d.position.copy(pos);
    this.scene.add(d);
    return d;
  }
  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.life -= dt;
      const f = Math.max(0, it.life / it.max);
      if (it.s.userData.v) it.s.position.addScaledVector(it.s.userData.v, dt);
      if (it.s.material) it.s.material.opacity = f * (it.s.userData.baseOp ?? 0.9);
      if (it.s.scale) { const s = it.s.scale.x * (1 + dt * 0.6); it.s.scale.set(s, s, 1); }
      if (it.life <= 0) { this.scene.remove(it.s); this.items.splice(i, 1); }
    }
  }
}
