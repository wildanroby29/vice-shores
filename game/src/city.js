// city.js — Vice Shores: builds the whole 3D city from primitives. No loaded
// models, no textures from files: window glass and neon signs are drawn on
// canvases at boot, and every building, palm, road and prop is a box, cylinder
// or plane placed by a seeded random so the city is the same every run.
(function () {
  var VS = window.VS;
  var T = THREE;

  var PALETTE = [0xe8b4b8, 0xf4d35e, 0xee964b, 0x5aa9e6, 0x7bd389, 0xf4845f, 0xc77dff, 0xffafcc, 0xa0c4ff, 0xffd6a5];
  var SIGNS = [
    ['HOTEL PALMA', '#ffd23e'], ['CASINO AZUL', '#7df9d6'], ['PIER 9', '#ff7ad9'],
    ['24H TACOS', '#ffd23e'], ['VICE SHORES', '#ff9d5c'], ['SHORE BANK', '#7df9d6'],
    ['DOCKSIDE', '#ffd23e'], ['NEON MOTEL', '#ff7ad9'], ['CORAL BAR', '#7df9d6'],
    ['SUNSET GYM', '#ff9d5c'], ['PALM HOTEL', '#ffd23e'], ['TIDE BOWL', '#7df9d6'],
  ];

  function windowCanvas(base, litRatio) {
    var c = document.createElement('canvas');
    c.width = 128; c.height = 256;
    var g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 128, 256);
    var grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, 'rgba(255,255,255,0.10)');
    grad.addColorStop(1, 'rgba(0,0,0,0.25)');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 256);
    for (var y = 0; y < 12; y++) {
      for (var x = 0; x < 6; x++) {
        var lit = VS.rng() < litRatio;
        g.fillStyle = lit ? (VS.rng() < 0.7 ? '#ffd98a' : '#9fe8ff') : '#2a2740';
        g.fillRect(10 + x * 19, 12 + y * 20, 13, 12);
      }
    }
    return c;
  }

  function signTexture(text, fg) {
    var c = document.createElement('canvas');
    c.width = 512; c.height = 96;
    var g = c.getContext('2d');
    g.fillStyle = '#120e1e'; g.fillRect(0, 0, 512, 96);
    g.strokeStyle = fg; g.lineWidth = 4; g.strokeRect(4, 4, 504, 88);
    g.font = 'bold 52px "Segoe UI", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = fg; g.shadowBlur = 18;
    g.fillStyle = fg; g.fillText(text, 256, 50);
    return c;
  }

  function skyTexture() {
    var c = document.createElement('canvas');
    c.width = 4; c.height = 512;
    var g = c.getContext('2d');
    var grad = g.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#241640');
    grad.addColorStop(0.45, '#6b2a5e');
    grad.addColorStop(0.75, '#ff7e5f');
    grad.addColorStop(1, '#ffc46b');
    g.fillStyle = grad; g.fillRect(0, 0, 4, 512);
    return c;
  }

  function roadTexture() {
    var c = document.createElement('canvas');
    c.width = 64; c.height = 256;
    var g = c.getContext('2d');
    g.fillStyle = '#2c2838'; g.fillRect(0, 0, 64, 256);
    g.fillStyle = '#3a3550'; g.fillRect(0, 0, 4, 256); g.fillRect(60, 0, 4, 256);
    g.fillStyle = '#c9a227';
    for (var y = 0; y < 256; y += 64) g.fillRect(31, y + 10, 2, 30);
    return c;
  }

  var windowTexes = [];
  function buildingMaterials(color, w, h) {
    if (!windowTexes.length) {
      var bases = ['#5a5468', '#4a4460', '#655a70', '#3f4a63'];
      for (var i = 0; i < bases.length; i++) {
        var t = new T.CanvasTexture(windowCanvas(bases[i], 0.62));
        t.wrapS = t.wrapT = T.RepeatWrapping;
        t.colorSpace = T.SRGBColorSpace;
        windowTexes.push(t);
      }
    }
    var tex = windowTexes[Math.floor(VS.rng() * windowTexes.length)].clone();
    tex.needsUpdate = true;
    tex.repeat.set(Math.max(1, Math.round(w / 18)), Math.max(1, Math.round(h / 22)));
    var side = new T.MeshLambertMaterial({ map: tex });
    var roof = new T.MeshLambertMaterial({ color: 0x2c2838 });
    var tint = new T.MeshLambertMaterial({ color: color });
    return { side: side, roof: roof, tint: tint };
  }

  function addBox(scene, w, h, d, mat, x, y, z, castShadow) {
    var m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = !!castShadow;
    m.receiveShadow = true;
    scene.add(m);
    return m;
  }

  function makePalm(scene, x, z, s) {
    var g = new T.Group();
    var trunkMat = new T.MeshLambertMaterial({ color: 0x8a5a3b });
    var trunk = new T.Mesh(new T.CylinderGeometry(0.22 * s, 0.38 * s, 6 * s, 7), trunkMat);
    trunk.position.y = 3 * s; trunk.castShadow = true; g.add(trunk);
    var frondMat = new T.MeshLambertMaterial({ color: 0x2f9e44 });
    for (var i = 0; i < 6; i++) {
      var frond = new T.Mesh(new T.ConeGeometry(0.7 * s, 3.4 * s, 4), frondMat);
      var a = (i / 6) * Math.PI * 2;
      frond.position.set(Math.cos(a) * 1.3 * s, 6.2 * s, Math.sin(a) * 1.3 * s);
      frond.rotation.z = Math.cos(a) * 1.1;
      frond.rotation.x = -Math.sin(a) * 1.1;
      frond.scale.set(1, 1, 0.28);
      frond.castShadow = true;
      g.add(frond);
    }
    var nut = new T.Mesh(new T.SphereGeometry(0.32 * s, 8, 6), new T.MeshLambertMaterial({ color: 0x6b4423 }));
    nut.position.y = 5.9 * s; g.add(nut);
    g.position.set(x, 0, z);
    scene.add(g);
    return g;
  }

  function makeSign(scene, text, fg, w, x, y, z, rotY) {
    var tex = new T.CanvasTexture(signTexture(text, fg));
    tex.colorSpace = T.SRGBColorSpace;
    var m = new T.Mesh(new T.PlaneGeometry(w, w * 96 / 512),
      new T.MeshBasicMaterial({ map: tex }));
    m.position.set(x, y, z);
    m.rotation.y = rotY || 0;
    scene.add(m);
    return m;
  }

  VS.buildCity = function () {
    var scene = VS.world.scene;
    var CFG = VS.CFG;
    VS.world.colliders = [];
    VS.world.roadLines = [];

    // sky, fog, lights
    var sky = new T.CanvasTexture(skyTexture());
    sky.colorSpace = T.SRGBColorSpace;
    scene.background = sky;
    scene.fog = new T.Fog(0x5a3a68, 190, 540);
    var hemi = new T.HemisphereLight(0xffd9c0, 0x3a2b5c, 1.15);
    scene.add(hemi);
    var sun = new T.DirectionalLight(0xffb36b, 1.6);
    sun.position.set(-140, 110, 80);
    sun.castShadow = true;
    var shadowSize = VS.state.shotMode ? 1024 : 2048;
    sun.shadow.mapSize.set(shadowSize, shadowSize);
    sun.shadow.camera.left = -180; sun.shadow.camera.right = 180;
    sun.shadow.camera.top = 180; sun.shadow.camera.bottom = -180;
    sun.shadow.camera.far = 500;
    scene.add(sun);
    var fill = new T.DirectionalLight(0x7a6cff, 0.35);
    fill.position.set(120, 60, -100);
    scene.add(fill);

    // ground
    var ground = new T.Mesh(new T.PlaneGeometry(760, 760),
      new T.MeshLambertMaterial({ color: 0x4a4560 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, 60);
    ground.receiveShadow = true;
    scene.add(ground);

    // ocean + beach + foam
    var ocean = new T.Mesh(new T.PlaneGeometry(760, 280),
      new T.MeshLambertMaterial({ color: 0x14608f }));
    ocean.rotation.x = -Math.PI / 2; ocean.position.set(0, 0.05, CFG.oceanZ + 140);
    scene.add(ocean);
    var beach = new T.Mesh(new T.PlaneGeometry(760, CFG.oceanZ - CFG.beachZ),
      new T.MeshLambertMaterial({ color: 0xd9b380 }));
    beach.rotation.x = -Math.PI / 2; beach.position.set(0, 0.04, (CFG.beachZ + CFG.oceanZ) / 2);
    beach.receiveShadow = true;
    scene.add(beach);
    var foam = new T.Mesh(new T.PlaneGeometry(760, 3),
      new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }));
    foam.rotation.x = -Math.PI / 2; foam.position.set(0, 0.08, CFG.oceanZ + 1);
    scene.add(foam);
    VS.world.foam = foam;

    // river along the east edge + bridge
    var river = new T.Mesh(new T.PlaneGeometry(44, 330),
      new T.MeshLambertMaterial({ color: 0x14608f }));
    river.rotation.x = -Math.PI / 2; river.position.set(CFG.riverX + 22, 0.05, 0);
    scene.add(river);
    var bridge = addBox(scene, 64, 1.2, 14, new T.MeshLambertMaterial({ color: 0x6b6478 }), 168, 1.4, 0, true);
    addBox(scene, 64, 1.1, 0.8, new T.MeshLambertMaterial({ color: 0xffd23e }), 168, 2.4, -6.4, false);
    addBox(scene, 64, 1.1, 0.8, new T.MeshLambertMaterial({ color: 0xffd23e }), 168, 2.4, 6.4, false);
    VS.world.bridge = bridge;

    // roads (grid) with dashed centre lines, and block sidewalks
    var roadTex = new T.CanvasTexture(roadTexture());
    roadTex.wrapS = roadTex.wrapT = T.RepeatWrapping;
    roadTex.colorSpace = T.SRGBColorSpace;
    var roadMat = new T.MeshLambertMaterial({ map: roadTex });
    var lines = [];
    for (var i = -3; i <= 3; i++) lines.push(i * CFG.roadStep);
    lines.forEach(function (c) {
      var v = new T.Mesh(new T.PlaneGeometry(CFG.roadWidth, 330), roadMat.clone());
      v.material.map = roadTex.clone();
      v.material.map.needsUpdate = true;
      v.material.map.repeat.set(1, 10);
      v.rotation.x = -Math.PI / 2; v.rotation.z = Math.PI / 2;
      v.position.set(c, 0.06, 0); v.receiveShadow = true;
      scene.add(v);
      VS.world.roadLines.push({ x1: c, z1: -165, x2: c, z2: 165 });
      var h = new T.Mesh(new T.PlaneGeometry(CFG.roadWidth, 330), roadMat.clone());
      h.material.map = roadTex.clone();
      h.material.map.needsUpdate = true;
      h.material.map.repeat.set(1, 10);
      h.rotation.x = -Math.PI / 2;
      h.position.set(0, 0.06, c); h.receiveShadow = true;
      scene.add(h);
      VS.world.roadLines.push({ x1: -165, z1: c, x2: 165, z2: c });
    });
    // beachfront boulevard (wider, palm-lined)
    var blvd = new T.Mesh(new T.PlaneGeometry(330, 16),
      new T.MeshLambertMaterial({ color: 0x241f33 }));
    blvd.rotation.x = -Math.PI / 2; blvd.position.set(0, 0.07, 142);
    blvd.receiveShadow = true;
    scene.add(blvd);
    VS.world.roadLines.push({ x1: -165, z1: 142, x2: 165, z2: 142 });

    // parks and parking lots occupy fixed blocks (block centres sit between roads)
    var parks = [{ x: -60, z: -60 }, { x: 60, z: 60 }];
    var lots = [{ x: -20, z: 100 }, { x: 100, z: -60 }];
    function isSpecial(gx, gz) {
      var bx = gx * 40 + 20, bz = gz * 40 + 20;
      for (var i = 0; i < parks.length; i++) if (parks[i].x === bx && parks[i].z === bz) return 'park';
      for (var j = 0; j < lots.length; j++) if (lots[j].x === bx && lots[j].z === bz) return 'lot';
      if (bx === -20 && bz === -100) return 'bank';
      return '';
    }
    parks.forEach(function (p) {
      var grass = new T.Mesh(new T.PlaneGeometry(30, 30),
        new T.MeshLambertMaterial({ color: 0x3f7a4a }));
      grass.rotation.x = -Math.PI / 2; grass.position.set(p.x, 0.09, p.z);
      grass.receiveShadow = true;
      scene.add(grass);
      makePalm(scene, p.x - 8, p.z - 8, 1.1);
      makePalm(scene, p.x + 9, p.z + 7, 0.95);
      makePalm(scene, p.x + 7, p.z - 9, 1.05);
      var pond = new T.Mesh(new T.CircleGeometry(5, 20),
        new T.MeshLambertMaterial({ color: 0x2a7a9e }));
      pond.rotation.x = -Math.PI / 2; pond.position.set(p.x, 0.1, p.z);
      scene.add(pond);
    });
    lots.forEach(function (p) {
      var asphalt = new T.Mesh(new T.PlaneGeometry(30, 30),
        new T.MeshLambertMaterial({ color: 0x2a2733 }));
      asphalt.rotation.x = -Math.PI / 2; asphalt.position.set(p.x, 0.09, p.z);
      scene.add(asphalt);
      for (var k = -2; k <= 2; k++) {
        var line = new T.Mesh(new T.PlaneGeometry(0.5, 8),
          new T.MeshBasicMaterial({ color: 0xdddddd }));
        line.rotation.x = -Math.PI / 2;
        line.position.set(p.x + k * 5, 0.12, p.z);
        scene.add(line);
      }
    });

    // buildings, one or two per block
    var signIdx = 0;
    for (var gx = -3; gx <= 3; gx++) {
      for (var gz = -3; gz <= 3; gz++) {
        if (gz === 3) continue; // beachfront row stays open (promenade + boulevard)
        var cx = gx * CFG.roadStep + 20, cz = gz * CFG.roadStep + 20;
        var kind = isSpecial(gx, gz);
        if (kind === 'park' || kind === 'lot' || kind === 'bank') continue;
        var n = VS.rng() < 0.45 ? 2 : 1;
        for (var b = 0; b < n; b++) {
          var w = n === 2 ? 12 : VS.rand(17, 24);
          var d = n === 2 ? 12 : VS.rand(17, 24);
          var h = VS.rand(8, 38);
          var bx = cx + (n === 2 ? (b === 0 ? -7 : 7) : 0);
          var bz = cz + (n === 2 ? (b === 0 ? -7 : 7) : 0);
          var color = VS.pick(PALETTE);
          var mats = buildingMaterials(color, w, h);
          var mesh = new T.Mesh(new T.BoxGeometry(w, h, d),
            [mats.side, mats.side, mats.roof, mats.roof, mats.side, mats.side]);
          mesh.position.set(bx, h / 2, bz);
          mesh.castShadow = true; mesh.receiveShadow = true;
          scene.add(mesh);
          VS.world.colliders.push({ minX: bx - w / 2, maxX: bx + w / 2, minZ: bz - d / 2, maxZ: bz + d / 2 });
          if (signIdx < SIGNS.length && VS.rng() < 0.55 && h > 14) {
            var s = SIGNS[signIdx++];
            makeSign(scene, s[0], s[1], Math.min(w * 0.9, 16), bx, Math.min(h - 3, 26), bz + d / 2 + 0.15, 0);
          }
        }
        // sidewalk slab under the block
        var slab = new T.Mesh(new T.PlaneGeometry(30, 30),
          new T.MeshLambertMaterial({ color: 0x4a4560 }));
        slab.rotation.x = -Math.PI / 2; slab.position.set(cx, 0.05, cz);
        slab.receiveShadow = true;
        scene.add(slab);
      }
    }

    // landmark: safehouse (west, near the beach)
    (function () {
      var x = VS.world.safehouse.x, z = VS.world.safehouse.z;
      var house = addBox(scene, 13, 6, 10, new T.MeshLambertMaterial({ color: 0x2ec4b6 }), x, 3, z, true);
      addBox(scene, 14, 0.8, 11, new T.MeshLambertMaterial({ color: 0x8a5a3b }), x, 6.4, z, true);
      makeSign(scene, 'SAFEHOUSE', '#7df9d6', 10, x, 8.6, z + 5.2, 0);
      VS.world.colliders.push({ minX: x - 6.5, maxX: x + 6.5, minZ: z - 5, maxZ: z + 5 });
    })();

    // landmark: Dockside Customs garage (east of the pier road)
    (function () {
      var x = VS.world.garage.x, z = VS.world.garage.z;
      addBox(scene, 22, 9, 14, new T.MeshLambertMaterial({ color: 0x5a5468 }), x, 4.5, z, true);
      addBox(scene, 10, 6, 0.6, new T.MeshLambertMaterial({ color: 0x191627 }), x - 4, 3, z + 7.2, false);
      makeSign(scene, 'DOCKSIDE CUSTOMS', '#ffd23e', 18, x, 11, z + 7.2, 0);
      VS.world.colliders.push({ minX: x - 11, maxX: x + 11, minZ: z - 7, maxZ: z + 7 });
    })();

    // landmark: Shore Bank (north centre, pillared)
    (function () {
      var x = VS.world.bank.x, z = VS.world.bank.z;
      addBox(scene, 24, 12, 16, new T.MeshLambertMaterial({ color: 0xd9cfc0 }), x, 6, z, true);
      for (var k = -1; k <= 1; k++) {
        var col = new T.Mesh(new T.CylinderGeometry(0.9, 0.9, 9, 10),
          new T.MeshLambertMaterial({ color: 0xefe8d8 }));
        col.position.set(x + k * 8, 4.5, z + 8.6);
        col.castShadow = true;
        scene.add(col);
      }
      makeSign(scene, 'SHORE BANK', '#7df9d6', 16, x, 14.5, z + 8.2, 0);
      VS.world.colliders.push({ minX: x - 12, maxX: x + 12, minZ: z - 8, maxZ: z + 8 });
    })();

    // pier: wooden walkway out over the ocean
    (function () {
      for (var z = 194; z <= 238; z += 4) {
        addBox(scene, 9, 0.5, 3.6, new T.MeshLambertMaterial({ color: 0x8a6b48 }), 0, 1.2, z, false);
      }
      for (var p = 194; p <= 238; p += 11) {
        addBox(scene, 0.5, 2.4, 0.5, new T.MeshLambertMaterial({ color: 0x6b4a2f }), -4.2, 1.2, p, false);
        addBox(scene, 0.5, 2.4, 0.5, new T.MeshLambertMaterial({ color: 0x6b4a2f }), 4.2, 1.2, p, false);
      }
      addBox(scene, 8, 5, 7, new T.MeshLambertMaterial({ color: 0x2ec4b6 }), 0, 3.6, 240, true);
      makeSign(scene, 'PIER 9', '#ff7ad9', 7, 0, 7.4, 236.4, 0);
    })();

    // palms along the beachfront boulevard + a few umbrellas
    for (var px = -140; px <= 140; px += 20) makePalm(scene, px, 136, 1.0);
    for (var ux = -60; ux <= 60; ux += 40) {
      var pole = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, 3, 6),
        new T.MeshLambertMaterial({ color: 0xdddddd }));
      pole.position.set(ux, 1.5, 168); scene.add(pole);
      var top = new T.Mesh(new T.ConeGeometry(2.4, 1.2, 8),
        new T.MeshLambertMaterial({ color: VS.pick([0xff7ad9, 0xffd23e, 0x2ec4b6]) }));
      top.position.set(ux, 3.4, 168); top.castShadow = true; scene.add(top);
    }

    // streetlights at intersections
    for (var lx = -120; lx <= 120; lx += 40) {
      for (var lz = -120; lz <= 120; lz += 40) {
        var poleM = new T.Mesh(new T.CylinderGeometry(0.14, 0.18, 7, 6),
          new T.MeshLambertMaterial({ color: 0x3a3a44 }));
        poleM.position.set(lx + 7, 3.5, lz + 7); scene.add(poleM);
        var bulb = new T.Mesh(new T.SphereGeometry(0.35, 8, 6),
          new T.MeshBasicMaterial({ color: 0xffd23e }));
        bulb.position.set(lx + 7, 7.1, lz + 7); scene.add(bulb);
      }
    }

    // mission beacon (reused by missions.js): beam + floating diamond + ring
    var beacon = new T.Group();
    var beam = new T.Mesh(new T.CylinderGeometry(1.6, 1.6, 60, 12, 1, true),
      new T.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.22, side: T.DoubleSide, depthWrite: false }));
    beam.position.y = 30;
    beacon.add(beam);
    var diamond = new T.Mesh(new T.OctahedronGeometry(1.6),
      new T.MeshBasicMaterial({ color: 0xffd23e }));
    diamond.position.y = 9;
    beacon.add(diamond);
    var ring = new T.Mesh(new T.RingGeometry(2.4, 3.1, 28),
      new T.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.85, side: T.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.15;
    beacon.add(ring);
    beacon.visible = false;
    beacon.userData.diamond = diamond;
    scene.add(beacon);
    VS.world.beacon = beacon;
  };
})();
