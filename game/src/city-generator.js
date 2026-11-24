import * as THREE from 'three';
import { CITY, COLORS, STORE_SIGNS, LANDMARK_POSITIONS, mulberry32, pick, rand } from './config.js';
import { makeCar } from './drive-controller.js';

const nightMaterials = [];

function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeFacadeVariant(rng, style) {
  const lit = [];
  const tower = style === 'tower';
  const wallColor = tower ? '#b9cfd6' : style === 'glass' ? '#c7d0d2' : '#e4ddd2';
  const windowPalettes = tower
    ? [['#5d8798', '#8db6c4'], ['#527a8c', '#a5cfdb'], ['#648ea0', '#9bc4d2']]
    : style === 'glass'
      ? [['#698289', '#93b0b5'], ['#5f7d86', '#8aa9ae']]
      : [['#4f626b', '#657b84'], ['#5a6b70', '#71858a'], ['#4a5d66', '#667d86'], ['#5e6d6c', '#7a8e8b']];
  const glassPalette = pick(rng, windowPalettes);
  const litPalette = tower
    ? ['#d7f2ff', '#bfe6f7', '#ecf9ff']
    : ['#f8d99e', '#ffe3ad', '#f4c987', '#fff0c8'];
  const litColor = pick(rng, litPalette);
  const trimColor = tower ? 'rgba(44,78,92,0.24)' : 'rgba(90,74,58,0.16)';
  const map = canvasTexture(128, 256, (ctx) => {
    ctx.fillStyle = wallColor;
    ctx.fillRect(0, 0, 128, 256);
    ctx.fillStyle = trimColor;
    for (let y = 0; y < 256; y += 64) ctx.fillRect(0, y, 128, 2);
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const x = 9 + col * 30;
        const y = 12 + row * 62;
        const isLit = rng() < (tower ? 0.3 : 0.2);
        if (isLit) lit.push([x, y, litColor]);
        ctx.fillStyle = isLit ? litColor : glassPalette[(row + col) % glassPalette.length];
        ctx.fillRect(x, y, 20, 30);
        ctx.fillStyle = isLit ? '#fffaf0' : tower ? 'rgba(190,235,245,0.32)' : 'rgba(220,235,238,0.28)';
        ctx.fillRect(x + 2, y + 2, 16, 5);
        ctx.fillStyle = tower ? 'rgba(32,62,76,0.28)' : 'rgba(50,42,34,0.20)';
        ctx.fillRect(x - 1, y + 31, 23, 3);
      }
    }
  });
  const emissive = canvasTexture(128, 256, (ctx) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 128, 256);
    for (const [x, y, color] of lit) {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 20, 30);
    }
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  emissive.wrapS = emissive.wrapT = THREE.RepeatWrapping;
  return { map, emissive };
}

function makeRoadTextures() {
  const map = canvasTexture(64, 256, (ctx) => {
    ctx.fillStyle = COLORS.asphalt;
    ctx.fillRect(0, 0, 64, 256);
    for (let i = 0; i < 500; i += 1) {
      const x = (i * 37 + 11) % 64;
      const y = (i * 83 + 17) % 256;
      ctx.fillStyle = `rgba(255,255,255,${((i * 29) % 25) / 1000})`;
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.fillStyle = COLORS.lane;
    ctx.fillRect(6, 0, 2, 256);
    ctx.fillRect(56, 0, 2, 256);
    ctx.fillStyle = '#d9bd6b';
    for (let y = 0; y < 256; y += 54) ctx.fillRect(31, y, 2, 30);
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(1, 34);
  return map;
}

function makeSignTexture(name, color) {
  const texture = canvasTexture(512, 128, (ctx) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.fillRect(0, 108, 512, 20);
    ctx.fillStyle = '#fff4dc';
    ctx.font = '800 40px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name.toUpperCase(), 256, 64, 474);
  });
  return texture;
}

function makeSign(scene, name, color, x, y, z, rotation) {
  const material = new THREE.MeshStandardMaterial({ map: makeSignTexture(name, color), emissive: color, emissiveIntensity: 0.16, roughness: 0.46 });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.3, 0.16), material);
  sign.position.set(x, y, z);
  sign.rotation.y = rotation;
  sign.castShadow = true;
  scene.add(sign);
  return sign;
}

