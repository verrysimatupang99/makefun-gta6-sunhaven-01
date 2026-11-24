import * as THREE from 'three';
import { CITY, LANDMARK_POSITIONS } from './config.js';

const MISSIONS = [
  {
    id: 'meet-vinny',
    title: 'PICK UP VINNY',
    briefing: 'VINNY COSTA HAS A LEAD. HEAD TO HIS GARAGE.',
    marker: { x: LANDMARK_POSITIONS["Vinny's Imports"].x, z: LANDMARK_POSITIONS["Vinny's Imports"].z },
    landmarkName: "Vinny's Imports",
    target: 'Vinny Costa',
    reward: 250,
    next: 'deliver-package',
  },
  {
    id: 'deliver-package',
    title: 'DELIVER THE PACKAGE',
    briefing: 'MARISOL NEEDS THE PACKAGE BEFORE SUNSET.',
    marker: { x: LANDMARK_POSITIONS["Marisol's Cantina"].x, z: LANDMARK_POSITIONS["Marisol's Cantina"].z },
    landmarkName: "Marisol's Cantina",
    target: 'Marisol',
    reward: 650,
    next: 'lose-heat',
  },
  {
    id: 'lose-heat',
    title: 'LOSE THE HEAT',
    briefing: 'THE POLICE ARE ON TO YOU. BREAK LINE OF SIGHT.',
    marker: { x: LANDMARK_POSITIONS['Sunhaven Diner'].x, z: LANDMARK_POSITIONS['Sunhaven Diner'].z },
    landmarkName: 'Sunhaven Diner',
    target: 'Safehouse',
    reward: 900,
    next: 'last-drop',
  },
  {
    id: 'last-drop',
    title: 'PICK UP THE DOCKMASTER',
    briefing: 'THE DOCKMASTER HAS ONE LAST JOB AT THE PIER.',
    marker: { x: LANDMARK_POSITIONS['Dockmaster Marine'].x, z: LANDMARK_POSITIONS['Dockmaster Marine'].z },
    landmarkName: 'Dockmaster Marine',
    target: 'The Dockmaster',
    reward: 1600,
    next: null,
  },
];

function makeBeacon(scene) {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.12, 8, 48), new THREE.MeshStandardMaterial({ color: '#f0c45e', emissive: '#f3a333', emissiveIntensity: 1.6, roughness: 0.32 }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.16;
  group.add(ring);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 3.8, 12), new THREE.MeshStandardMaterial({ color: '#f4d177', emissive: '#df9434', emissiveIntensity: 1.4, transparent: true, opacity: 0.63 }));
  stem.position.y = 2.1;
  group.add(stem);
  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.65, 8), new THREE.MeshStandardMaterial({ color: '#fff0bc', emissive: '#efb941', emissiveIntensity: 1.8 }));
  crown.position.y = 4.2;
  group.add(crown);
  const light = new THREE.PointLight('#f4bd58', 3.4, 18, 2);
  light.position.y = 2.5;
  group.add(light);
  group.userData.ring = ring;
  scene.add(group);
  return group;
}

export function createMissions(scene, world, save) {
  const marker = makeBeacon(scene);
  const landmarks = world.city ? world.city.landmarks : {};
  for (const mission of MISSIONS) {
    const found = mission.landmarkName ? landmarks[mission.landmarkName] : null;
    if (found) mission.marker = { x: found.x, z: found.z };
  }
  const indexById = new Map(MISSIONS.map((mission, index) => [mission.id, index]));
  let stage = 0;
  let completePulse = 0;
  let active = false;
  let lastMission = null;

  function current() {
    return MISSIONS[Math.min(stage, MISSIONS.length - 1)];
  }

  function setStage(value, start = true) {
    stage = Math.max(0, Math.min(MISSIONS.length, value | 0));
    active = start && stage < MISSIONS.length;
    const mission = active ? current() : null;
    if (mission) marker.position.set(mission.marker.x, 0, mission.marker.z);
    marker.visible = Boolean(mission);
    world.mission = mission;
    world.missionStage = stage;
    if (save) save({ missionStage: stage });
  }

  function start() {
    if (stage >= MISSIONS.length) setStage(0, true);
    active = true;
    marker.visible = true;
    if (world.hud) world.hud.toast(current().briefing);
  }

  function complete() {
    if (!active || stage >= MISSIONS.length) return false;
    const mission = current();
    active = false;
    lastMission = mission;
    world.cash += mission.reward;
    world.missionComplete = { title: mission.title, reward: mission.reward, target: mission.target };
    world.mission = null;
    marker.visible = false;
    completePulse = 3.8;
    if (world.hud) world.hud.toast(`${mission.target.toUpperCase()} PAID YOU $${mission.reward}`);
    if (mission.next) {
      const nextIndex = indexById.get(mission.next);
      stage = nextIndex;
      active = true;
      marker.position.set(current().marker.x, 0, current().marker.z);
      marker.visible = true;
      world.mission = current();
      world.missionStage = stage;
      if (current().id === 'lose-heat' && world.wantedSystem) world.wantedSystem.add(2, 'POLICE ALERTED');
      if (world.hud) world.hud.toast(current().briefing);
    } else {
      stage = MISSIONS.length;
      active = false;
      world.missionStage = stage;
      world.storyComplete = true;
    }
    if (save) save({ missionStage: stage, cash: world.cash });
    return true;
  }

  function update(dt) {
    if (active) {
      const actor = world.activeCar || world.player.object;
      const canFinish = current().id !== 'lose-heat' || !world.wanted;
      if (actor && canFinish && Math.hypot(actor.position.x - marker.position.x, actor.position.z - marker.position.z) < (world.activeCar ? 7 : 3.2)) complete();
      const ring = marker.userData.ring;
      if (ring) {
        ring.rotation.z += dt * 0.9;
        ring.scale.setScalar(1 + Math.sin(performance.now() * 0.002) * 0.08);
      }
    }
    if (completePulse > 0) {
      completePulse -= dt;
      if (completePulse <= 0) world.missionComplete = null;
    }
  }

  function stageScene(id) {
    const index = indexById.get(id) ?? 0;
    stage = index;
    active = true;
    const mission = current();
    marker.visible = true;
    marker.position.set(mission.marker.x, 0, mission.marker.z);
    world.mission = mission;
    world.missionStage = stage;
    world.missionComplete = null;
  }

  function restore(value) {
    const restored = value && Number.isFinite(value.missionStage) ? value.missionStage : 0;
    setStage(restored, true);
    if (value && Number.isFinite(value.cash)) world.cash = value.cash;
  }

  setStage(0, true);

  return { marker, update, start, complete, stageScene, restore, setStage, get stage() { return stage; }, get mission() { return current(); }, get active() { return active; }, get missions() { return MISSIONS; }, get lastMission() { return lastMission; } };
}
