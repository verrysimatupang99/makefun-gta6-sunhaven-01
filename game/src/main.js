import * as THREE from 'three';
import { CITY, STEP, START_CASH } from './config.js';
import { buildCity } from './city-generator.js';
import { createDayNight } from './day-night.js';
import { createInput } from './input.js';
import { createPlayerController } from './player-controller.js';
import { createDriveController } from './drive-controller.js';
import { createTraffic } from './traffic-system.js';
import { createPedestrians } from './pedestrians.js';
import { createWantedSystem } from './wanted-system.js';
import { createPoliceAI } from './police-ai.js';
import { createMissions } from './missions.js';
import { createHUD } from './hud.js';
import { createAudio } from './audio.js';
import { loadSave, saveGame, clearSave } from './save-system.js';
import { createMenus } from './menus.js';
import { applyShot } from './shot-scenes.js';

const canvas = document.getElementById('game');
const query = new URLSearchParams(window.location.search);
const shot = query.get('shot');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, new URLSearchParams(window.location.search).has('shot') ? 1 : 1.25));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#e5a975');
const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 1400);
const world = {
  renderer,
  camera,
  cash: START_CASH,
  wanted: 0,
  speed: 0,
  activeCar: null,
  nearCar: null,
  police: [],
  mission: null,
  missionStage: 0,
  missionComplete: null,
  storyComplete: false,
  gameState: 'title',
  dusk: 0,
  night: 0,
  timeOfDay: 0.38,
  carsOwned: [],
  isShot: false,
};

const city = buildCity(scene, Number.parseInt(new URLSearchParams(window.location.search).get('seed') || '7', 10));
world.city = city;
const dayNight = createDayNight(scene, renderer, world);
world.dayNight = dayNight;
dayNight.update(0);
city.setNightLights(false);
const input = createInput(canvas);
const player = createPlayerController(scene, camera, input, world);
world.player = player;
player.setPosition(0, 0);
camera.position.set(24, 12, 42);
camera.lookAt(0, 2, 0);
const drive = createDriveController(scene, camera, input, world, player);
world.drive = drive;
world.activeCar = null;
city.parkedCars.forEach((car) => drive.adopt(car));
const traffic = createTraffic(scene, world, 25, 99);
world.traffic = traffic;
const pedestrians = createPedestrians(scene, world, 40, 21);
world.pedestrians = pedestrians;
const wanted = createWantedSystem(scene, world, drive, traffic, pedestrians);
world.wantedSystem = wanted;
world.onCarjack = (car) => {
  wanted.onCarjack(car);
  audio.chime('cash');
  hud.toast('VEHICLE STOLEN');
};
const policeAI = createPoliceAI(scene, world, wanted);
world.policeAI = policeAI;
const hud = createHUD(world);
world.hud = hud;
const audio = createAudio();
world.audio = audio;
let missions;
const save = (patch = {}) => saveGame({ cash: world.cash, missionStage: missions ? missions.stage : world.missionStage, carType: world.activeCar?.userData.type || null, wanted: world.wanted, ...patch });
missions = createMissions(scene, world, save);
world.missions = missions;
window.__world = world;
const menus = createMenus({
  onStart: startNew,
  onContinue: continueGame,
  onResume: resumeGame,
  onSaveQuit: saveAndQuit,
});

let accumulator = 0;
let lastTime = performance.now();
let frameCount = 0;
const MAX_FRAME = 0.2;

