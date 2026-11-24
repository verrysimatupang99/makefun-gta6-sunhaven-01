import * as THREE from 'three';
import { COLORS, clamp, lerp } from './config.js';

function rgb(r, g, b) {
  return new THREE.Color().setRGB(r / 255, g / 255, b / 255);
}

const SKY = {
  dayTop: rgb(74, 131, 191),
  dayHorizon: rgb(219, 233, 238),
  goldenTop: rgb(91, 134, 184),
  goldenHorizon: rgb(255, 191, 122),
  nightTop: rgb(9, 16, 34),
  nightHorizon: rgb(35, 44, 68),
  sunDay: rgb(255, 244, 220),
  sunGolden: rgb(255, 199, 128),
  sunNight: rgb(168, 190, 225),
};

function makeSky() {
  const geometry = new THREE.SphereGeometry(900, 32, 24);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    toneMapped: false,
    uniforms: {
      topColor: { value: SKY.goldenTop.clone() },
      horizonColor: { value: SKY.goldenHorizon.clone() },
      sunDir: { value: new THREE.Vector3(-0.6, 0.3, -0.4).normalize() },
      sunColor: { value: SKY.sunGolden.clone() },
      sunAmount: { value: 1 },
    },
    vertexShader: 'varying vec3 vWorld; void main(){ vec4 p=modelMatrix*vec4(position,1.0); vWorld=p.xyz; gl_Position=projectionMatrix*viewMatrix*p; }',
    fragmentShader: 'uniform vec3 topColor; uniform vec3 horizonColor; uniform vec3 sunDir; uniform vec3 sunColor; uniform float sunAmount; varying vec3 vWorld; void main(){ vec3 d=normalize(vWorld); float h=d.y; float t=smoothstep(-0.14,0.6,h); vec3 col=mix(horizonColor,topColor,t); float glow=pow(max(dot(d,sunDir),0.0),9.0); col+=sunColor*glow*sunAmount; gl_FragColor=vec4(col,1.0); }',
  });
  return new THREE.Mesh(geometry, material);
}

function makeSunSprite() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(255,247,219,1)');
  gradient.addColorStop(0.22, 'rgba(255,220,150,0.85)');
  gradient.addColorStop(0.55, 'rgba(255,176,96,0.25)');
  gradient.addColorStop(1, 'rgba(255,160,80,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(120, 120, 1);
  return sprite;
}

export function createDayNight(scene, renderer, world) {
  const hemisphere = new THREE.HemisphereLight('#ffd8a8', '#87694d', 1.7);
  scene.add(hemisphere);
  const fill = new THREE.DirectionalLight('#ffd4a6', 0.55);
  fill.position.set(150, 90, 180);
  scene.add(fill);
  const sun = new THREE.DirectionalLight('#ffe1b0', 2.5);
  sun.position.set(-90, 140, -75);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -250;
  sun.shadow.camera.right = 250;
  sun.shadow.camera.top = 250;
  sun.shadow.camera.bottom = -250;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 750;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.035;
  scene.add(sun);
  const sky = makeSky();
  scene.add(sky);
  const sunSprite = makeSunSprite();
  scene.add(sunSprite);
  const ambient = new THREE.AmbientLight('#ffe0bc', 0.38);
  scene.add(ambient);
  scene.background = SKY.goldenHorizon.clone();
  scene.fog = new THREE.FogExp2(COLORS.fog, 0.0014);
  let time = 0.72;
  let frozen = false;
  let lastNight = false;
  const skyTop = SKY.goldenTop.clone();
  const skyHorizon = SKY.goldenHorizon.clone();
  const sunColor = SKY.sunGolden.clone();
  const fogColor = new THREE.Color(COLORS.fog);

  function setTime(value) {
    time = clamp(value, 0, 1);
    frozen = true;
    update(0);
  }

  function update(dt) {
    if (!frozen) time = (time + dt * 0.00055) % 1;
    const hour = time * 24;
    const angle = ((hour - 6) / 12) * Math.PI;
    const elevation = Math.sin(angle);
    const golden = clamp((hour - 15) / 3, 0, 1);
    const night = clamp((hour - 19.2) / 3.2, 0, 1);
    const day = 1 - golden;
    const sunHeight = Math.max(26, elevation * 300);
    sun.position.set(Math.cos(angle) * 320, sunHeight, -120);
    sun.intensity = lerp(0.32, 2.7, clamp(elevation, 0, 1)) * (1 - night * 0.84);
    sunColor.copy(SKY.sunDay).lerp(SKY.sunGolden, golden).lerp(SKY.sunNight, night);
    sun.color.copy(sunColor);
    hemisphere.intensity = lerp(1.8, 0.52, night);
    hemisphere.color.copy(SKY.dayHorizon).lerp(SKY.goldenHorizon, golden).lerp(SKY.nightHorizon, night);
    hemisphere.groundColor.set(night > 0.4 ? '#2b2a34' : '#987653');
    fill.intensity = lerp(0.55, 0.08, night);
    ambient.intensity = lerp(0.38, 0.13, night);
    renderer.toneMappingExposure = lerp(1.18, 0.94, night);
    skyTop.copy(SKY.dayTop).lerp(SKY.goldenTop, golden).lerp(SKY.nightTop, night);
    skyHorizon.copy(SKY.dayHorizon).lerp(SKY.goldenHorizon, golden).lerp(SKY.nightHorizon, night);
    fogColor.copy(skyHorizon).multiplyScalar(0.92);
    scene.fog.color.copy(fogColor);
    scene.fog.density = lerp(0.00125, 0.0021, night);
    scene.background.copy(fogColor);
    const uniforms = sky.material.uniforms;
    uniforms.topColor.value.copy(skyTop);
    uniforms.horizonColor.value.copy(skyHorizon);
    uniforms.sunDir.value.copy(sun.position).normalize();
    uniforms.sunColor.value.copy(sunColor);
    uniforms.sunAmount.value = lerp(0.55, 1.25, golden) * (1 - night * 0.7);
    sunSprite.position.copy(sun.position).normalize().multiplyScalar(760);
    sunSprite.material.opacity = clamp(elevation * 1.7 + 0.05, 0, 0.95) * (1 - night * 0.75);
    sunSprite.scale.setScalar(lerp(150, 100, golden));
    world.dusk = clamp(golden * (1 - night * 0.7), 0, 1);
    world.night = night;
    world.timeOfDay = time;
    world.hour = hour;
    lastNight = night > 0.3;
  }

  function registerLight() {}

  return {
    update,
    setTime,
    registerLight,
    sun,
    hemisphere,
    get time() { return time; },
    get dusk() { return world.dusk || 0; },
    get lightsOn() { return lastNight; },
  };
}
