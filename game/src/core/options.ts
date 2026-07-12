/** Player options: persisted to localStorage, read live by input/camera/audio.
 *  Profiles namespace the v1-compatible progress keys so multiple learners can
 *  share a machine without sharing a readiness gauge. */

export interface Options {
  sensitivity: number; // look multiplier, 0.5–2.0
  invertY: boolean;
  deadzone: number; //   stick radial deadzone, 0.10–0.30
  sfxVolume: number; //  0–1
  keyInteract: number; // keyCodes (keyboard rebinds)
  keyJump: number;
  keySprint: number;
  keyJournal: number;
  profile: 'A' | 'B' | 'C';
}

const KEY = 'learnaws.options';
const DEFAULTS: Options = {
  sensitivity: 1.0,
  invertY: false,
  deadzone: 0.15,
  sfxVolume: 0.5,
  keyInteract: 69, // E
  keyJump: 32, //    Space
  keySprint: 16, //  Shift
  keyJournal: 9, //  Tab
  profile: 'A',
};

function load(): Options {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Options>) };
  } catch {
    return { ...DEFAULTS };
  }
}

export const OPTIONS: Options = load();

export function saveOptions() {
  localStorage.setItem(KEY, JSON.stringify(OPTIONS));
}

/** Human label for a keyCode (for panel labels and the prompt chip). */
export function keyName(code: number): string {
  const named: Record<number, string> = {
    9: 'Tab', 13: 'Enter', 16: 'Shift', 17: 'Ctrl', 18: 'Alt', 27: 'Esc', 32: 'Space',
    37: '←', 38: '↑', 39: '→', 40: '↓',
  };
  if (named[code]) return named[code];
  if (code >= 48 && code <= 90) return String.fromCharCode(code);
  return `#${code}`;
}

/* --------------------------------------------------------------- profiles */

const LIVE_KEYS = ['learnaws.progress', 'learnaws.missed', 'learnaws.examhistory'];

/** Stash the live v1-compat keys under the given slot's namespace. */
function stash(slot: string) {
  for (const k of LIVE_KEYS) {
    const v = localStorage.getItem(k);
    if (v === null) localStorage.removeItem(`learnaws.slot.${slot}.${k}`);
    else localStorage.setItem(`learnaws.slot.${slot}.${k}`, v);
  }
}

/** Load a slot's stashes into the live keys (missing stash = fresh profile). */
function restore(slot: string) {
  for (const k of LIVE_KEYS) {
    const v = localStorage.getItem(`learnaws.slot.${slot}.${k}`);
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  }
}

/** Switch profiles: current live data is stashed, target slot becomes live.
 *  The caller reloads the page — in-scene state (missions, journal) is per-run. */
export function switchProfile(to: Options['profile']) {
  if (to === OPTIONS.profile) return;
  stash(OPTIONS.profile);
  restore(to);
  OPTIONS.profile = to;
  saveOptions();
}

/** Wipe the ACTIVE profile's progress (the live keys + its stash). */
export function resetProfile() {
  for (const k of LIVE_KEYS) {
    localStorage.removeItem(k);
    localStorage.removeItem(`learnaws.slot.${OPTIONS.profile}.${k}`);
  }
}
