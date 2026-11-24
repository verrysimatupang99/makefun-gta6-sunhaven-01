import * as THREE from 'three';
import { CITY, CAR_TYPES, COLORS, clamp, mulberry32, pick, rand } from './config.js';
import { makeCar } from './drive-controller.js';

const TYPES = ['sedan', 'taxi', 'sport', 'van', 'sedan', 'sedan', 'van'];

export function createTraffic(scene, world, count = 25, seed = 99) {
  const rng = mulberry32(seed);
  const cars = [];

  function laneOffset(axis, dir) {
    if (axis === 'x') return dir > 0 ? CITY.lane : -CITY.lane;
    return dir > 0 ? -CITY.lane : CITY.lane;
  }

  function yawFor(axis, dir) {
    if (axis === 'x') return dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    return dir > 0 ? Math.PI : 0;
  }

  function spawnOne(index) {
    const axis = rng() < 0.5 ? 'x' : 'z';
    const line = pick(rng, CITY.roadCenters);
    const dir = rng() < 0.5 ? 1 : -1;
    const travel = rand(rng, -CITY.extent, CITY.extent);
    const type = pick(rng, TYPES);
    const car = makeCar(type, scene, { x: 0, z: 0 }, 0, { color: pick(rng, COLORS.carColors), ai: true });
    car.traverse((child) => { child.castShadow = false; });
    const item = {
      group: car,
      axis,
      line,
      dir,
      offset: laneOffset(axis, dir),
      travel,
      speed: rand(rng, 8, 15),
      cruise: rand(rng, 8, 15),
      wait: 0,
      nextCross: 0,
      id: index,
    };
    cars.push(item);
    sync(item);
    return item;
  }

  function sync(item) {
    const g = item.group;
    if (item.axis === 'x') {
      g.position.set(item.travel, 0, item.line + item.offset);
    } else {
      g.position.set(item.line + item.offset, 0, item.travel);
    }
    g.rotation.y = yawFor(item.axis, item.dir);
  }

  function reset(item) {
    item.axis = rng() < 0.5 ? 'x' : 'z';
    item.line = pick(rng, CITY.roadCenters);
    item.dir = rng() < 0.5 ? 1 : -1;
    item.offset = laneOffset(item.axis, item.dir);
    item.travel = item.dir > 0 ? -CITY.extent - rand(rng, 4, 30) : CITY.extent + rand(rng, 4, 30);
    item.speed = 0;
    item.wait = rand(rng, 0, 1.2);
    item.nextCross = nextCrossAhead(item);
    sync(item);
  }

  function nextCrossAhead(item) {
    const spaced = CITY.roadCenters.map((c) => c);
    if (item.dir > 0) {
      const next = spaced.find((c) => c > item.travel + 2);
      return next === undefined ? CITY.extent + CITY.road : next;
    }
    const ahead = spaced.filter((c) => c < item.travel - 2);
    return ahead.length ? ahead[ahead.length - 1] : -CITY.extent - CITY.road;
  }

  for (let i = 0; i < count; i += 1) {
    const item = spawnOne(i);
    item.nextCross = nextCrossAhead(item);
  }

  function setLights(on) {
    for (const item of cars) {
      for (const mat of item.group.userData.headlights || []) mat.emissiveIntensity = on ? 1.7 : 0.22;
    }
  }

  function update(dt, playerCar) {
    for (const item of cars) {
      if (item.wait > 0) {
        item.wait -= dt;
        item.speed = clamp(item.speed - dt * 14, 0, item.cruise);
        sync(item);
        continue;
      }
      let limit = item.cruise;
      for (const other of cars) {
        if (other === item || other.axis !== item.axis || other.line !== item.line || other.dir !== item.dir) continue;
        const gap = (other.travel - item.travel) * item.dir;
        if (gap > 0 && gap < 10) limit = Math.min(limit, Math.max(0, (gap - 4) * 1.8));
      }
      if (playerCar) {
        const p = playerCar.position;
        const px = item.axis === 'x' ? p.x : p.z;
        const perp = item.axis === 'x' ? p.z : p.x;
        const gap = (px - item.travel) * item.dir;
        if (gap > 0 && gap < 8 && Math.abs(perp - (item.line + item.offset)) < 3.6) limit = Math.min(limit, 2);
      }
      const target = Math.min(item.cruise, Math.max(0, limit));
      item.speed += clamp(target - item.speed, -18 * dt, 6 * dt);
      item.travel += item.dir * item.speed * dt;
      const crossed = item.dir > 0 ? item.travel >= item.nextCross : item.travel <= item.nextCross;
      if (crossed) {
        item.nextCross += item.dir * CITY.cell;
        if (rng() < 0.34) item.wait = rand(rng, 0.5, 1.6);
      }
      const overflow = item.travel > CITY.extent + 24 || item.travel < -CITY.extent - 24;
      if (overflow) reset(item);
      for (const wheel of item.group.userData.wheels || []) wheel.rotation.x += item.speed * dt * 2.2;
      sync(item);
    }
  }

  function layoutAround(cx, cz, density = 1) {
    const nearby = cars;
    let index = 0;
    for (const item of nearby) {
      item.wait = 30;
      item.speed = 0;
      item.axis = index % 2 === 0 ? 'x' : 'z';
      item.line = CITY.roadCenters.slice().sort((a, b) => Math.abs(a - (item.axis === 'x' ? cz : cx)) - Math.abs(b - (item.axis === 'x' ? cz : cx)))[0];
      const offsetChoices = CITY.roadCenters.filter((c) => Math.abs(c - (item.axis === 'x' ? cx : cz)) < 120);
      const around = offsetChoices.length ? offsetChoices : CITY.roadCenters;
      const near = around[index % around.length];
      item.travel = near + rand(rng, -14, 14) * density;
      item.dir = index % 4 < 2 ? 1 : -1;
      item.offset = laneOffset(item.axis, item.dir);
      sync(item);
      index += 1;
    }
  }

  return {
    cars,
    update,
    setLights,
    layoutAround,
    spawnOne,
    get positions() {
      return cars.map((item) => item.group.position);
    },
  };
}
