import { OPTIONS } from './options';

/** Synthesized SFX — WebAudio oscillators, no assets, matching the diegetic
 *  box-world aesthetic. The context unlocks on the first user gesture (browser
 *  autoplay policy); until then every call is a silent no-op, which also keeps
 *  scripted simStep evals quiet. */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function ensure(): AudioContext | null {
  if (!ctx) {
    try {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  return ctx;
}

/** Call once from main: resumes the context on the first real user gesture. */
export function wireAudioUnlock() {
  const unlock = () => {
    const c = ensure();
    if (c && c.state === 'suspended') void c.resume();
  };
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);
}

type Wave = OscillatorType;

/** One enveloped oscillator note; `glideTo` bends the pitch across the note. */
function note(freq: number, dur: number, opts: { wave?: Wave; vol?: number; glideTo?: number; at?: number } = {}) {
  const c = ensure();
  if (!c || c.state !== 'running' || !master) return;
  const t0 = c.currentTime + (opts.at ?? 0);
  master.gain.setValueAtTime(OPTIONS.sfxVolume * 0.5, t0);
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = opts.wave ?? 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  if (opts.glideTo) osc.frequency.exponentialRampToValueAtTime(opts.glideTo, t0 + dur);
  const v = opts.vol ?? 1;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(v, t0 + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** A short filtered-noise burst (clacks, thunks). */
function thud(dur: number, vol = 1, at = 0, cutoff = 800) {
  const c = ensure();
  if (!c || c.state !== 'running' || !master) return;
  const t0 = c.currentTime + at;
  master.gain.setValueAtTime(OPTIONS.sfxVolume * 0.5, t0);
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  const gain = c.createGain();
  gain.gain.value = vol;
  src.connect(filter).connect(gain).connect(master);
  src.start(t0);
}

/* ------------------------------------------------------------- ambience --
 * Continuous layer: low room tone, a machine hum that swells near racks, and
 * stride-timed footsteps. Same rules as one-shots: silent until the context
 * unlocks on a real gesture, so scripted simStep evals stay quiet. */

interface AmbNodes {
  noiseGain: GainNode;
  humGain: GainNode;
}
let amb: AmbNodes | null = null;

function ensureAmbience(): AmbNodes | null {
  const c = ensure();
  if (!c || c.state !== 'running' || !master) return null;
  if (amb) return amb;
  // brown-noise room tone (2 s loop)
  const len = c.sampleRate * 2;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
  const noise = c.createBufferSource();
  noise.buffer = buf;
  noise.loop = true;
  const noiseLp = c.createBiquadFilter();
  noiseLp.type = 'lowpass';
  noiseLp.frequency.value = 220;
  const noiseGain = c.createGain();
  noiseGain.gain.value = 0;
  noise.connect(noiseLp).connect(noiseGain).connect(master);
  noise.start();
  // machine hum: two detuned low oscillators
  const humGain = c.createGain();
  humGain.gain.value = 0;
  for (const [f, v] of [[87, 1], [174, 0.35], [261, 0.12]] as const) {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = c.createGain();
    g.gain.value = v;
    o.connect(g).connect(humGain);
    o.start();
  }
  humGain.connect(master);
  amb = { noiseGain, humGain };
  return amb;
}

let strideClock = 0;

export const ambience = {
  /** Call once per tick from main. humDist = planar metres to the nearest
   *  humming machine (Infinity when none). */
  update(dt: number, s: { grounded: boolean; speed: number; humDist: number }) {
    const a = ensureAmbience();
    if (!a) return;
    const vol = OPTIONS.sfxVolume;
    a.noiseGain.gain.value = vol * 0.045;
    const near = Number.isFinite(s.humDist) ? Math.max(0, 1 - s.humDist / 9) : 0;
    const target = vol * 0.11 * near * near;
    a.humGain.gain.value += (target - a.humGain.gain.value) * Math.min(1, dt * 6);
    // footsteps, stride-timed (~0.85 m per step)
    if (s.grounded && s.speed > 0.6) {
      strideClock -= (dt * s.speed) / 0.85;
      if (strideClock <= 0) {
        thud(0.05, 0.16 + Math.min(0.14, s.speed * 0.03), 0, 320);
        strideClock = 1;
      }
    } else {
      strideClock = Math.min(strideClock, 0.25);
    }
  },
};

export const sfx = {
  focus: () => note(880, 0.03, { wave: 'sine', vol: 0.25 }),
  open: () => note(440, 0.07, { vol: 0.5, glideTo: 560 }),
  close: () => note(360, 0.06, { vol: 0.4, glideTo: 300 }),
  confirm: () => note(620, 0.06, { wave: 'triangle', vol: 0.6, glideTo: 840 }),
  toastOk: () => { note(660, 0.07, { vol: 0.5 }); note(990, 0.09, { vol: 0.5, at: 0.07 }); },
  toastInfo: () => note(760, 0.06, { vol: 0.35 }),
  toastBad: () => note(210, 0.16, { wave: 'sawtooth', vol: 0.5 }),
  refuse: () => { note(170, 0.11, { wave: 'square', vol: 0.5 }); note(140, 0.13, { wave: 'square', vol: 0.5, at: 0.1 }); },
  pickup: () => { note(300, 0.08, { vol: 0.5, glideTo: 520 }); thud(0.03, 0.4, 0, 1200); },
  drop: () => { thud(0.06, 0.7, 0, 500); note(180, 0.07, { vol: 0.35, glideTo: 120 }); },
  plug: () => { thud(0.04, 0.8, 0, 700); note(520, 0.08, { wave: 'triangle', vol: 0.55, at: 0.03, glideTo: 700 }); },
  unplug: () => { note(520, 0.07, { wave: 'triangle', vol: 0.45, glideTo: 380 }); },
  lever: () => { thud(0.05, 0.9, 0, 600); thud(0.04, 0.6, 0.07, 900); },
  dialTick: () => note(1150, 0.025, { wave: 'square', vol: 0.35 }),
  dialLock: () => { note(1150, 0.03, { wave: 'square', vol: 0.4 }); note(760, 0.08, { wave: 'triangle', vol: 0.5, at: 0.04 }); },
  alarmPulse: () => { note(690, 0.14, { wave: 'square', vol: 0.45 }); note(460, 0.14, { wave: 'square', vol: 0.45, at: 0.15 }); },
  resolved: () => {
    note(523, 0.1, { wave: 'triangle', vol: 0.6 });
    note(659, 0.1, { wave: 'triangle', vol: 0.6, at: 0.1 });
    note(784, 0.22, { wave: 'triangle', vol: 0.65, at: 0.2 });
  },
};
