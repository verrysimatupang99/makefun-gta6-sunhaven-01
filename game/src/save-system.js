import { SAVE_KEY, START_CASH } from './config.js';

export function hasSave() {
  try {
    return Boolean(window.localStorage.getItem(SAVE_KEY));
  } catch {
    return false;
  }
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return {
      cash: Number.isFinite(data.cash) ? data.cash : START_CASH,
      missionStage: Number.isFinite(data.missionStage) ? data.missionStage : 0,
      carType: typeof data.carType === 'string' ? data.carType : null,
      wanted: Number.isFinite(data.wanted) ? data.wanted : 0,
      savedAt: data.savedAt || 0,
    };
  } catch {
    return null;
  }
}

export function saveGame(data) {
  try {
    const payload = { ...data, savedAt: Date.now() };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    return payload;
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    return false;
  }
  return true;
}
