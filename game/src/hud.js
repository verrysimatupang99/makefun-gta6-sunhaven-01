import { CITY, COLORS, clamp } from './config.js';

function el(id) {
  return document.getElementById(id);
}

export function createHUD(world) {
  const cashValue = el('cash-value');
  const starEls = Array.from(document.querySelectorAll('#wanted-stars .star'));
  const missionPanel = el('mission-panel');
  const missionTitle = el('mission-title');
  const missionText = el('mission-text');
  const prompt = el('prompt');
  const promptText = el('prompt-text');
  const speedo = el('speedo');
  const speedValue = el('speed-value');
  const toasts = el('toasts');
  const banner = el('mission-banner');
  const bannerKicker = el('banner-kicker');
  const bannerTitle = el('banner-title');
  const bannerSub = el('banner-sub');
  const canvas = el('minimap');
  const ctx = canvas.getContext('2d');
  const SIZE = canvas.width;
  const CENTER = SIZE / 2;
  const scale = SIZE / (CITY.extent * 2 + 60);
  let shownCash = -1;
  let shownStars = -1;
  let shownTitle = '';
  let shownText = '';
  let bannerTimer = 0;
  let promptCurrent = '';

  function setCash(value) {
    const amount = Math.max(0, Math.floor(value));
    if (amount === shownCash) return;
    shownCash = amount;
    cashValue.textContent = `$${amount.toLocaleString('en-US')}`;
  }

  function setStars(value) {
    const level = clamp(Math.round(value), 0, 5);
    if (level === shownStars) return;
    shownStars = level;
    starEls.forEach((star, index) => {
      star.classList.toggle('lit', index < level);
    });
    el('wanted-panel').classList.toggle('active', level > 0);
  }

  function setObjective(mission) {
    if (!mission) {
      missionPanel.classList.remove('visible');
      shownTitle = '';
      shownText = '';
      return;
    }
    missionPanel.classList.add('visible');
    if (mission.title !== shownTitle) {
      shownTitle = mission.title;
      missionTitle.textContent = mission.title;
    }
    if (mission.briefing !== shownText) {
      shownText = mission.briefing;
      missionText.textContent = mission.briefing;
    }
  }

  function setPrompt(text) {
    if (text === promptCurrent) return;
    promptCurrent = text;
    if (!text) {
      prompt.classList.remove('visible');
      return;
    }
    promptText.textContent = text;
    prompt.classList.add('visible');
  }

  function setSpeed(mph, visible) {
    speedo.classList.toggle('visible', visible);
    if (visible) speedValue.textContent = String(Math.round(mph)).padStart(2, '0');
  }

  function toast(text) {
    if (!text) return;
    const node = document.createElement('div');
    node.className = 'toast';
    node.textContent = text;
    toasts.appendChild(node);
    while (toasts.children.length > 4) toasts.firstElementChild.remove();
    window.setTimeout(() => {
      node.classList.add('out');
      window.setTimeout(() => node.remove(), 380);
    }, 3600);
  }

  function showBanner(complete) {
    if (!complete) return;
    bannerKicker.textContent = 'JOB COMPLETE';
    bannerTitle.textContent = complete.title;
    bannerSub.textContent = `PAID  $${complete.reward}`;
    banner.classList.add('visible');
    bannerTimer = 3.6;
  }

  function drawBlip(x, z, color, radius = 3.2) {
    const mx = CENTER + x * scale;
    const my = CENTER + z * scale;
    ctx.beginPath();
    ctx.arc(mx, my, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(20,24,26,0.75)';
    ctx.stroke();
  }

  function drawMap(data) {
    const t = performance.now() * 0.004;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.save();
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, CENTER - 3, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#243330';
    ctx.fillRect(0, 0, SIZE, SIZE);
    const beachY = CENTER + CITY.extent * scale;
    ctx.fillStyle = '#b9a878';
    ctx.fillRect(0, beachY, SIZE, SIZE - beachY);
    ctx.fillStyle = '#2f7482';
    ctx.fillRect(0, CENTER + (CITY.extent + 26) * scale, SIZE, SIZE);
    ctx.strokeStyle = '#0f1416';
    ctx.lineWidth = Math.max(2.6, CITY.road * scale);
    for (const c of CITY.roadCenters) {
      const mx = CENTER + c * scale;
      const my = CENTER + c * scale;
      ctx.beginPath();
      ctx.moveTo(0, my);
      ctx.lineTo(SIZE, my);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mx, 0);
      ctx.lineTo(mx, SIZE);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(226,203,152,0.5)';
    ctx.lineWidth = 1;
    for (const c of CITY.roadCenters) {
      for (const mid of [CENTER + c * scale]) {
        ctx.beginPath();
        ctx.moveTo(0, mid);
        ctx.lineTo(SIZE, mid);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(mid, 0);
        ctx.lineTo(mid, SIZE);
        ctx.stroke();
      }
    }
    if (data.marker) {
      const mx = CENTER + data.marker.x * scale;
      const my = CENTER + data.marker.z * scale;
      const pulse = 5 + Math.sin(t * 2) * 1.6;
      ctx.beginPath();
      ctx.arc(mx, my, pulse + 4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(241,190,80,0.5)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#f2c15e';
      ctx.fillRect(-3, -3, 6, 6);
      ctx.restore();
    }
    for (const cop of data.police || []) {
      drawBlip(cop.x, cop.z, Math.sin(t * 6 + cop.x) > 0 ? '#ef5b4d' : '#4e8dff', 3);
    }
    if (data.player) {
      const mx = CENTER + data.player.x * scale;
      const my = CENTER + data.player.z * scale;
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(-data.player.yaw);
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(5, 5);
      ctx.lineTo(0, 2.5);
      ctx.lineTo(-5, 5);
      ctx.closePath();
      ctx.fillStyle = '#f6ecd8';
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = '#22292b';
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, CENTER - 2.5, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(243,229,204,0.42)';
    ctx.stroke();
  }

  function frame(dt = 1 / 60) {
    setCash(world.cash || 0);
    setStars(world.wanted || 0);
    setObjective(world.mission);
    const driving = Boolean(world.activeCar);
    setSpeed(Math.abs(world.speed || 0) * 2.237, driving);
    if (driving) {
      setPrompt('');
    } else if (world.nearCar) {
      setPrompt(`STEAL ${String(world.nearCar.userData.type || 'CAR').toUpperCase()}`);
    } else {
      setPrompt('');
    }
    if (world.missionComplete) {
      showBanner(world.missionComplete);
      world.missionComplete = null;
    }
    if (bannerTimer > 0) {
      bannerTimer -= dt;
      if (bannerTimer <= 0) banner.classList.remove('visible');
    }
    const actor = world.activeCar || world.player.object;
    const yaw = world.activeCar ? world.activeCar.rotation.y : world.player.yaw;
    drawMap({
      player: actor ? { x: actor.position.x, z: actor.position.z, yaw } : null,
      police: (world.police || []).map((car) => ({ x: car.position.x, z: car.position.z })),
      marker: world.mission ? world.mission.marker : null,
    });
  }

  return { frame, toast, setCash, setStars, setObjective, showBanner, setPrompt, setSpeed, drawMap };
}
