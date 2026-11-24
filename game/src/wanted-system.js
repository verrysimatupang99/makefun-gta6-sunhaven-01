import * as THREE from 'three';
import { CAR_TYPES, clamp, dist2 } from './config.js';
import { makeCar } from './drive-controller.js';

export function createWantedSystem(scene, world, drive, traffic, pedestrians) {
  const cops = [];
  const policeMat = new THREE.MeshStandardMaterial({ color: '#f43431', emissive: '#e5221e', emissiveIntensity: 0.4 });
  const blueMat = new THREE.MeshStandardMaterial({ color: '#328aff', emissive: '#236eff', emissiveIntensity: 0.4 });
  let wanted = 0;
  let decay = 0;
  let lastSighting = 0;
  let flashing = 0;
  let arrestTimer = 0;

  function add(amount, reason = '') {
    wanted = clamp(Math.max(wanted, wanted + amount), 0, 5);
    decay = 0;
    lastSighting = 0;
    if (reason && world.hud) world.hud.toast(reason);
    if (wanted > 0) ensureCops();
    syncWorld();
  }

  function syncWorld() {
    world.wanted = Math.floor(wanted);
    world.police = cops.map((cop) => cop.car);
    world.wantedProgress = wanted;
  }

  function makeCop(x, z, yaw) {
    const car = makeCar('police', scene, { x, z }, yaw, { ai: true });
    car.userData.policeAI = true;
    car.userData.speed = 0;
    const red = car.children.find((child) => child.material && child.material.color && child.material.color.getHexString() === 'ef3833');
    const blue = car.children.find((child) => child.material && child.material.color && child.material.color.getHexString() === '337fff');
    const headlamp = new THREE.SpotLight('#eef3ff', 0, 22, 0.65, 0.8, 1.4);
    headlamp.position.set(0, 1, -1.8);
    headlamp.target.position.set(0, 0, -10);
    car.add(headlamp, headlamp.target);
    cops.push({ car, red, blue, headlamp, speed: 0, sirenPhase: Math.random() * 6.28, pursuit: true, onFoot: false });
  }

  function ensureCops() {
    const needed = wanted >= 4 ? 3 : wanted >= 2 ? 2 : 1;
    while (cops.length < needed) {
      const target = world.activeCar ? world.activeCar.position : world.player.object.position;
      const angle = Math.random() * Math.PI * 2;
      const radius = 40 + cops.length * 12;
      makeCop(target.x + Math.sin(angle) * radius, target.z + Math.cos(angle) * radius, angle + Math.PI);
    }
  }

  function playerTarget() {
    return world.activeCar || world.player.object;
  }

  function update(dt) {
    const target = playerTarget();
    const speed = Math.abs(world.speed || 0);
    if (wanted > 0) {
      lastSighting += dt;
      const visible = cops.some((cop) => cop.car.position.distanceTo(target.position) < 55);
      if (visible) lastSighting = 0;
      else decay += dt;
      if (decay > 8 && lastSighting > 8) {
        wanted = Math.max(0, wanted - dt * 0.18);
        if (wanted < 0.08) wanted = 0;
      }
    }
    flashing += dt * 11;
    for (const cop of cops) {
      const car = cop.car;
      cop.sirenPhase += dt * 13;
      const pulse = Math.sin(cop.sirenPhase) > 0;
      if (cop.red && cop.blue) {
        cop.red.material = pulse ? policeMat : blueMat;
        cop.blue.material = pulse ? blueMat : policeMat;
      }
      cop.headlamp.intensity = world.night ? 8 : 0;
      if (wanted <= 0 && cop.car.position.distanceTo(target.position) > 110) {
        car.visible = false;
        continue;
      }
      car.visible = true;
      const dx = target.position.x - car.position.x;
      const dz = target.position.z - car.position.z;
      const desiredYaw = Math.atan2(dx, -dz);
      let delta = ((desiredYaw - car.rotation.y + Math.PI) % (Math.PI * 2)) - Math.PI;
      car.rotation.y += clamp(delta, -2.2 * dt, 2.2 * dt);
      const separation = Math.hypot(dx, dz);
      const targetSpeed = separation > 8 ? 19 + Math.min(speed, 10) : 10;
      cop.speed += clamp(targetSpeed - cop.speed, -10 * dt, 8 * dt);
      car.position.x += Math.sin(car.rotation.y) * cop.speed * dt;
      car.position.z -= Math.cos(car.rotation.y) * cop.speed * dt;
      for (const other of cops) {
        if (other === cop) continue;
        if (car.position.distanceTo(other.car.position) < 5) {
          car.position.x += (car.position.x - other.car.position.x) * dt * 2;
          car.position.z += (car.position.z - other.car.position.z) * dt * 2;
        }
      }
      car.userData.speed = cop.speed;
      if (separation < 2.5 && speed < 4) {
        arrestTimer += dt;
        if (arrestTimer > 4) {
          wanted = Math.max(0, wanted - 1);
          arrestTimer = 0;
          world.cash = Math.max(0, world.cash - 100);
          if (world.hud) world.hud.toast('CITATION PAID  -$100');
        }
      } else arrestTimer = 0;
    }
    syncWorld();
  }

  function onCarjack(car) {
    add(1, 'VEHICLE THEFT REPORTED');
  }

  function onPedHit(ped) {
    if (ped && pedestrians.knockDown(ped)) add(0.7, 'ASSAULT REPORTED');
  }

  function reset() {
    wanted = 0;
    decay = 0;
    lastSighting = 0;
    arrestTimer = 0;
    cops.forEach((cop) => {
      scene.remove(cop.car);
    });
    cops.length = 0;
    syncWorld();
  }

  function stage(value, x, z) {
    wanted = clamp(value, 0, 5);
    ensureCops();
    for (let i = 0; i < cops.length; i += 1) {
      const cop = cops[i];
      const angle = i === 0 ? 0.45 : i === 1 ? -0.75 : 2.2;
      const radius = i === 0 ? 19 : i === 1 ? 31 : 42;
      cop.car.position.set(x + Math.sin(angle) * radius, 0, z + Math.cos(angle) * radius);
      cop.car.rotation.y = angle + Math.PI;
      cop.car.visible = true;
      cop.sirenPhase = i * Math.PI;
    }
    syncWorld();
  }

  return { update, add, onCarjack, onPedHit, reset, stage, get level() { return Math.ceil(wanted); }, get exact() { return wanted; }, get cops() { return cops; } };
}
