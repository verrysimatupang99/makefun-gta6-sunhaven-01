import { mulberry32 } from './config.js';

function place(camera, position, target, fov = 56) {
  camera.position.set(position.x, position.y, position.z);
  camera.fov = fov;
  camera.updateProjectionMatrix();
  camera.lookAt(target.x, target.y, target.z);
}

function finish(world, label) {
  const title = document.getElementById('title-screen');
  const pause = document.getElementById('pause-menu');
  if (title) { title.classList.remove('visible'); title.style.display = 'none'; }
  if (pause) { pause.classList.remove('visible'); pause.style.display = 'none'; }
  const shotLabel = document.getElementById('shot-label');
  if (shotLabel) shotLabel.textContent = label;
  world.hud.frame();
  world.renderer.render(world.scene, world.camera);
}

function stageCover(world, seed) {
  const { player, drive, traffic, pedestrians, missions, dayNight } = world;
  const wantedSystem = world.wantedSystem;
  dayNight.setTime(0.73);
  world.city.setNightLights(false);
  world.cash = 2840;
  wantedSystem.stage(3, -31, 265);
  const car = drive.spawnCar('sport', -19.5, 272, Math.PI, { parked: true, color: '#bf3033' });
  car.userData.parked = true;
  car.userData.headlights.forEach((mat) => { mat.emissiveIntensity = 0.5; });
  player.setPosition(-15, 267);
  player.object.rotation.y = -0.7;
  player.object.visible = true;
  world.activeCar = null;
  world.nearCar = car;
  world.speed = 0;
  traffic.layoutAround(-26, 270, 0.9);
  traffic.cars.forEach((item) => { item.wait = 40; });
  pedestrians.layoutAround(-26, 270, mulberry32(seed + 13));
  missions.marker.visible = false;
  world.mission = { title: 'DELIVER THE PACKAGE', briefing: 'MARISOL IS WAITING AT THE CANTINA', marker: { x: -33, z: 0 } };
  for (const [index, cop] of wantedSystem.cops.entries()) {
    cop.car.position.set(-33 + index * 1.6, 0, 264 - index * 2.8);
    cop.car.rotation.y = Math.PI * 0.84;
    cop.red.material.emissiveIntensity = 4.2;
    cop.blue.material.emissiveIntensity = 3.8;
  }
  place(world.camera, { x: -4.5, y: 8.2, z: 248 }, { x: -19, y: 2.2, z: 270 }, 66);
  world.hud.setStars(3);
  world.hud.setCash(world.cash);
  world.hud.setObjective(world.mission);
  world.hud.setPrompt('STEAL SPORT');
  world.hud.setSpeed(0, false);
}

function stageCity(world, seed) {
  const { traffic, pedestrians, missions, dayNight, player } = world;
  const wantedSystem = world.wantedSystem;
  dayNight.setTime(0.43);
  world.city.setNightLights(false);
  world.cash = 2840;
  wantedSystem.reset();
  world.activeCar = null;
  world.nearCar = null;
  world.speed = 0;
  player.setPosition(31, 36);
  player.object.visible = true;
  player.object.rotation.y = 2.4;
  traffic.layoutAround(26, 26, 1.4);
  traffic.cars.forEach((item) => {
    item.wait = 40;
    item.group.visible = true;
  });
  pedestrians.layoutAround(26, 26, mulberry32(seed + 19));
  for (const ped of pedestrians.peds) ped.group.visible = true;
  missions.marker.visible = false;
  world.mission = { title: 'SUNHAVEN BAY', briefing: 'THE WHOLE CITY IS YOURS TODAY', marker: { x: 26, z: 26 } };
  place(world.camera, { x: 112, y: 116, z: -125 }, { x: 18, y: 2, z: 108 }, 62);
  world.hud.setStars(0);
  world.hud.setCash(world.cash);
  world.hud.setObjective(world.mission);
  world.hud.setPrompt('');
  world.hud.setSpeed(0, false);
}

