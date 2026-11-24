// Weather: light rain streaks, splashes, and a wet-road sheen over the plaza.
const THREE = window.THREE;
export class Weather {
  constructor(scene) {
    this.scene = scene; this.on = false; this.drops = null; this.splashes = [];
    const N = 1400;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = -160 + Math.random() * 320;
      pos[i * 3 + 1] = Math.random() * 40;
      pos[i * 3 + 2] = -160 + Math.random() * 320;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const sc = document.createElement('canvas'); sc.width = 8; sc.height = 32;
    const sg = sc.getContext('2d');
    const sgr = sg.createLinearGradient(0, 0, 0, 32);
    sgr.addColorStop(0, 'rgba(200,220,255,0)'); sgr.addColorStop(0.5, 'rgba(200,220,255,0.9)'); sgr.addColorStop(1, 'rgba(200,220,255,0)');
    sg.fillStyle = sgr; sg.fillRect(2, 0, 4, 32);
    const streakTex = new THREE.CanvasTexture(sc);
    this.drops = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xaac8e8, size: 1.1, map: streakTex, transparent: true, opacity: 0.9, depthWrite: false }));
    this.drops.visible = false;
    scene.add(this.drops);
    const sheen = new THREE.Mesh(new THREE.PlaneGeometry(340, 340), new THREE.MeshStandardMaterial({ color: 0x1a2436, metalness: 0.85, roughness: 0.12, transparent: true, opacity: 0.22 }));
    sheen.rotation.x = -Math.PI / 2; sheen.position.set(0, 0.1, 0);
    sheen.visible = false; scene.add(sheen);
    this.sheen = sheen;
    const cv = document.createElement('canvas'); cv.width = 32; cv.height = 32;
    const g = cv.getContext('2d');
    g.strokeStyle = 'rgba(200,220,255,0.8)'; g.lineWidth = 2;
    g.beginPath(); g.arc(16, 16, 10, 0, Math.PI * 2); g.stroke();
    this.splashTex = new THREE.CanvasTexture(cv);
  }
  setRain(on) {
    this.on = on;
    this.drops.visible = on;
    this.sheen.visible = on;
  }
  update(dt) {
    if (!this.on) return;
    const p = this.drops.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let y = p.getY(i) - dt * 34;
      if (y < 0) {
        y = 30 + Math.random() * 10;
        p.setX(i, -160 + Math.random() * 320);
        p.setZ(i, -160 + Math.random() * 320);
        if (Math.random() < 0.1) {
          const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.splashTex, transparent: true, opacity: 0.7, depthWrite: false }));
          sp.position.set(p.getX(i), 0.15, p.getZ(i)); sp.scale.set(0.9, 0.9, 1);
          this.scene.add(sp);
          this.splashes.push({ s: sp, life: 0.4 });
        }
      }
      p.setY(i, y);
    }
    p.needsUpdate = true;
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const sp = this.splashes[i]; sp.life -= dt;
      sp.s.material.opacity = Math.max(0, sp.life / 0.4) * 0.7;
      if (sp.life <= 0) { this.scene.remove(sp.s); this.splashes.splice(i, 1); }
    }
  }
}
