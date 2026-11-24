import * as THREE from 'three';
import { CAR, CAR_TYPES, CITY, COLORS, clamp, damp } from './config.js';

const bodyMat = (color, roughness = 0.42, metalness = 0.18) => new THREE.MeshStandardMaterial({ color, roughness, metalness });

export function makeCar(type = 'sedan', scene, position = { x: 0, z: 0 }, rotation = 0, options = {}) {
  const spec = CAR_TYPES[type] || CAR_TYPES.sedan;
  const group = new THREE.Group();
  group.position.set(position.x || 0, 0, position.z || 0);
  group.rotation.y = rotation;
  group.userData.type = type;
  group.userData.spec = spec;
  group.userData.speed = options.speed || 0;
  group.userData.laneVelocity = 0;
  const paint = bodyMat(options.color || spec.color);
  const darkPaint = bodyMat(type === 'police' ? '#152d46' : '#333b40', 0.34);
  const glass = new THREE.MeshStandardMaterial({ color: '#37525d', roughness: 0.2, metalness: 0.34, emissive: '#15262c', emissiveIntensity: 0.22 });
  const chrome = bodyMat('#9ba5a1', 0.25, 0.72);
  const tire = bodyMat('#252626', 0.92);
  const headlightMat = new THREE.MeshStandardMaterial({ color: '#fff0be', emissive: '#ffca67', emissiveIntensity: 0.22 });
  const tailMat = new THREE.MeshStandardMaterial({ color: '#b63e34', emissive: '#7d1812', emissiveIntensity: 0.14 });
  const length = spec.length;
  const width = spec.width;
  const h = spec.height;
  const wheelList = [];
  const base = new THREE.Mesh(new THREE.BoxGeometry(width, h * 0.45, length), paint);
  base.position.y = h * 0.49;
  base.castShadow = true;
  group.add(base);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(width * 0.92, h * 0.18, length * 0.28), paint);
  hood.position.set(0, h * 0.64, -length * 0.32);
  group.add(hood);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(width * 0.78, h * 0.48, length * 0.48), type === 'police' ? darkPaint : glass);
  cabin.position.set(0, h * 0.88, length * 0.02);
  cabin.castShadow = true;
  group.add(cabin);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(width * 0.72, h * 0.06, length * 0.35), paint);
  roof.position.set(0, h * 1.13, length * 0.04);
  group.add(roof);
  if (type === 'taxi') {
    const topper = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.16, 0.4), bodyMat('#f3d46d'));
    topper.position.y = h * 1.23;
    group.add(topper);
  }
  if (type === 'police') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.16, 0.28), bodyMat('#1b2832'));
    bar.position.set(0, h * 1.22, 0.05);
    group.add(bar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.24), new THREE.MeshStandardMaterial({ color: '#ef3833', emissive: '#ff2018', emissiveIntensity: 0.3 }));
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.24), new THREE.MeshStandardMaterial({ color: '#337fff', emissive: '#146aff', emissiveIntensity: 0.3 }));
    red.position.set(-0.28, h * 1.24, 0.05);
    blue.position.set(0.28, h * 1.24, 0.05);
    group.add(red, blue);
    group.userData.siren = { red, blue, phase: 0 };
  }
  for (const z of [-length * 0.35, length * 0.34]) {
    for (const x of [-width * 0.52, width * 0.52]) {
      const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.2, 12);
      wheelGeo.rotateZ(Math.PI / 2);
      const wheel = new THREE.Mesh(wheelGeo, tire);
      wheel.position.set(x, 0.38, z);
      wheel.castShadow = true;
      group.add(wheel);
      wheelList.push(wheel);
      const hubGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.21, 10);
      hubGeo.rotateZ(Math.PI / 2);
      const hub = new THREE.Mesh(hubGeo, chrome);
      hub.position.set(x, 0.38, z);
      group.add(hub);
    }
  }
  for (const x of [-width * 0.34, width * 0.34]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.22, 0.11), headlightMat);
    head.position.set(x, h * 0.54, -length / 2 - 0.02);
    group.add(head);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.11), tailMat);
    tail.position.set(x, h * 0.53, length / 2 + 0.02);
    group.add(tail);
  }
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(width * 1.4, length * 1.25), new THREE.MeshBasicMaterial({ color: '#252729', transparent: true, opacity: 0.2, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);
  if (scene) scene.add(group);
  group.userData.headlights = [headlightMat];
  group.userData.wheels = wheelList;
  return group;
}

