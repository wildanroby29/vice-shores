// Combat: 4 weapons with ammo, muzzle flash, tracers, downed NPCs.
const THREE = window.THREE;
export const WEAPONS = [
  { name: 'Pistol', key: '1', damage: 34, ammo: 24, max: 24, rate: 0.28, range: 60 },
  { name: 'SMG', key: '2', damage: 18, ammo: 90, max: 90, rate: 0.09, range: 55 },
  { name: 'Shotgun', key: '3', damage: 70, ammo: 12, max: 12, rate: 0.8, range: 26 },
  { name: 'Rifle', key: '4', damage: 55, ammo: 60, max: 60, rate: 0.16, range: 90 },
];
export class Combat {
  constructor(scene, effects) {
    this.scene = scene; this.effects = effects;
    this.slot = 0; this.cool = 0; this.shots = 0;
    this.ammo = WEAPONS.map(w => w.ammo);
  }
  weapon() { return WEAPONS[this.slot]; }
  switch(i) { if (i >= 0 && i < WEAPONS.length) this.slot = i; }
  canShoot() { return this.cool <= 0 && this.ammo[this.slot] > 0; }
  update(dt) { if (this.cool > 0) this.cool -= dt; }
  shoot(from, dir, targets) {
    if (!this.canShoot()) return null;
    const w = this.weapon();
    this.cool = w.rate; this.ammo[this.slot] -= 1; this.shots += 1;
    const muzzle = from.clone().addScaledVector(dir, 1.2); muzzle.y += 0.1;
    this.effects.flash(muzzle);
    const end = from.clone().addScaledVector(dir, w.range);
    let hit = null; let best = w.range;
    for (const t of targets) {
      if (!t || t.userData.down) continue;
      const to = new THREE.Vector3().subVectors(t.position, from);
      const along = to.dot(dir);
      if (along < 0 || along > w.range) continue;
      const perp = to.clone().addScaledVector(dir, -along).length();
      if (perp < 1.1 && along < best) { best = along; hit = t; }
    }
    if (hit) {
      end.copy(from).addScaledVector(dir, best);
      this.effects.sparks(end);
      this.effects.tracer(muzzle, end);
      this.down(hit);
      return { hit, damage: w.damage };
    }
    this.effects.tracer(muzzle, end);
    return { hit: null, damage: 0 };
  }
  down(person) {
    if (!person || person.userData.down) return;
    person.userData.down = true;
    person.rotation.x = -Math.PI / 2;
    person.position.y = 0.25;
    person.userData.parts.arms[0].rotation.x = 0;
    person.userData.parts.arms[1].rotation.x = 0;
  }
}
