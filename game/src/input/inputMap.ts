import {
  DeviceSourceManager,
  DeviceType,
  DualShockInput,
  Engine,
  SwitchInput,
  XboxInput,
} from '@babylonjs/core';

/** Abstract per-frame input, device-agnostic. Movement is intent (magnitude ≤ 1);
 *  look is the camera delta for THIS frame in radians (sensitivity already applied). */
export interface InputState {
  move: { x: number; y: number }; // x = strafe right+, y = forward+
  look: { x: number; y: number }; // x = look right+, y = look down+
  jump: boolean; //     edge (pressed this frame)
  sprint: boolean; //   held
  interact: boolean; // edge
  journal: boolean; //  edge
  pause: boolean; //    edge
  lastDevice: 'kbm' | 'pad';
}

/** Debug override for scripted verification (preview evals set this via __game). */
export interface DebugInput {
  move?: { x: number; y: number };
  look?: { x: number; y: number };
  jump?: boolean;
  sprint?: boolean;
  interact?: boolean;
  journal?: boolean;
  pause?: boolean;
}

const DEADZONE = 0.15;
const MOUSE_SENS = 0.0022; // rad per px
const PAD_LOOK_X = 2.6; //    rad per second at full deflection
const PAD_LOOK_Y = 1.8;

const dz = (v: number) => {
  const m = Math.abs(v);
  return m < DEADZONE ? 0 : (Math.sign(v) * (m - DEADZONE)) / (1 - DEADZONE);
};

// Per-pad-type input indices (Babylon enums; Generic assumes the standard mapping).
interface PadMap { lx: number; ly: number; rx: number; ry: number; south: number; west: number; north: number; east: number; l3: number; start: number }
const GENERIC_AXIS_BASE = 17; // standard mapping: 17 buttons (0–16), then axes
const PAD_MAPS: [DeviceType, PadMap][] = [
  [DeviceType.Xbox, { lx: XboxInput.LStickXAxis, ly: XboxInput.LStickYAxis, rx: XboxInput.RStickXAxis, ry: XboxInput.RStickYAxis, south: XboxInput.A, west: XboxInput.X, north: XboxInput.Y, east: XboxInput.B, l3: XboxInput.LS, start: XboxInput.Start }],
  [DeviceType.DualShock, { lx: DualShockInput.LStickXAxis, ly: DualShockInput.LStickYAxis, rx: DualShockInput.RStickXAxis, ry: DualShockInput.RStickYAxis, south: DualShockInput.Cross, west: DualShockInput.Square, north: DualShockInput.Triangle, east: DualShockInput.Circle, l3: DualShockInput.L3, start: DualShockInput.Options }],
  [DeviceType.Switch, { lx: SwitchInput.LStickXAxis, ly: SwitchInput.LStickYAxis, rx: SwitchInput.RStickXAxis, ry: SwitchInput.RStickYAxis, south: SwitchInput.B, west: SwitchInput.Y, north: SwitchInput.X, east: SwitchInput.A, l3: SwitchInput.LS, start: SwitchInput.Plus }],
  [DeviceType.Generic, { lx: GENERIC_AXIS_BASE, ly: GENERIC_AXIS_BASE + 1, rx: GENERIC_AXIS_BASE + 2, ry: GENERIC_AXIS_BASE + 3, south: 0, west: 2, north: 3, east: 1, l3: 10, start: 9 }],
];

// Keyboard keyCodes.
const KEY = { W: 87, A: 65, S: 83, D: 68, SHIFT: 16, SPACE: 32, E: 69, TAB: 9 };

export class InputMap {
  readonly state: InputState = {
    move: { x: 0, y: 0 }, look: { x: 0, y: 0 },
    jump: false, sprint: false, interact: false, journal: false, pause: false,
    lastDevice: 'kbm',
  };
  padConnected = false;

  private dsm: DeviceSourceManager;
  private canvas: HTMLCanvasElement;
  private mouseDX = 0;
  private mouseDY = 0;
  private prev = { jump: false, interact: false, journal: false, pause: false };
  private debug: DebugInput | null = null;

