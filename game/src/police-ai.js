import * as THREE from 'three';
import { CITY, clamp } from './config.js';

function makeOfficer(scene, x, z, seed) {
  const group = new THREE.Group();
  const uniform = new THREE.MeshStandardMaterial({ color: '#233d5b', roughness: 0.72 });
  const skin = new THREE.MeshStandardMaterial({ color: seed % 2 ? '#b07850' : '#d5a273', roughness: 0.8 });
  const black = new THREE.MeshStandardMaterial({ color: '#17202b', roughness: 0.86 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.52, 3, 7), uniform);
  torso.position.y = 1.06;
  torso.castShadow = true;
  group.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), skin);
  head.position.y = 1.61;
  head.castShadow = true;
  group.add(head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.21, 0.12, 8), black);
  cap.position.y = 1.81;
  group.add(cap);
  const legs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.42, 3, 6), black);
    leg.position.set(side * 0.12, 0.35, 0);
    group.add(leg);
    legs.push(leg);
  }
  group.userData.legs = legs;
  group.position.set(x, 0, z);
  scene.add(group);
  return group;
}

export function createPoliceAI(scene, world, wanted) {
  const officers = [];
  let timer = 0;
  let enabled = false;

  function deploy(x, z) {
    enabled = true;
    while (officers.length < 2) {
      const side = officers.length ? -1 : 1;
      officers.push({ object: makeOfficer(scene, x + side * 3, z + 2, officers.length), speed: 0, phase: 0 });
    }
  }

  function clear() {
    for (const officer of officers) scene.remove(officer.object);
    officers.length = 0;
    enabled = false;
  }

  function update(dt) {
    if (world.wanted >= 3 && !enabled) {
      const target = world.activeCar || world.player.object;
      deploy(target.position.x, target.position.z);
    }
    if (world.wanted < 3 && enabled) clear();
    if (!enabled) return;
    timer += dt;
    const target = world.activeCar || world.player.object;
    officers.forEach((officer, index) => {
      const group = officer.object;
      const side = index === 0 ? -1 : 1;
      const wantedX = target.position.x + side * 3.3;
      const wantedZ = target.position.z + (world.activeCar ? 2 : -2);
      const dx = wantedX - group.position.x;
      const dz = wantedZ - group.position.z;
      const distance = Math.hypot(dx, dz);
      const pace = distance > 8 ? 3.1 : 0.9;
      const step = Math.min(distance, pace * dt);
      if (distance > 0.1) {
        group.position.x += dx / distance * step;
        group.position.z += dz / distance * step;
        group.rotation.y = Math.atan2(dx, dz);
      }
      officer.phase += dt * (distance > 1 ? 9 : 0);
      group.userData.legs[0].rotation.x = Math.sin(officer.phase) * 0.5;
      group.userData.legs[1].rotation.x = -Math.sin(officer.phase) * 0.5;
      group.position.y = distance > 1 ? Math.abs(Math.sin(officer.phase * 2)) * 0.03 : 0;
      if (distance < 1.5 && timer > 2.5) {
        timer = 0;
        if (world.hud) world.hud.toast('OFFICERS CLOSING IN');
      }
      group.position.x = clamp(group.position.x, -CITY.extent + 2, CITY.extent - 2);
      group.position.z = clamp(group.position.z, -CITY.extent + 2, CITY.extent + 2);
    });
  }

  function stage(x, z) {
    deploy(x, z);
    officers[0].object.position.set(x - 4.2, 0, z + 4.2);
    officers[1].object.position.set(x + 4.2, 0, z + 4.2);
    officers[0].object.rotation.y = Math.PI;
    officers[1].object.rotation.y = Math.PI;
  }

  return { update, deploy, clear, stage, get officers() { return officers; } };
}
