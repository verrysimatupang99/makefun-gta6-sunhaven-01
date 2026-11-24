import * as THREE from 'three';
import { CITY, PLAYER, clamp } from './config.js';

function material(color, roughness = 0.85) {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

export function makeCharacter(scene, options = {}) {
  const group = new THREE.Group();
  const shirt = material(options.shirt || '#d76a53');
  const pants = material(options.pants || '#34465b');
  const skin = material(options.skin || '#b07850');
  const hair = material(options.hair || '#2a1d16');
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.7, 4, 8), shirt);
  torso.position.y = 1.12;
  torso.castShadow = true;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 10), skin);
  head.position.y = 1.82;
  head.castShadow = true;
  group.add(head);
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.255, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.44), hair);
  hairCap.position.y = 1.9;
  group.add(hairCap);
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.52, 3, 6), shirt);
    arm.position.set(side * 0.42, 1.12, 0);
    arm.rotation.z = side * -0.13;
    arm.castShadow = true;
    group.add(arm);
    arms.push(arm);
  }
  const legs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.54, 3, 7), pants);
    leg.position.set(side * 0.17, 0.4, 0);
    leg.castShadow = true;
    group.add(leg);
    legs.push(leg);
  }
  const shoes = [];
  for (const side of [-1, 1]) {
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.14, 0.4), material('#302b27'));
    shoe.position.set(side * 0.17, 0.08, -0.07);
    shoe.castShadow = true;
    group.add(shoe);
    shoes.push(shoe);
  }
  group.userData.animation = { arms, legs, shoes, phase: options.phase || 0 };
  group.userData.kind = options.kind || 'player';
  scene.add(group);
  return group;
}

export function createPlayerController(scene, camera, input, world) {
  const object = makeCharacter(scene, { shirt: '#e2b45f', pants: '#46536a', skin: '#b07850', hair: '#2a1d16' });
  object.position.set(PLAYER.start.x, 0, PLAYER.start.z);
  const pivot = new THREE.Vector3();
  const desired = new THREE.Vector3();
  let yaw = 0;
  let pitch = 0.18;
  let verticalBob = 0;
  let lockMouse = { dx: 0, dy: 0 };

  function setPosition(x, z) {
    object.position.set(x, 0, z);
  }

  function update(dt) {
    const mouse = input.takeMouse();
    lockMouse = mouse;
    yaw -= mouse.dx * PLAYER.lookSpeed;
    pitch = clamp(pitch + mouse.dy * PLAYER.lookSpeed, -0.18, 0.7);
    if (world.activeCar) return;
    const axis = input.moveAxis();
    const length = Math.hypot(axis.x, axis.z);
    const running = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    const speed = running ? PLAYER.run : PLAYER.walk;
    if (length > 0) {
      const forwardX = Math.sin(yaw);
      const forwardZ = -Math.cos(yaw);
      const rightX = Math.cos(yaw);
      const rightZ = Math.sin(yaw);
      const nx = (forwardX * axis.z + rightX * axis.x) / Math.max(1, length);
      const nz = (forwardZ * axis.z + rightZ * axis.x) / Math.max(1, length);
      object.position.x += nx * speed * dt;
      object.position.z += nz * speed * dt;
      object.rotation.y = Math.atan2(nx, -nz);
      verticalBob += dt * (running ? 13 : 9);
    }
    object.position.x = clamp(object.position.x, -CITY.extent + 1, CITY.extent - 1);
    object.position.z = clamp(object.position.z, -CITY.extent + 1, CITY.beachZ + 72);
    const stride = length > 0 ? Math.sin(verticalBob) : 0;
    const animation = object.userData.animation;
    animation.legs.forEach((leg, index) => {
      leg.rotation.x = stride * 0.52 * (index === 0 ? 1 : -1);
    });
    animation.arms.forEach((arm, index) => {
      arm.rotation.x = -stride * 0.38 * (index === 0 ? 1 : -1);
    });
    object.position.y = length > 0 ? Math.abs(Math.sin(verticalBob * 2)) * 0.045 : 0;
    pivot.set(object.position.x, PLAYER.camHeight + object.position.y, object.position.z);
    const horizontal = PLAYER.camDistance * Math.cos(pitch);
    desired.set(
      pivot.x - Math.sin(yaw) * horizontal,
      pivot.y + PLAYER.camDistance * Math.sin(pitch),
      pivot.z + Math.cos(yaw) * horizontal,
    );
    camera.position.lerp(desired, 1 - Math.exp(-7 * dt));
    camera.lookAt(pivot.x + Math.sin(yaw) * 1.4, pivot.y + 0.05, pivot.z - Math.cos(yaw) * 1.4);
  }

  return { object, update, setPosition, get yaw() { return yaw; }, set yaw(value) { yaw = value; }, get mouseDelta() { return lockMouse; } };
}
