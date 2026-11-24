import { hasSave } from './save-system.js';

export function createMenus(callbacks) {
  const title = document.getElementById('title-screen');
  const pause = document.getElementById('pause-menu');
  const startButton = document.getElementById('btn-start');
  const continueButton = document.getElementById('btn-continue');
  const resumeButton = document.getElementById('btn-resume');
  const quitButton = document.getElementById('btn-quit');
  let paused = false;
  let playing = false;

  function updateContinue() {
    const available = hasSave();
    continueButton.disabled = !available;
    continueButton.classList.toggle('secondary', !available);
    continueButton.textContent = available ? 'CONTINUE STORY' : 'NO SAVED STORY';
  }

  function showTitle() {
    playing = false;
    paused = false;
    updateContinue();
    title.classList.add('visible');
    pause.classList.remove('visible');
  }

  function hideTitle() {
    playing = true;
    title.classList.remove('visible');
  }

  function showPause() {
    if (!playing) return;
    paused = true;
    pause.classList.add('visible');
  }

  function hidePause() {
    paused = false;
    pause.classList.remove('visible');
  }

  startButton.addEventListener('click', () => {
    callbacks.onStart();
  });
  continueButton.addEventListener('click', () => {
    if (!continueButton.disabled) callbacks.onContinue();
  });
  resumeButton.addEventListener('click', () => {
    callbacks.onResume();
  });
  quitButton.addEventListener('click', () => {
    callbacks.onSaveQuit();
  });

  return {
    showTitle,
    hideTitle,
    showPause,
    hidePause,
    updateContinue,
    get paused() {
      return paused;
    },
    get playing() {
      return playing;
    },
  };
}