function resize() {
  const width = Math.max(1, window.innerWidth);
  const height = Math.max(1, window.innerHeight);
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

function spawnTrafficAndPeds() {
  traffic.cars.forEach((item) => { item.group.visible = true; });
  pedestrians.peds.forEach((ped) => { ped.group.visible = true; });
}

function startNew() {
  clearSave();
  world.cash = START_CASH;
  world.wanted = 0;
  world.speed = 0;
  wanted.reset();
  world.player.object.visible = true;
  world.player.setPosition(7, 34);
  world.activeCar = null;
  spawnTrafficAndPeds();
  missions.setStage(0, true);
  missions.start();
  menus.hideTitle();
  world.gameState = 'playing';
  input.lock();
  audio.resume();
  audio.chime('mission');
  save();
}

function continueGame() {
  const data = loadSave();
  if (!data) return startNew();
  world.cash = data.cash;
  world.wanted = 0;
  world.player.object.visible = true;
  world.player.setPosition(7, 34);
  world.activeCar = null;
  spawnTrafficAndPeds();
  wanted.reset();
  missions.restore(data);
  menus.hideTitle();
  world.gameState = 'playing';
  input.lock();
  audio.resume();
  if (world.hud) world.hud.toast('WELCOME BACK TO SUNHAVEN');
}

function resumeGame() {
  menus.hidePause();
  world.gameState = 'playing';
  lastTime = performance.now();
  input.lock();
  audio.resume();
}

function saveAndQuit() {
  save();
  if (world.activeCar) drive.exit();
  wanted.reset();
  menus.hidePause();
  menus.showTitle();
  world.gameState = 'title';
  input.unlock();
}

function togglePause() {
  if (!menus.playing) return;
  if (menus.paused) resumeGame();
  else {
    save();
    world.gameState = 'paused';
    menus.showPause();
    input.unlock();
  }
}

function handleGlobalInput() {
  if (input.wasPressed('Escape')) {
    if (menus.paused) resumeGame();
    else if (menus.playing) togglePause();
  }
  if (input.wasPressed('KeyM')) {
    const muted = audio.toggleMute();
    hud.toast(muted ? 'AUDIO MUTED' : 'AUDIO ON');
  }
  if (input.wasPressed('KeyE') && menus.playing) audio.resume();
}

function update(dt) {
  if (world.gameState !== 'playing') return;
  player.update(dt);
  drive.update(dt);
  traffic.update(dt, world.activeCar);
  pedestrians.update(dt);
  wanted.update(dt);
  policeAI.update(dt);
  missions.update(dt);
  dayNight.update(dt);
  city.setNightLights(world.night > 0.3);
  const actor = world.activeCar || player.object;
  if (world.activeCar && Math.abs(world.speed || 0) > 8) {
    const hit = pedestrians.nearest(actor.position, 1.8);
    if (hit) wanted.onPedHit(hit);
  }
  const onBeach = actor.position.z > CITY.beachZ - 8;
  audio.setEngine(Boolean(world.activeCar), world.speed || 0);
  audio.setSiren(world.wanted || 0);
  audio.setWaves(onBeach);
  if (world.activeCar && Math.abs(world.speed || 0) > 18 && world.activeCar.userData.speed > 20) {
    const near = traffic.cars.find((item) => item.group.visible && item.group.position.distanceTo(world.activeCar.position) < 3.4);
    if (near && !world.activeCar.userData.lastCollision || near && performance.now() - world.activeCar.userData.lastCollision > 1300) {
      world.activeCar.userData.lastCollision = performance.now();
      world.activeCar.userData.speed *= 0.52;
      world.speed = world.activeCar.userData.speed;
      audio.crash();
      hud.toast('TRAFFIC COLLISION');
    }
  }
  world.hud.frame();
}

function frame(now) {
  requestAnimationFrame(frame);
  const elapsed = Math.min((now - lastTime) / 1000, MAX_FRAME);
  lastTime = now;
  handleGlobalInput();
  if (world.gameState === 'playing') {
    accumulator += elapsed;
    let steps = 0;
    while (accumulator >= STEP && steps < 12) {
      update(STEP);
      accumulator -= STEP;
      steps += 1;
    }
  } else {
    accumulator = 0;
    dayNight.update(elapsed);
  }
  if (!world.isShot) {
    renderer.render(scene, camera);
  }
  input.endFrame();
}

if (shot) {
  document.body.classList.add('is-shot');
  world.hud = hud;
  applyShot(scene, shot, world);
  let shotFrames = 0;
  function paintShot() {
    renderer.render(scene, camera);
    shotFrames += 1;
    frameCount = shotFrames;
    if (shotFrames < 2) requestAnimationFrame(paintShot);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paintShot);
} else {
  menus.showTitle();
  world.hud.frame();
  requestAnimationFrame(frame);
}