  constructor(engine: Engine, canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.dsm = new DeviceSourceManager(engine);

    // Mouse look only while pointer-locked (click the canvas to capture).
    canvas.addEventListener('click', () => {
      if (document.pointerLockElement !== canvas) canvas.requestPointerLock();
    });
    window.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === this.canvas) {
        this.mouseDX += e.movementX;
        this.mouseDY += e.movementY;
      }
    });
    // Tab is the journal key — keep the browser from stealing focus.
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') e.preventDefault();
    });
  }

  setDebugInput(d: DebugInput | null) { this.debug = d; }

  /** Poll devices and produce this frame's InputState. */
  update(dt: number) {
    const s = this.state;
    let mx = 0; let my = 0; let lx = 0; let ly = 0;
    let jump = false; let sprint = false; let interact = false; let journal = false; let pause = false;

    // --- keyboard ---
    const kb = this.dsm.getDeviceSource(DeviceType.Keyboard);
    if (kb) {
      const k = (c: number) => kb.getInput(c) === 1;
      mx += (k(KEY.D) ? 1 : 0) - (k(KEY.A) ? 1 : 0);
      my += (k(KEY.W) ? 1 : 0) - (k(KEY.S) ? 1 : 0);
      if (k(KEY.SPACE)) jump = true;
      if (k(KEY.SHIFT)) sprint = true;
      if (k(KEY.E)) interact = true;
      if (k(KEY.TAB)) journal = true;
      if (mx || my || jump || sprint || interact || journal) s.lastDevice = 'kbm';
    }

    // --- mouse (accumulated deltas under pointer lock) ---
    lx += this.mouseDX * MOUSE_SENS;
    ly += this.mouseDY * MOUSE_SENS;
    if (this.mouseDX || this.mouseDY) s.lastDevice = 'kbm';
    this.mouseDX = 0; this.mouseDY = 0;

    // --- first connected gamepad ---
    this.padConnected = false;
    for (const [type, map] of PAD_MAPS) {
      const pad = this.dsm.getDeviceSource(type);
      if (!pad) continue;
      this.padConnected = true;
      const g = (i: number) => pad.getInput(i) ?? 0;
      const plx = dz(g(map.lx)); const ply = dz(g(map.ly));
      const prx = dz(g(map.rx)); const pry = dz(g(map.ry));
      if (Math.hypot(plx, ply) > Math.hypot(mx, my)) { mx = plx; my = -ply; } // stick up = forward
      lx += prx * PAD_LOOK_X * dt;
      ly += pry * PAD_LOOK_Y * dt;
      if (g(map.south) === 1) jump = true;
      if (g(map.l3) === 1) sprint = true;
      if (g(map.west) === 1) interact = true;
      if (g(map.north) === 1) journal = true;
      if (g(map.start) === 1) pause = true;
      if (plx || ply || prx || pry || jump || sprint || interact || journal || pause) s.lastDevice = 'pad';
      break;
    }

    // clamp move intent to the unit disc
    const mlen = Math.hypot(mx, my);
    if (mlen > 1) { mx /= mlen; my /= mlen; }

    // --- debug override (scripted verification) ---
    if (this.debug) {
      const d = this.debug;
      if (d.move) { mx = d.move.x; my = d.move.y; }
      if (d.look) { lx = d.look.x; ly = d.look.y; }
      if (d.jump !== undefined) jump = d.jump;
      if (d.sprint !== undefined) sprint = d.sprint;
      if (d.interact !== undefined) interact = d.interact;
      if (d.journal !== undefined) journal = d.journal;
      if (d.pause !== undefined) pause = d.pause;
    }

    // level → edge for one-shot actions
    s.move.x = mx; s.move.y = my;
    s.look.x = lx; s.look.y = ly;
    s.sprint = sprint;
    s.jump = jump && !this.prev.jump;
    s.interact = interact && !this.prev.interact;
    s.journal = journal && !this.prev.journal;
    s.pause = pause && !this.prev.pause;
    this.prev = { jump, interact, journal, pause };
  }
}