function makePalm(scene, x, z, scale, rng) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: '#8c6546', roughness: 0.94 });
  const leafMaterial = new THREE.MeshStandardMaterial({ color: pick(rng, ['#56865d', '#65955f', '#477650', '#7b9b62']), roughness: 0.9, side: THREE.DoubleSide });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * scale, 0.22 * scale, 6.2 * scale, 7), trunkMaterial);
  trunk.position.y = 3.1 * scale;
  trunk.rotation.z = rand(rng, -0.1, 0.1);
  trunk.castShadow = true;
  group.add(trunk);
  const frondCount = 5 + Math.floor(rng() * 3);
  for (let i = 0; i < frondCount; i += 1) {
    const angle = i * Math.PI * 2 / frondCount + 0.3;
    const length = rand(rng, 2.8, 3.5) * scale;
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.42 * scale, 0.08 * scale, length), leafMaterial);
    leaf.position.set(Math.sin(angle) * 1.05 * scale, 6.05 * scale, Math.cos(angle) * 1.05 * scale);
    leaf.rotation.y = angle;
    leaf.rotation.x = -0.3;
    leaf.rotation.z = Math.sin(angle) * 0.14;
    leaf.castShadow = false;
    group.add(leaf);
  }
  scene.add(group);
  return group;
}

function makePlanter(scene, x, z, length = 3.2) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const stone = new THREE.MeshStandardMaterial({ color: '#b8a991', roughness: 0.9 });
  const soil = new THREE.MeshStandardMaterial({ color: '#554b3b', roughness: 1 });
  const foliage = new THREE.MeshStandardMaterial({ color: '#477353', roughness: 0.94 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(length, 0.48, 1.15), stone);
  base.position.y = 0.24;
  group.add(base);
  const dirt = new THREE.Mesh(new THREE.BoxGeometry(length - 0.18, 0.12, 0.94), soil);
  dirt.position.y = 0.52;
  group.add(dirt);
  for (let i = 0; i < 4; i += 1) {
    const shrub = new THREE.Mesh(new THREE.SphereGeometry(0.42, 7, 5), foliage);
    shrub.position.set((i - 1.5) * length / 4, 0.86, 0);
    group.add(shrub);
  }
  scene.add(group);
  return group;
}

function makeBench(scene, x, z, yaw = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = yaw;
  const wood = new THREE.MeshStandardMaterial({ color: '#987052', roughness: 0.88 });
  const metal = new THREE.MeshStandardMaterial({ color: '#565e5a', roughness: 0.55, metalness: 0.32 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.14, 0.62), wood);
  seat.position.y = 0.58;
  group.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.58, 0.12), wood);
  back.position.set(0, 0.95, 0.27);
  group.add(back);
  for (const xOffset of [-0.85, 0.85]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.62, 0.58), metal);
    leg.position.set(xOffset, 0.3, 0);
    group.add(leg);
  }
  scene.add(group);
}

function makeStreetProp(scene, kind, x, z, yaw = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = yaw;
  const poleMaterial = new THREE.MeshStandardMaterial({ color: '#59635f', roughness: 0.5, metalness: 0.25 });
  if (kind === 'hydrant') {
    const red = new THREE.MeshStandardMaterial({ color: '#bf493e', roughness: 0.62 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.78, 8), red);
    body.position.y = 0.4;
    group.add(body);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.18, 8), red);
    cap.position.y = 0.86;
    group.add(cap);
    for (const side of [-1, 1]) {
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.2, 8), red);
      nozzle.rotation.z = Math.PI / 2;
      nozzle.position.set(side * 0.32, 0.52, 0);
      group.add(nozzle);
    }
  } else if (kind === 'bus-stop') {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 3.6, 7), poleMaterial);
    post.position.y = 1.8;
    group.add(post);
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.25, 0.12), new THREE.MeshStandardMaterial({ color: '#267d83', emissive: '#12464b', emissiveIntensity: 0.18, roughness: 0.6 }));
    board.position.set(0, 3.05, 0);
    group.add(board);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.08, 0.14), new THREE.MeshStandardMaterial({ color: '#f2d495', roughness: 0.6 }));
    stripe.position.set(0, 3.18, 0);
    group.add(stripe);
  } else {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 4.8, 8), poleMaterial);
    post.position.y = 2.4;
    group.add(post);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.12, 0.12), poleMaterial);
    arm.position.set(0.72, 4.54, 0);
    group.add(arm);
    for (let i = 0; i < 3; i += 1) {
      const material = new THREE.MeshStandardMaterial({ color: ['#d94c42', '#e7c354', '#4e9961'][i], emissive: ['#e6382d', '#dfa821', '#39874c'][i], emissiveIntensity: 0.48, roughness: 0.35 });
      nightMaterials.push(material);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), material);
      lamp.position.set(1.42, 4.5 - i * 0.34, 0.08);
      group.add(lamp);
    }
  }
  scene.add(group);
}

