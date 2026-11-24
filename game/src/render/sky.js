// Sky: gradient sunset dome, sun disc, soft clouds, fog matched to the horizon.
const THREE = window.THREE;
export function makeSky(scene) {
  const geo = new THREE.SphereGeometry(900, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x2e1a52) }, mid: { value: new THREE.Color(0xff7a3d) }, low: { value: new THREE.Color(0xffd9a0) } },
    vertexShader: 'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 low; void main(){ float h=normalize(vP).y; vec3 c=mix(low,mid,smoothstep(-0.05,0.22,h)); c=mix(c,top,smoothstep(0.18,0.65,h)); gl_FragColor=vec4(c,1.0); }',
  });
  const dome = new THREE.Mesh(geo, mat);
  scene.add(dome);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0, fog: false });
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(46, 32), sunMat);
  sunDisc.position.set(520, 330, 280);
  sunDisc.lookAt(0, 0, 0);
  scene.add(sunDisc);
  const haloMat = new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.28, fog: false });
  const halo = new THREE.Mesh(new THREE.CircleGeometry(90, 32), haloMat);
  halo.position.set(522, 332, 282);
  halo.lookAt(0, 0, 0);
  scene.add(halo);
  const clouds = [];
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64;
  const g = cv.getContext('2d');
  const rg = g.createRadialGradient(64, 32, 4, 64, 32, 60);
  rg.addColorStop(0, 'rgba(255,220,190,0.85)'); rg.addColorStop(1, 'rgba(255,220,190,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 128, 64);
  const ctex = new THREE.CanvasTexture(cv);
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(180 + (i % 3) * 60, 46), new THREE.MeshBasicMaterial({ map: ctex, transparent: true, opacity: 0.5, fog: false, depthWrite: false }));
    m.position.set(-500 + i * 110, 260 + (i % 4) * 40, -420 + (i % 5) * 160);
    m.lookAt(0, 120, 0);
    scene.add(m); clouds.push(m);
  }
  scene.fog = new THREE.Fog(0xf2a35e, 320, 1100);
  return { dome, sunDisc, halo, clouds, mat };
}
export function setSkyNight(sky, night) {
  sky.mat.uniforms.top.value.setHex(night ? 0x0a0e24 : 0x2e1a52);
  sky.mat.uniforms.mid.value.setHex(night ? 0x3a2a5a : 0xff7a3d);
  sky.mat.uniforms.low.value.setHex(night ? 0x8a5a7a : 0xffd9a0);
  sky.sunDisc.material.color.setHex(night ? 0xdde4ff : 0xfff2c0);
  sky.halo.material.opacity = night ? 0.1 : 0.28;
}