export function createDriveController(scene, camera, input, world, playerController) {
  const cars = [];
  let steering = 0;
  const chaseTarget = new THREE.Vector3();
  const chasePosition = new THREE.Vector3();

  function spawnCar(type = 'sedan', x = 0, z = 0, yaw = 0, options = {}) {
    const car = makeCar(type, scene, { x, z }, yaw, options);
    car.userData.ai = Boolean(options.ai);
    car.userData.parked = Boolean(options.parked);
    car.userData.cruise = options.cruise || 0;
    car.userData.id = options.id || `${type}-${cars.length}`;
    cars.push(car);
    return car;
  }

  function adopt(car) {
    if (!car) return;
    car.userData.parked = true;
    car.userData.ai = false;
    cars.push(car);
  }

  function blocked(x, z, pad = 1.1) {
    const colliders = world.city ? world.city.colliders : [];
    for (const c of colliders) {
      if (x > c.minX - pad && x < c.maxX + pad && z > c.minZ - pad && z < c.maxZ + pad) return true;
    }
    return false;
  }

  function nearestCar(max = 4.3) {
    let closest = null;
    let best = max;
    for (const car of cars) {
      if (car.userData.disabled || car.userData.ai && !car.userData.parked) continue;
      const distance = car.position.distanceTo(playerController.object.position);
      if (distance < best) {
        closest = car;
        best = distance;
      }
    }
    return closest;
  }

  function enter(car) {
    if (!car || world.activeCar) return false;
    world.activeCar = car;
    playerController.object.visible = false;
    car.userData.parked = false;
    world.carjacked = !car.userData.ai;
    if (world.onCarjack) world.onCarjack(car);
    return true;
  }

  function exit() {
    const car = world.activeCar;
    if (!car) return false;
    const side = new THREE.Vector3(1.3, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), car.rotation.y);
    const out = car.position.clone().add(side);
    playerController.object.position.set(out.x, 0, out.z);
    playerController.object.rotation.y = car.rotation.y;
    playerController.object.visible = true;
    world.activeCar = null;
    world.carjacked = false;
    return true;
  }

  function update(dt) {
    if (!world.activeCar) {
      if (input.wasPressed('KeyE')) {
        const car = nearestCar();
        if (car) enter(car);
      }
      const candidate = nearestCar();
      world.nearCar = candidate;
      return;
    }
    const car = world.activeCar;
    world.nearCar = null;
    if (input.wasPressed('KeyE')) {
      exit();
      return;
    }
    const spec = car.userData.spec || CAR_TYPES.sedan;
    let speed = car.userData.speed || 0;
    const throttle = (input.isDown('KeyW') || input.isDown('ArrowUp') ? 1 : 0) - (input.isDown('KeyS') || input.isDown('ArrowDown') ? 1 : 0);
    const steerInput = (input.isDown('KeyA') || input.isDown('ArrowLeft') ? 1 : 0) - (input.isDown('KeyD') || input.isDown('ArrowRight') ? 1 : 0);
    if (throttle > 0) speed += (spec.accel || CAR.accel) * dt;
    else if (throttle < 0) speed -= CAR.brake * dt;
    else speed -= Math.sign(speed) * CAR.drag * dt;
    speed = clamp(speed, -8, spec.maxSpeed || 28);
    steering = damp(steering, steerInput, CAR.steerRate, dt);
    const driftScale = 1 + Math.min(1, Math.abs(speed) / 20) * 0.35;
    const handbrake = input.isDown('Space');
    car.rotation.y += steering * CAR.maxSteer * dt * Math.max(0.18, Math.abs(speed) / 9) * Math.sign(speed || 1) * driftScale * (handbrake ? 1.3 : 1);
    const forward = new THREE.Vector3(Math.sin(car.rotation.y), 0, -Math.cos(car.rotation.y));
    const lateral = new THREE.Vector3(Math.cos(car.rotation.y), 0, Math.sin(car.rotation.y));
    const lateralSpeed = car.userData.laneVelocity || 0;
    const drift = lateralSpeed + steering * speed * CAR.drift * dt * 60 * (handbrake ? 2.1 : 1);
    car.userData.laneVelocity = damp(drift, 0, handbrake ? 1.5 : CAR.grip, dt);
    const nextX = car.position.x + forward.x * speed * dt + lateral.x * car.userData.laneVelocity * dt;
    const nextZ = car.position.z + forward.z * speed * dt + lateral.z * car.userData.laneVelocity * dt;
    if (!blocked(nextX, car.position.z)) car.position.x = nextX;
    else { speed *= -0.12; car.userData.laneVelocity *= 0.2; }
    if (!blocked(car.position.x, nextZ)) car.position.z = nextZ;
    else { speed *= -0.12; car.userData.laneVelocity *= 0.2; }
    car.position.x = clamp(car.position.x, -CITY.extent + 2, CITY.extent - 2);
    car.position.z = clamp(car.position.z, -CITY.extent + 2, CITY.beachZ + 76);
    car.userData.speed = speed;
    car.userData.siren && (car.userData.siren.phase += dt * 15);
    for (const wheel of car.userData.wheels || []) wheel.rotation.x += speed * dt * 2.3;
    chaseTarget.set(car.position.x, 1.1, car.position.z);
    chasePosition.copy(car.position).addScaledVector(forward, -CAR.cameraBack).add(new THREE.Vector3(0, CAR.cameraHeight, 0));
    camera.position.lerp(chasePosition, 1 - Math.exp(-5 * dt));
    camera.lookAt(chaseTarget);
    world.speed = speed;
  }

  return { cars, spawnCar, adopt, nearestCar, blocked, enter, exit, update, makeCar: (type, pos, yaw, options) => spawnCar(type, pos.x, pos.z, yaw, options), get steering() { return steering; } };
}