function makeStreetlight(scene, x, z, flip) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = flip ? Math.PI : 0;
  const metal = new THREE.MeshStandardMaterial({ color: '#59635f', roughness: 0.48, metalness: 0.32 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 5.6, 8), metal);
  pole.position.y = 2.8;
  group.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 0.1), metal);
  arm.position.set(0.55, 5.45, 0);
  group.add(arm);
  const lampMaterial = new THREE.MeshStandardMaterial({ color: '#ecd09a', emissive: '#cf8f3c', emissiveIntensity: 0.5, roughness: 0.35 });
  nightMaterials.push(lampMaterial);
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.16, 0.3), lampMaterial);
  lamp.position.set(1.12, 5.36, 0);
  group.add(lamp);
  scene.add(group);
  return group;
}

function makeUmbrella(scene, x, z, color) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.5, 6), new THREE.MeshStandardMaterial({ color: '#d8c9ad' }));
  pole.position.y = 1.25;
  group.add(pole);
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.7, 0.55, 8), new THREE.MeshStandardMaterial({ color, roughness: 0.8, side: THREE.DoubleSide }));
  canopy.position.y = 2.5;
  canopy.castShadow = true;
  group.add(canopy);
  scene.add(group);
}

export function buildCity(scene, seed = 7) {
  const rng = mulberry32(seed);
  nightMaterials.length = 0;
  const colliders = [];
  const buildings = [];
  const parkedCars = [];
  const landmarks = {};
  const blockData = new Map();
  const facadeVariants = [makeFacadeVariant(rng, 'plain'), makeFacadeVariant(rng, 'plain'), makeFacadeVariant(rng, 'glass'), makeFacadeVariant(rng, 'plain'), makeFacadeVariant(rng, 'glass'), makeFacadeVariant(rng, 'tower')];
  const grounds = new THREE.Mesh(new THREE.PlaneGeometry(1100, 1100), new THREE.MeshStandardMaterial({ color: '#b5a98e', roughness: 1 }));
  grounds.rotation.x = -Math.PI / 2;
  grounds.position.y = -0.16;
  grounds.receiveShadow = true;
  scene.add(grounds);
  const sidewalkBase = new THREE.Mesh(new THREE.PlaneGeometry(CITY.extent * 2 + 20, CITY.extent * 2 + 20), new THREE.MeshStandardMaterial({ color: COLORS.concrete, roughness: 0.96 }));
  sidewalkBase.rotation.x = -Math.PI / 2;
  sidewalkBase.position.y = -0.02;
  sidewalkBase.receiveShadow = true;
  scene.add(sidewalkBase);
  const roadGeometry = new THREE.PlaneGeometry(CITY.road, CITY.extent * 2 + 30);
  roadGeometry.rotateX(-Math.PI / 2);
  const roadMaterial = new THREE.MeshStandardMaterial({ map: makeRoadTextures(), roughness: 0.94 });
  for (const center of CITY.roadCenters) {
    const alongZ = new THREE.Mesh(roadGeometry, roadMaterial);
    alongZ.position.set(center, 0.015, 0);
    scene.add(alongZ);
    const alongX = new THREE.Mesh(roadGeometry, roadMaterial);
    alongX.rotation.y = Math.PI / 2;
    alongX.position.set(0, 0.018, center);
    scene.add(alongX);
  }
  for (const cx of [-26, 26]) {
    for (const cz of [-26, 26]) {
      for (const [rx, rz, rot] of [[0, -7, 0], [0, 7, 0], [-7, 0, Math.PI / 2], [7, 0, Math.PI / 2]]) {
        const stripes = canvasTexture(64, 64, (ctx) => {
          ctx.fillStyle = 'rgba(240,230,204,0.72)';
          for (let i = 0; i < 5; i += 1) ctx.fillRect(i * 14 + 2, 0, 7, 64);
        });
        const crosswalk = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.2), new THREE.MeshStandardMaterial({ map: stripes, transparent: true, roughness: 0.8 }));
        crosswalk.rotation.x = -Math.PI / 2;
        crosswalk.rotation.z = rot;
        crosswalk.position.set(cx + rx, 0.055, cz + rz);
        scene.add(crosswalk);
      }
    }
  }
  for (let ix = 0; ix < CITY.blocks; ix += 1) {
    for (let iz = 0; iz < CITY.blocks; iz += 1) {
      const cx = CITY.blockCenters[ix] + rand(rng, -1.4, 1.4);
      const cz = CITY.blockCenters[iz] + rand(rng, -1.4, 1.4);
      const nearBeach = iz >= 7;
      const w = rand(rng, 22, 31);
      const d = rand(rng, 22, 31);
      const store = STORE_SIGNS.find((entry) => entry.block[0] === ix && entry.block[1] === iz);
      const towerBlock = (ix === 2 && iz === 3) || (ix === 6 && iz === 5);
      const h = towerBlock ? rand(rng, 54, 66) : store ? rand(rng, 6.5, 9.5) : nearBeach ? rand(rng, 8, 17) : rand(rng, 9, 27);
      const variant = towerBlock ? facadeVariants[5] : facadeVariants[Math.floor(rng() * (facadeVariants.length - 1))];
      const map = variant.map.clone();
      map.needsUpdate = true;
      map.repeat.set(Math.max(0.8, w / 11), Math.max(0.7, h / 10));
      const emissive = variant.emissive.clone();
      emissive.needsUpdate = true;
      emissive.repeat.copy(map.repeat);
      const sideMaterial = new THREE.MeshStandardMaterial({ map, color: towerBlock ? '#b7d0da' : pick(rng, COLORS.pastels), roughness: towerBlock ? 0.38 : 0.84, metalness: towerBlock ? 0.22 : 0, emissive: towerBlock ? '#62b3c9' : '#f6d295', emissiveMap: emissive, emissiveIntensity: towerBlock ? 0.24 : 0.17 });
      nightMaterials.push(sideMaterial);
      const roofMaterial = new THREE.MeshStandardMaterial({ color: '#cdbca0', roughness: 0.94 });
      const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [sideMaterial, sideMaterial, roofMaterial, roofMaterial, sideMaterial, sideMaterial]);
      building.position.set(cx, h / 2, cz);
      building.castShadow = true;
      building.receiveShadow = true;
      scene.add(building);
      buildings.push(building);
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.6, d + 0.5), new THREE.MeshStandardMaterial({ color: '#c0b49c', roughness: 0.95 }));
      plinth.position.set(cx, 0.28, cz);
      plinth.receiveShadow = true;
      scene.add(plinth);
      if (!towerBlock && rng() < 0.55) {
        const ac = new THREE.Mesh(new THREE.BoxGeometry(w * 0.22, 0.9, d * 0.22), new THREE.MeshStandardMaterial({ color: '#b9b1a0', roughness: 0.9 }));
        ac.position.set(cx + w * 0.2, h + 0.5, cz - d * 0.18);
        scene.add(ac);
      }
      if (towerBlock) {
        const crown = new THREE.Mesh(new THREE.BoxGeometry(w * 0.52, 2.2, d * 0.52), new THREE.MeshStandardMaterial({ color: '#a9c3cb', roughness: 0.42, metalness: 0.2 }));
        crown.position.set(cx, h + 1.1, cz);
        scene.add(crown);
        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffe2a0', emissive: '#ed9e49', emissiveIntensity: 0.75 }));
        beacon.position.set(cx, h + 2.55, cz);
        scene.add(beacon);
      } else if (rng() < 0.48) {
        const tankMaterial = new THREE.MeshStandardMaterial({ color: '#aab7b4', roughness: 0.76, metalness: 0.12 });
        const tank = new THREE.Mesh(new THREE.BoxGeometry(w * 0.23, 1.55, d * 0.22), tankMaterial);
        tank.position.set(cx + w * 0.2, h + 0.78, cz - d * 0.17);
        scene.add(tank);
        const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, 2.2, 6), new THREE.MeshStandardMaterial({ color: '#68706c', metalness: 0.42, roughness: 0.5 }));
        antenna.position.set(cx - w * 0.22, h + 1.1, cz + d * 0.21);
        scene.add(antenna);
      }
      colliders.push({ minX: cx - w / 2 - 0.4, maxX: cx + w / 2 + 0.4, minZ: cz - d / 2 - 0.4, maxZ: cz + d / 2 + 0.4 });
      blockData.set(`${ix},${iz}`, { cx, cz, w, d, h });
      if (store) {
        const facing = store.side;
        let sx = cx;
        let sz = cz;
        let rot = 0;
        let lx = cx;
        let lz = cz;
        if (facing === '+z') { sz = cz + d / 2 + 0.15; rot = 0; lz = cz + d / 2 + 3.4; }
        if (facing === '-z') { sz = cz - d / 2 - 0.15; rot = Math.PI; lz = cz - d / 2 - 3.4; }
        if (facing === '+x') { sx = cx + w / 2 + 0.15; rot = Math.PI / 2; lx = cx + w / 2 + 3.4; }
        if (facing === '-x') { sx = cx - w / 2 - 0.15; rot = -Math.PI / 2; lx = cx - w / 2 - 3.4; }
        const sign = makeSign(scene, store.name, pick(rng, COLORS.signs), sx, 3.2, sz, rot);
        if (store.name === "Marisol's Cantina") {
          sign.material.emissive.set('#ff4fa3');
          sign.material.emissiveIntensity = 0.85;
        }
        const awning = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.18, 1.5), new THREE.MeshStandardMaterial({ color: store.name === "Marisol's Cantina" ? '#b64882' : pick(rng, COLORS.awnings), roughness: 0.82 }));
        awning.position.set(sx + (facing.includes('x') ? Math.sign(sx - cx) * 0.6 : 0), 3.95, sz + (facing.includes('z') ? Math.sign(sz - cz) * 0.6 : 0));
        scene.add(awning);
        if (LANDMARK_POSITIONS[store.name]) landmarks[store.name] = { x: lx + rand(rng, -0.8, 0.8), z: lz + rand(rng, -0.8, 0.8), face: store.side };
      }
      if ((ix + iz) % 3 === 0) makePalm(scene, cx + w / 2 + 4.3, cz + d / 2 + 4.3, rand(rng, 0.82, 1.1), rng);
    }
  }
  for (const center of [-78, -26, 26, 78]) {
    for (const z of [-170, -100, -40, 40, 100, 170]) {
      makeStreetlight(scene, center - 8.4, z, true);
      makeStreetlight(scene, center + 8.4, z, false);
    }
    for (const x of [-170, -100, -40, 40, 100, 170]) {
      makeStreetlight(scene, x, center - 8.4, true);
    }
  }
  for (const x of [-210, -160, -110, 110, 160, 210]) {
    for (const z of [-26, 26]) makePalm(scene, x, z + (z > 0 ? 10 : -10), rand(rng, 0.8, 1.05), rng);
  }
  for (const x of [-86, -70, -34, -18, 18, 34, 70, 86]) {
    for (const z of [-170, -110, -50, 10, 70, 130, 190, 250]) makePalm(scene, x, z, rand(rng, 0.9, 1.12), rng);
  }
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(700, 94), new THREE.MeshStandardMaterial({ color: COLORS.sand, roughness: 0.98 }));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, -0.03, CITY.extent + 45);
  sand.receiveShadow = true;
  scene.add(sand);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(900, 300), new THREE.MeshStandardMaterial({ color: COLORS.water, roughness: 0.28, metalness: 0.14, emissive: '#0c3540', emissiveIntensity: 0.24 }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.08, CITY.extent + 190);
  scene.add(water);
  for (let x = -230; x <= 230; x += 6.5) {
    const foam = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.04, 0.3), new THREE.MeshStandardMaterial({ color: COLORS.foam, roughness: 0.7 }));
    foam.position.set(x, 0.02, CITY.extent + 92 + Math.sin(x * 0.15) * 1.6);
    scene.add(foam);
  }
  for (let i = 0; i < 7; i += 1) {
    makeUmbrella(scene, -80 + i * 27, CITY.extent + 28 + (i % 2) * 8, pick(rng, COLORS.awnings));
  }
  for (const x of [-115, -85, -55, -25, 25, 55, 85, 115]) makePalm(scene, x, CITY.extent + 8, rand(rng, 0.8, 1.02), rng);
  const pier = new THREE.Mesh(new THREE.BoxGeometry(11, 0.6, 76), new THREE.MeshStandardMaterial({ color: '#8b7456', roughness: 0.92 }));
  pier.position.set(0, 0.35, CITY.extent + 90);
  pier.castShadow = true;
  scene.add(pier);
  for (let z = CITY.extent + 58; z <= CITY.extent + 126; z += 9) {
    for (const x of [-4.8, 4.8]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 3.2, 6), new THREE.MeshStandardMaterial({ color: '#5b4a37', roughness: 0.96 }));
      post.position.set(x, -1.1, z);
      scene.add(post);
    }
  }
  const hut = new THREE.Mesh(new THREE.BoxGeometry(9, 4.2, 7), new THREE.MeshStandardMaterial({ color: '#dfd0b4', roughness: 0.86 }));
  hut.position.set(0, 2.1, CITY.extent + 52);
  hut.castShadow = true;
  scene.add(hut);
  const hutRoof = new THREE.Mesh(new THREE.BoxGeometry(10, 0.4, 8), new THREE.MeshStandardMaterial({ color: '#477f7b', roughness: 0.8 }));
  hutRoof.position.set(0, 4.4, CITY.extent + 52);
  scene.add(hutRoof);
  for (const [x, z] of [[-93, -26], [-93, 26], [93, -26], [93, 26], [-26, 93], [26, 93]]) makePlanter(scene, x, z);
  makeSign(scene, 'Dockmaster Marine', '#2f6f74', 0, 3.2, CITY.extent + 48.4, Math.PI);
  landmarks['Dockmaster Marine'] = { x: 0, z: CITY.extent + 43, face: '-z' };
  for (const [x, z, yaw] of [[-94, 5, 0], [94, -6, Math.PI], [-6, 94, Math.PI / 2], [8, 94, -Math.PI / 2]]) makeBench(scene, x, z, yaw);
  for (const [x, z, kind, yaw] of [[-34, 26, 'hydrant', 0], [34, -26, 'hydrant', Math.PI], [-78, 25, 'bus-stop', 0], [26, -78, 'traffic', Math.PI / 2], [-26, 78, 'traffic', -Math.PI / 2], [78, 26, 'traffic', Math.PI]]) makeStreetProp(scene, kind, x, z, yaw);
  const parkedSpots = [
    ['sedan', 23.5, 8, 0], ['taxi', -23.5, -36, Math.PI], ['van', 28, -104, 0], ['sport', -28, 72, Math.PI],
    ['sedan', -80, 23.5, Math.PI / 2], ['taxi', 80, -23.5, -Math.PI / 2], ['muscle', -130, 23.5, Math.PI / 2],
    ['sedan', 130, -23.5, -Math.PI / 2], ['van', 23.5, 104, 0], ['sport', -28, -156, Math.PI],
    ['taxi', 28, 156, 0], ['sedan', -23.5, -8, Math.PI],
  ];
  for (const [type, x, z, yaw] of parkedSpots) {
    const car = makeCar(type, scene, { x, z }, yaw, { parked: true, color: pick(rng, COLORS.carColors) });
    car.userData.parked = true;
    parkedCars.push(car);
  }
  function setNightLights(on) {
    for (const material of nightMaterials) {
      if (material.emissive.getHex() === 0x62b3c9) material.emissiveIntensity = on ? 0.72 : 0.24;
      else material.emissiveIntensity = on ? 1.25 : material.map ? 0.17 : 0.5;
    }
  }
  return { buildings, colliders, parkedCars, landmarks, blockData, setNightLights, seed };
}
