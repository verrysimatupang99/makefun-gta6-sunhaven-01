export const STEP = 1 / 60;

export const CITY = (() => {
  const blocks = 9;
  const block = 40;
  const road = 12;
  const cell = block + road;
  const extent = (blocks * cell + road) / 2;
  const roadCenters = Array.from({ length: blocks + 1 }, (_, i) => -extent + road / 2 + i * cell);
  const blockCenters = Array.from({ length: blocks }, (_, i) => -extent + road + block / 2 + i * cell);
  return {
    blocks,
    block,
    road,
    cell,
    extent,
    beachZ: extent + 6,
    waterZ: extent + 92,
    roadCenters,
    blockCenters,
    lane: 3,
    curb: 1.7,
  };
})();

export const COLORS = {
  skyTop: '#3e6fa8',
  skyHorizon: '#ffc07a',
  fog: '#eab88b',
  sun: '#ffe3b6',
  asphalt: '#3d4148',
  sidewalk: '#d9ccb4',
  lane: '#f4e4ba',
  sand: '#ead4a4',
  water: '#2b7f92',
  foam: '#d9efec',
  concrete: '#cfc2ac',
  pastels: ['#f4d2c2', '#f6e4b8', '#cfdcc9', '#ecd0dd', '#cbdce9', '#f0dcc0', '#ddcbe8', '#f3cdb0', '#c3ddd5', '#ead7b1', '#dcc0ac', '#cbdbc3'],
  awnings: ['#d75f4a', '#3f8a86', '#e2ab45', '#c97d9a', '#5a7fa8'],
  signs: ['#e2604c', '#2f6f74', '#d99a3e', '#b85c74', '#4a6f9e'],
  carColors: ['#b9564a', '#d8d3c6', '#3f6f7d', '#c69a4a', '#5c8a6a', '#8a5c7a', '#e0d8c8', '#6a7280'],
  pedShirts: ['#d76a53', '#e5c45c', '#5a8fa8', '#b8d0a8', '#c88a9a', '#e8ded0', '#7a93b5', '#d9a066', '#8fae8b', '#c4796a'],
  skin: ['#8a5a3c', '#b07850', '#d5a273', '#6f452b', '#e0b489'],
  hair: ['#2a1d16', '#4a2f20', '#151515', '#6a4a2a', '#8a7a66'],
  water: '#2f7f92',
};

export const PLAYER = {
  walk: 4.6,
  run: 7.6,
  height: 1.8,
  radius: 0.38,
  lookSpeed: 0.0024,
  camDistance: 5.4,
  camHeight: 2.1,
  start: { x: 7, z: 34 },
};

export const CAR = {
  accel: 15,
  brake: 22,
  drag: 0.55,
  maxSteer: 0.6,
  steerRate: 7,
  grip: 5.6,
  drift: 0.055,
  cameraBack: 7.8,
  cameraHeight: 3.3,
};

export const CAR_TYPES = {
  sedan: { length: 4.4, width: 1.9, height: 1.34, maxSpeed: 28, accel: 16, color: '#b9564a' },
  taxi: { length: 4.5, width: 1.92, height: 1.42, maxSpeed: 27, accel: 15, color: '#e2ab45' },
  sport: { length: 4.6, width: 2.02, height: 1.08, maxSpeed: 38, accel: 25, color: '#c62f32' },
  van: { length: 5.2, width: 2.18, height: 2.16, maxSpeed: 22, accel: 12, color: '#ded7c8' },
  police: { length: 4.66, width: 1.94, height: 1.4, maxSpeed: 32, accel: 21, color: '#e9e6dd' },
  muscle: { length: 4.8, width: 1.98, height: 1.2, maxSpeed: 35, accel: 23, color: '#4f6b55' },
};

export const LANDMARK_POSITIONS = {
  'Sunhaven Diner': { x: 0, z: -34, face: 'z' },
  "Vinny's Imports": { x: 34, z: 0, face: 'x' },
  "Marisol's Cantina": { x: -34, z: 0, face: 'x' },
  'Coral Mart': { x: 0, z: 34, face: 'z' },
  'Dockmaster Marine': { x: 0, z: 286, face: 'z' },
};

export const STORE_SIGNS = [
  { name: 'Sunhaven Diner', block: [4, 3], side: '+z' },
  { name: "Vinny's Imports", block: [5, 4], side: '-x' },
  { name: "Marisol's Cantina", block: [3, 4], side: '+x' },
  { name: 'Coral Mart', block: [4, 5], side: '-z' },
  { name: 'Tide Pool Motel', block: [1, 1], side: '+z' },
  { name: 'Palms Pharmacy', block: [7, 2], side: '+x' },
  { name: 'Bay Loans', block: [2, 6], side: '-x' },
  { name: 'Sunhaven Arcade', block: [6, 6], side: '+z' },
  { name: 'Golden Tan', block: [7, 5], side: '-z' },
  { name: 'Sandbar Records', block: [2, 2], side: '+x' },
  { name: 'Coastline Realty', block: [6, 1], side: '-z' },
  { name: 'Dockmaster Marine', block: [4, 7], side: '+z' },
];

export const MISSION_ORDER = ['meet-vinny', 'deliver-package', 'lose-heat', 'last-drop'];

export function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function damp(a, b, lambda, dt) {
  return lerp(a, b, 1 - Math.exp(-lambda * dt));
}

export function angleLerp(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(rng, list) {
  return list[Math.floor(rng() * list.length) % list.length];
}

export function rand(rng, min, max) {
  return min + rng() * (max - min);
}

export function dist2(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

export const SAVE_KEY = 'sunhaven-bay.save.v1';
export const START_CASH = 500;
