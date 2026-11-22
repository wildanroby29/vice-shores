// config.js — Vice Shores: shared constants, small helpers, and the game state.
// Every module in this game reads and writes the same `VS` object. This file
// only holds data and pure helpers; it creates no meshes and starts no loop.
(function () {
  var VS = window.VS || (window.VS = {});

  // --- deterministic random (mulberry32). Shots pass ?seed= for a fixed city.
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  VS.setSeed = function (s) { VS.rng = mulberry32((s >>> 0) || 1); };
  VS.setSeed(7);
  VS.rand = function (a, b) { return a + VS.rng() * (b - a); };
  VS.randInt = function (a, b) { return Math.floor(VS.rand(a, b + 1)); };
  VS.pick = function (arr) { return arr[Math.floor(VS.rng() * arr.length)]; };

  // --- small math / dom helpers
  VS.clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
  VS.lerp = function (a, b, t) { return a + (b - a) * t; };
  VS.angleLerp = function (a, b, t) {
    var d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  };
  VS.el = function (id) { return document.getElementById(id); };
  VS.fmtMoney = function (n) { return '$' + Math.round(n).toLocaleString('en-US'); };
  VS.fmtClock = function (mins) {
    var h = Math.floor(mins / 60) % 24, m = Math.floor(mins % 60);
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  };
  VS.dist2 = function (ax, az, bx, bz) {
    var dx = ax - bx, dz = az - bz;
    return Math.sqrt(dx * dx + dz * dz);
  };

  // --- world constants (1 unit = 1 metre)
  VS.CFG = {
    cityHalf: 150,          // city blocks span -150..150 on x and z
    beachZ: 150,            // sand starts here
    oceanZ: 192,            // water starts here
    riverX: 152,            // river runs along the east edge
    roadStep: 40,           // distance between road centre lines
    roadWidth: 12,
    blockSize: 28,          // building block size between roads
    playerRadius: 0.55,
    carRadius: 1.7,
    walkSpeed: 4.2,
    sprintSpeed: 7.0,
    maxCarSpeed: 42,        // m/s, about 150 km/h
    savePrefix: 'vice-shores-save-',
  };

  // --- progression
  VS.RANKS = [
    { name: 'NOBODY', need: 0 },
    { name: 'HUSTLER', need: 400 },
    { name: 'WHEELMAN', need: 1200 },
    { name: 'FIXER', need: 2600 },
    { name: 'BOSS', need: 5200 },
  ];
  VS.WEAPONS = [
    { name: 'FISTS', damage: 12, rate: 0.45, range: 2.4, mag: Infinity, reserve: Infinity, auto: false },
    { name: 'P9 PISTOL', damage: 22, rate: 0.28, range: 55, mag: 12, reserve: 48, auto: false },
    { name: 'SMG', damage: 13, rate: 0.09, range: 45, mag: 30, reserve: 90, auto: true },
    { name: 'SHOTGUN', damage: 55, rate: 0.85, range: 22, mag: 6, reserve: 24, auto: false },
  ];
  VS.CREW = [
    { key: 'Q', name: 'MIRA — SWAP PLATES', cd: 45, desc: 'Lose one wanted star' },
    { key: 'C', name: 'JAI — QUICK FIX', cd: 40, desc: 'Repair your car by 35%' },
    { key: 'V', name: 'KIRI — EYES OUT', cd: 30, desc: 'Mark every police unit on the map' },
  ];
  VS.RADIO = {
    station: 'SHORE FM 98.6',
    songs: [
      'Neon Tide — Palm Static', 'Golden Hour — The Breakers', 'Malecón Lights — Celeste',
      'Salt Air — Dune Riders', 'Night Drive — Velvet Coast', 'Sunset Run — Coral Kings',
    ],
  };
  VS.CAR_MODELS = [
    { name: 'Rukun Pelo GT', color: 0xff6a00, speed: 1.12 },
    { name: 'Calyx Sprint', color: 0xe63946, speed: 1.05 },
    { name: 'Vireo GT', color: 0x2ec4b6, speed: 1.08 },
    { name: 'Sunline Cab', color: 0xffd23e, speed: 0.92 },
    { name: 'Palma Cabrio', color: 0xff7ad9, speed: 0.98 },
    { name: 'Coral Coupe', color: 0x4361ee, speed: 1.0 },
    { name: 'Dune Runner', color: 0x80b918, speed: 0.95 },
  ];
  VS.POLICE_NAMES = ['VSPD-07', 'VSPD-12', 'VSPD-19', 'VSPD-23', 'VSPD-31', 'VSPD-44', 'VSPD-52', 'VSPD-68'];

  // --- live game state (single source of truth for the HUD)
  VS.state = {
    mode: 'title',        // title | playing | paused | garage | busted
    time: 0,              // seconds since boot
    clockMin: 17 * 60 + 41,
    money: 1250,
    respect: 0,
    rank: 0,
    wanted: 0,            // stars 0..5
    heat: 0,              // 0..100, drives the stars
    health: 100,
    armor: 0,
    weaponIndex: 1,
    weapons: [],          // filled by main.js from VS.WEAPONS (ammo copies)
    onFoot: true,
    car: null,            // the car object the player drives, or null
    playerPos: { x: -128, y: 0, z: 128 },
    playerYaw: Math.PI * 0.75,
    playerSpeed: 0,
    camYaw: Math.PI * 0.75,
    camPitch: 0.32,
    camDist: 7.5,
    jobIndex: 0,
    jobStage: 0,
    jobTimer: 0,
    jobDone: false,
    slot: 0,
    muted: false,
    nitro: false,         // owned upgrade
    armour: false,        // owned upgrade
    eyesOutUntil: 0,
    busts: 0,
    carsStolen: 0,
    shotMode: '',         // '' or chase | onfoot | title | garage
    seed: 7,
  };

  // --- world registries (filled by city.js / vehicles.js at boot)
  VS.world = {
    scene: null, camera: null, renderer: null,
    colliders: [],        // {minX,maxX,minZ,maxZ} building footprints
    roadLines: [],        // {x1,z1,x2,z2} road centre lines, for the minimap
    beacons: [],          // mission marker meshes
    safehouse: { x: -128, z: 128 },
    garage: { x: 44, z: 132 },
    bank: { x: -20, z: -100 },
    pier: { x: 0, z: 210 },
    spawn: { x: -128, z: 128 },
  };
})();
