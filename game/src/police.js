// Police: 5-star wanted, named units, roadblocks, helicopter, spike strips, radio lines.
const THREE = window.THREE;
import { makeCar } from './vehicles.js';
export const UNITS = [
  { call: 'KITE-1', role: 'MARKSMAN', line: 'KITE-1 on the rooftops — eyes on the GT.' },
  { call: 'MARLIN-3', role: 'SHORE WATCH', line: 'MARLIN-3 holding the beach road.' },
  { call: 'CORAL-48', role: 'PURSUIT', line: 'CORAL-48 in pursuit — keep the pressure on.' },
  { call: 'TIDE-7', role: 'SPOTLIGHT', line: 'TIDE-7 has the spotlight — do not lose him.' },
  { call: 'REEF-22', role: 'FLANKING', line: 'REEF-22 flanking from the east.' },
  { call: 'SURGE-9', role: 'RAMMING', line: 'SURGE-9 moving in to ram — clear the lane.' },
];
export const RADIO = [
  'All units, the GT is on Ocean Drive — box him in.',
  'Shots fired in the Plaza market — all units respond.',
  'Suspect is armed and mobile. Do not approach alone.',
  'Air support is overhead. Keep him in the light.',
  'Roadblock on the Marina causeway. Nobody gets through.',
];
export class Police {
  constructor(scene, effects) {
    this.scene = scene; this.effects = effects;
    this.wanted = 0; this.cars = []; this.heli = null; this.beam = null; this.disc = null;
    this.roadblocks = []; this.spikes = []; this.heat = 0; this.radioIdx = 0;
    this.heliBody = null;
  }
  setWanted(n) { this.wanted = Math.max(0, Math.min(5, n)); }
  addHeat(n) { this.heat += n; if (this.heat >= 25) { this.setWanted(this.wanted + 1); this.heat = 0; } }
  activeUnits() { return UNITS.slice(0, Math.min(6, 2 + this.wanted)); }
  radioLine() { return RADIO[this.radioIdx % RADIO.length]; }
  spawnCar(pos) {
    const car = makeCar('cruiser');
    car.position.copy(pos); car.position.y = 0;
    this.scene.add(car); this.cars.push(car);
    return car;
  }
  ensureCars(playerPos) {
    const want = this.wanted === 0 ? 0 : 2 + this.wanted;
    while (this.cars.length < want) {
      const a = Math.random() * Math.PI * 2;
      this.spawnCar(new THREE.Vector3(playerPos.x + Math.cos(a) * 30, 0, playerPos.z + Math.sin(a) * 30));
    }
    while (this.cars.length > want) {
      const c = this.cars.pop(); this.scene.remove(c);
    }
  }
  ensureHeli(playerPos) {
    if (this.wanted >= 4 && !this.heli) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 5.2), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, metalness: 0.5, roughness: 0.3 }));
      body.castShadow = true; g.add(body);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.5, 5.24), new THREE.MeshStandardMaterial({ color: 0x2a6ad8, metalness: 0.5, roughness: 0.35 }));
      stripe.position.y = 0.2; g.add(stripe);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 1.6), new THREE.MeshStandardMaterial({ color: 0x18222e, metalness: 0.9, roughness: 0.08 }));
      glass.position.set(0, 0.2, 2.0); g.add(glass);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 3.4), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, metalness: 0.5, roughness: 0.3 }));
      tail.position.set(0, 0.3, -4.2); g.add(tail);
      const skid1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 4), new THREE.MeshStandardMaterial({ color: 0x222222 }));
      skid1.position.set(-0.9, -1.0, 0); g.add(skid1);
      const skid2 = skid1.clone(); skid2.position.x = 0.9; g.add(skid2);
      this.disc = this.effects.rotorDisc(new THREE.Vector3(0, 1.1, 0));
      g.add(this.disc);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffe9a8, emissiveIntensity: 2 }));
      lamp.position.set(0, -0.9, 1.4); g.add(lamp);
      this.heli = g; this.heliBody = g;
      this.scene.add(g);
      this.beam = this.effects.beam(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0));
    } else if (this.wanted < 4 && this.heli) {
      this.scene.remove(this.heli);
      if (this.beam) { this.scene.remove(this.beam.cone); this.scene.remove(this.beam.ell); this.beam = null; }
      this.heli = null; this.disc = null;
    }
  }
  roadblock(playerPos, dir) {
    if (this.wanted < 3 || this.roadblocks.length > 0) return;
    const g = new THREE.Group();
    for (const s of [-1, 1]) {
      const c = this.spawnCar(new THREE.Vector3(0, 0, s * 4));
      c.rotation.y = Math.PI / 2;
      g.add(c);
      this.roadblocks.push(c);
    }
    const barrier = new THREE.Mesh(new THREE.BoxGeometry(10, 1, 0.4), new THREE.MeshStandardMaterial({ color: 0xff8a3d, roughness: 0.6 }));
    barrier.position.set(0, 0.5, 0); g.add(barrier);
    g.position.copy(playerPos).addScaledVector(dir, 34);
    g.position.y = 0;
    this.scene.add(g);
  }
  spikeStrip(pos) {
    const g = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.7, 4), new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.3 }));
      spike.position.set(-2 + i, 0.35, 0); g.add(spike);
    }
    g.position.copy(pos); this.scene.add(g);
    this.spikes.push(g);
  }
  update(dt, playerPos, playerDir, time, frozen) {
    if (!frozen) {
      this.ensureCars(playerPos);
      this.ensureHeli(playerPos);
      for (const car of this.cars) {
        const dx = playerPos.x - car.position.x, dz = playerPos.z - car.position.z;
        const d = Math.hypot(dx, dz);
        if (d > 2) {
          const ang = Math.atan2(dx, dz);
          car.rotation.y += (ang - car.rotation.y) * Math.min(1, dt * 1.6);
          car.position.x += Math.sin(car.rotation.y) * 16 * dt;
          car.position.z += Math.cos(car.rotation.y) * 16 * dt;
        }
      }
      if (this.heli) {
        this.heli.position.set(playerPos.x + 6, 34, playerPos.z - 8);
        this.heli.rotation.y = Math.atan2(playerPos.x - this.heli.position.x, playerPos.z - this.heli.position.z);
        if (this.disc) this.disc.rotation.z += dt * 22;
        if (this.beam) {
          const from = this.heli.position.clone(); from.y -= 1;
          const to = playerPos.clone(); to.y = 0.1;
          this.beam.cone.position.copy(from).lerp(to, 0.5);
          this.beam.ell.position.set(to.x, 0.12, to.z);
        }
      }
    }
    for (const car of this.cars) {
      if (car.userData.flash) {
        const f = car.userData.flash; f.t += dt * 6;
        const on = Math.sin(f.t) > 0;
        f.r.material.emissiveIntensity = on ? 4 : 0.4;
        f.b.material.emissiveIntensity = on ? 0.4 : 4;
        f.pl.intensity = on ? 5 : 0; f.pl2.intensity = on ? 0 : 5;
      }
    }
    if (this.wanted > 0 && !frozen) this.radioIdx = Math.floor(time / 9) % RADIO.length;
  }
}
