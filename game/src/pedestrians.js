import * as THREE from 'three';
import { CITY, COLORS, mulberry32, pick, rand, dist2 } from './config.js';

function shade(color, amount) {
  const c = new THREE.Color(color);
  c.offsetHSL(0, 0, amount);
  return c;
}

function makePed(scene, x, z, rng) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const shirtColor = pick(rng, COLORS.pedShirts);
  const shirt = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: pick(rng, COLORS.skin), roughness: 0.82 });
  const pants = new THREE.MeshStandardMaterial({ color: shade(pick(rng, ['#34465b', '#5a5147', '#3d3d3d', '#6a6250']), 0), roughness: 0.92 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.48, 3, 7), shirt);
  torso.position.y = 1.05;
  torso.castShadow = false;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 8), skin);
  head.position.y = 1.58;
  head.castShadow = false;
  group.add(head);
  const legs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.42, 3, 6), pants);
    leg.position.set(side * 0.12, 0.35, 0);
    leg.castShadow = false;
    group.add(leg);
    legs.push(leg);
  }
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.4, 3, 5), shirt);
    arm.position.set(side * 0.3, 1.02, 0);
    arm.rotation.z = side * -0.16;
    group.add(arm);
    arms.push(arm);
  }
  group.userData.animation = { legs, arms };
  scene.add(group);
  return group;
}

export function createPedestrians(scene, world, count = 40, seed = 21) {
  const rng = mulberry32(seed);
  const peds = [];
  const HALF = 17;

  function corners(blockX, blockZ) {
    return [
      [blockX - HALF, blockZ - HALF],
      [blockX + HALF, blockZ - HALF],
      [blockX + HALF, blockZ + HALF],
      [blockX - HALF, blockZ + HALF],
    ];
  }

  function assignPath(ped, ix, iz) {
    ped.block = [ix, iz];
    ped.corner = Math.floor(rng() * 4);
    const blockX = CITY.blockCenters[ix];
    const blockZ = CITY.blockCenters[iz];
    const list = corners(blockX, blockZ);
    const start = list[ped.corner];
    ped.group.position.set(start[0], 0, start[1]);
    ped.dir = rng() < 0.5 ? 1 : -1;
    ped.target = list[(ped.corner + ped.dir + 4) % 4];
    ped.speed = rand(rng, 1.1, 2.0);
  }

  for (let i = 0; i < count; i += 1) {
    const ix = Math.floor(rng() * CITY.blocks);
    const iz = Math.floor(rng() * CITY.blocks);
    const blockX = CITY.blockCenters[ix];
    const blockZ = CITY.blockCenters[iz];
    const list = corners(blockX, blockZ);
    const start = list[Math.floor(rng() * 4)];
    const group = makePed(scene, start[0], start[1], rng);
    const ped = {
      group,
      phase: rng() * 6.28,
      down: 0,
      x: start[0],
      z: start[1],
      target: [start[0], start[1]],
      speed: rand(rng, 1.1, 2.0),
      dir: 1,
      corner: 0,
      block: [ix, iz],
    };
    assignPath(ped, ix, iz);
    peds.push(ped);
  }

  function knockDown(ped, force = 1) {
    if (ped.down > 0) return false;
    ped.down = 3.5 + force;
    ped.group.rotation.z = Math.PI / 2;
    ped.group.position.y = 0.25;
    return true;
  }

  function respawn(ped) {
    ped.down = 0;
    ped.group.rotation.z = 0;
    ped.group.position.y = 0;
    const ix = Math.floor(rng() * CITY.blocks);
    const iz = Math.floor(rng() * CITY.blocks);
    assignPath(ped, ix, iz);
  }

  function update(dt) {
    for (const ped of peds) {
      if (ped.down > 0) {
        ped.down -= dt;
        if (ped.down <= 0) respawn(ped);
        continue;
      }
      const tx = ped.target[0];
      const tz = ped.target[1];
      const dx = tx - ped.group.position.x;
      const dz = tz - ped.group.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.35) {
        const blockX = CITY.blockCenters[ped.block[0]];
        const blockZ = CITY.blockCenters[ped.block[1]];
        const list = corners(blockX, blockZ);
        if (rng() < 0.14) {
          const ix = Math.max(0, Math.min(CITY.blocks - 1, ped.block[0] + Math.floor(rand(rng, -1.9, 1.9))));
          const iz = Math.max(0, Math.min(CITY.blocks - 1, ped.block[1] + Math.floor(rand(rng, -1.9, 1.9))));
          assignPath(ped, ix, iz);
        } else {
          ped.corner = (ped.corner + ped.dir + 4) % 4;
          ped.target = list[ped.corner];
        }
        continue;
      }
      const nx = dx / d;
      const nz = dz / d;
      ped.group.position.x += nx * ped.speed * dt;
      ped.group.position.z += nz * ped.speed * dt;
      ped.group.rotation.y = Math.atan2(nx, nz);
      ped.phase += dt * ped.speed * 4.2;
      const swing = Math.sin(ped.phase);
      ped.group.userData.animation.legs[0].rotation.x = swing * 0.55;
      ped.group.userData.animation.legs[1].rotation.x = -swing * 0.55;
      ped.group.userData.animation.arms[0].rotation.x = -swing * 0.4;
      ped.group.userData.animation.arms[1].rotation.x = swing * 0.4;
      ped.group.position.y = Math.abs(Math.sin(ped.phase)) * 0.03;
      ped.x = ped.group.position.x;
      ped.z = ped.group.position.z;
    }
  }

  function layoutAround(cx, cz, rngLocal = rng) {
    for (const ped of peds) {
      ped.down = 0;
      ped.group.rotation.z = 0;
      ped.group.position.y = 0;
      const side = Math.floor(rngLocal() * 4);
      const spread = rand(rngLocal, -24, 24);
      let x = cx;
      let z = cz;
      if (side === 0) {
        x += spread;
        z += 20 + rand(rngLocal, 0, 4);
      } else if (side === 1) {
        x += spread;
        z -= 20 + rand(rngLocal, 0, 4);
      } else if (side === 2) {
        z += spread;
        x += 20 + rand(rngLocal, 0, 4);
      } else {
        z += spread;
        x -= 20 + rand(rngLocal, 0, 4);
      }
      ped.group.position.set(x, 0, z);
      ped.x = x;
      ped.z = z;
      ped.group.rotation.y = rand(rngLocal, -Math.PI, Math.PI);
      ped.phase = rand(rngLocal, 0, 6.28);
      const swing = Math.sin(ped.phase);
      ped.group.userData.animation.legs[0].rotation.x = swing * 0.5;
      ped.group.userData.animation.legs[1].rotation.x = -swing * 0.5;
    }
  }

  function nearest(pos, radius = 2.4) {
    let hit = null;
    let best = radius;
    for (const ped of peds) {
      if (ped.down > 0) continue;
      const d = dist2(pos.x, pos.z, ped.group.position.x, ped.group.position.z);
      if (d < best) {
        best = d;
        hit = ped;
      }
    }
    return hit;
  }

  return { peds, update, layoutAround, nearest, knockDown };
}