function stageChase(world) {
  const { player, drive, traffic, pedestrians, missions, dayNight } = world;
  const wantedSystem = world.wantedSystem;
  dayNight.setTime(0.9);
  world.city.setNightLights(true);
  world.cash = 2840;
  player.object.visible = false;
  world.nearCar = null;
  const car = drive.spawnCar('sport', 26, 10, 0.98, { color: '#be3435' });
  car.userData.speed = 23;
  car.userData.laneVelocity = -1.8;
  car.userData.headlights.forEach((mat) => { mat.emissiveIntensity = 2.6; });
  world.activeCar = car;
  world.speed = 23;
  wantedSystem.stage(4, 26, -14);
  let flip = false;
  for (const cop of wantedSystem.cops) {
    cop.car.userData.headlights.forEach((mat) => { mat.emissiveIntensity = 2.4; });
    cop.red.material.emissiveIntensity = flip ? 0.1 : 4.2;
    cop.blue.material.emissiveIntensity = flip ? 4.2 : 0.1;
    if (cop.car.userData.siren) {
      cop.car.userData.siren.red.material.emissiveIntensity = flip ? 0.1 : 4.2;
      cop.car.userData.siren.blue.material.emissiveIntensity = flip ? 4.2 : 0.1;
    }
    cop.sirenPhase = flip ? Math.PI : 0;
    flip = !flip;
  }
  traffic.layoutAround(26, 10, 0.8);
  traffic.cars.forEach((item, index) => {
    item.wait = 40;
    item.group.visible = index < 9;
  });
  for (const ped of pedestrians.peds) ped.group.visible = false;
  missions.marker.visible = false;
  world.mission = { title: 'LOSE THE HEAT', briefing: 'THEY ARE RIGHT ON YOUR TAIL', marker: { x: -130, z: -130 } };
  place(world.camera, { x: 16.5, y: 4.2, z: 21 }, { x: 27, y: 1.1, z: 9 }, 56);
  world.hud.setStars(3);
  world.hud.setCash(world.cash);
  world.hud.setObjective(world.mission);
  world.hud.setPrompt('');
  world.hud.setSpeed(95, true);
}

function stageMission(world, seed) {
  const { player, traffic, pedestrians, missions, dayNight } = world;
  const wantedSystem = world.wantedSystem;
  dayNight.setTime(0.73);
  world.city.setNightLights(false);
  world.cash = 2840;
  wantedSystem.reset();
  world.activeCar = null;
  world.nearCar = null;
  world.speed = 0;
  const landmark = world.city.landmarks["Marisol's Cantina"] || { x: -33, z: 0 };
  missions.stageScene('deliver-package');
  missions.marker.position.set(landmark.x, 0, landmark.z);
  missions.marker.visible = true;
  player.setPosition(landmark.x - 4.2, landmark.z + 5);
  player.object.rotation.y = Math.PI * 0.75;
  player.object.visible = true;
  traffic.layoutAround(-26, 0, 0.25);
  traffic.cars.forEach((item, index) => {
    item.wait = 45;
    item.group.visible = index < 7;
  });
  pedestrians.layoutAround(-26, 0, mulberry32(seed + 29));
  for (const ped of pedestrians.peds) ped.group.visible = true;
  world.mission = missions.mission;
  place(world.camera, { x: landmark.x + 11, y: 5.2, z: landmark.z + 14 }, { x: landmark.x - 0.5, y: 1.9, z: landmark.z }, 50);
  world.hud.setStars(0);
  world.hud.setCash(world.cash);
  world.hud.setObjective(world.mission);
  world.hud.setPrompt('');
  world.hud.setSpeed(0, false);
}

export function applyShot(scene, name, world) {
  const value = Number.parseInt(new URLSearchParams(window.location.search).get('seed') || '7', 10);
  const seed = Number.isFinite(value) ? value : 7;
  world.isShot = true;
  world.scene = scene;
  world.gameState = 'playing';
  world.audio.setEngine(false, 0);
  world.audio.setSiren(0);
  if (name === 'city') stageCity(world, seed);
  else if (name === 'chase') stageChase(world);
  else if (name === 'mission') stageMission(world, seed);
  else stageCover(world, seed);
  world.traffic.setLights(name === 'chase');
  world.pedestrians.update(0.12);
  world.traffic.update(0.016, null);
  world.hud.frame();
  scene.updateMatrixWorld(true);
  world.renderer.render(scene, world.camera);
  const labels = { cover: 'NORTH COAST BOULEVARD', city: 'SUNHAVEN BAY · 4:38 PM', chase: 'NIGHT SHIFT · POLICE PURSUIT', mission: 'MARISOL · LITTLE HAVANA' };
  finish(world, labels[name] || labels.cover);
  requestAnimationFrame(() => {
    scene.updateMatrixWorld(true);
    world.renderer.render(scene, world.camera);
    window.__shotReady = true;
  });
  if (name === 'chase') {
    const sirens = world.wantedSystem.cops.map((cop) => cop.car.userData.siren).filter(Boolean);
    const animateSirens = (time) => {
      const pulse = Math.sin(time * 0.012) > 0;
      for (const siren of sirens) {
        siren.red.material.emissiveIntensity = pulse ? 4.8 : 0.08;
        siren.blue.material.emissiveIntensity = pulse ? 0.08 : 4.8;
      }
      world.renderer.render(scene, world.camera);
      requestAnimationFrame(animateSirens);
    };
    requestAnimationFrame(animateSirens);
  }
}
