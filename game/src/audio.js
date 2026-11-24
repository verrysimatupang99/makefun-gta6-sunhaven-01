export function createAudio() {
  let ctx = null;
  let master = null;
  let engineGain = null;
  let engineOscA = null;
  let engineOscB = null;
  let engineFilter = null;
  let sirenGain = null;
  let sirenOsc = null;
  let sirenLfo = null;
  let wavesGain = null;
  let muted = false;
  let started = false;

  function init() {
    if (ctx) return true;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      ctx = new AudioCtx();
      master = ctx.createGain();
      master.gain.value = 0.42;
      master.connect(ctx.destination);
      engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOscA = ctx.createOscillator();
      engineOscA.type = 'sawtooth';
      engineOscA.frequency.value = 52;
      engineOscB = ctx.createOscillator();
      engineOscB.type = 'square';
      engineOscB.frequency.value = 77;
      const bGain = ctx.createGain();
      bGain.gain.value = 0.35;
      engineOscA.connect(engineFilter);
      engineOscB.connect(bGain).connect(engineFilter);
      engineFilter.connect(engineGain).connect(master);
      engineOscA.start();
      engineOscB.start();
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'sawtooth';
      sirenOsc.frequency.value = 620;
      sirenLfo = ctx.createOscillator();
      sirenLfo.type = 'sine';
      sirenLfo.frequency.value = 0.55;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 240;
      sirenLfo.connect(lfoGain).connect(sirenOsc.frequency);
      const sirenFilter = ctx.createBiquadFilter();
      sirenFilter.type = 'bandpass';
      sirenFilter.frequency.value = 760;
      sirenFilter.Q.value = 0.9;
      sirenOsc.connect(sirenFilter).connect(sirenGain).connect(master);
      sirenOsc.start();
      sirenLfo.start();
      wavesGain = ctx.createGain();
      wavesGain.gain.value = 0;
      const length = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < length; i += 1) {
        last = last * 0.96 + (Math.random() * 2 - 1) * 0.04;
        data[i] = last;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const waveFilter = ctx.createBiquadFilter();
      waveFilter.type = 'lowpass';
      waveFilter.frequency.value = 480;
      const waveLfo = ctx.createOscillator();
      waveLfo.frequency.value = 0.19;
      const waveLfoGain = ctx.createGain();
      waveLfoGain.gain.value = 0.5;
      waveLfo.connect(waveLfoGain).connect(wavesGain.gain);
      noise.connect(waveFilter).connect(wavesGain).connect(master);
      noise.start();
      waveLfo.start();
      started = true;
      return true;
    } catch {
      return false;
    }
  }

  function resume() {
    if (!init()) return;
    if (ctx.state === 'suspended') ctx.resume();
  }

  function setEngine(active, speed) {
    if (!started || !ctx) return;
    const now = ctx.currentTime;
    const ratio = Math.min(1, Math.abs(speed) / 32);
    engineGain.gain.setTargetAtTime(active ? 0.1 + ratio * 0.12 : 0, now, 0.18);
    engineOscA.frequency.setTargetAtTime(46 + ratio * 104, now, 0.15);
    engineOscB.frequency.setTargetAtTime(68 + ratio * 148, now, 0.15);
    engineFilter.frequency.setTargetAtTime(320 + ratio * 900, now, 0.2);
  }

  function setSiren(level) {
    if (!started || !ctx) return;
    sirenGain.gain.setTargetAtTime(level > 0 ? 0.05 + Math.min(level, 5) * 0.018 : 0, ctx.currentTime, 0.3);
  }

  function setWaves(active) {
    if (!started || !ctx) return;
    wavesGain.gain.setTargetAtTime(active ? 0.16 : 0, ctx.currentTime, 0.6);
  }

  function chime(kind = 'cash') {
    if (!started || !ctx || muted) return;
    const now = ctx.currentTime;
    const frequencies = kind === 'mission' ? [523, 659, 784, 1047] : [880, 1175];
    frequencies.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.02 + index * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5 + index * 0.1);
      osc.connect(gain).connect(master);
      osc.start(now + index * 0.06);
      osc.stop(now + 0.8 + index * 0.1);
    });
  }

  function crash() {
    if (!started || !ctx || muted) return;
    const now = ctx.currentTime;
    const length = Math.floor(ctx.sampleRate * 0.25);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.28;
    source.connect(gain).connect(master);
    source.start(now);
  }

  function toggleMute() {
    muted = !muted;
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.42, ctx.currentTime, 0.05);
    return muted;
  }

  return { init, resume, setEngine, setSiren, setWaves, chime, crash, toggleMute, get muted() { return muted; }, get ready() { return started; } };
}
