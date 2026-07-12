import { sfx } from '../core/sfx';

/** Site-wide visual alarm: pulsing red vignette + warning label, plus any beacon
 *  lamps the current mission binds. Raised by insecure actions (security klaxon)
 *  or as a consequence (overload). Tick-driven; missions must clear on dispose. */
export class AlarmSystem {
  private vignette: HTMLDivElement;
  private banner: HTMLDivElement;
  private beacons: ((level: number) => void)[] = [];
  private remaining = 0;
  private t = 0;
  private pulseIn = 0;
  label = '';

  constructor() {
    this.vignette = document.createElement('div');
    this.vignette.style.cssText =
      'position:fixed;inset:0;pointer-events:none;z-index:30;opacity:0;' +
      'background:radial-gradient(ellipse at center, transparent 55%, rgba(232,63,63,0.42) 100%);';
    document.body.appendChild(this.vignette);
    this.banner = document.createElement('div');
    this.banner.style.cssText =
      'position:fixed;top:64px;left:50%;transform:translateX(-50%);padding:6px 18px;' +
      'border:1px solid #e85f5f;border-radius:6px;background:rgba(40,10,12,0.9);color:#ff9d9d;' +
      'font:700 13px/1.3 ui-monospace,Menlo,monospace;letter-spacing:0.12em;z-index:31;display:none;';
    document.body.appendChild(this.banner);
  }

  /** Missions bind their strobe beacons for the duration of the site. */
  bindBeacon(setLevel: (level: number) => void) { this.beacons.push(setLevel); }

  raise(label: string, seconds = 6) {
    this.label = label;
    this.remaining = Math.max(this.remaining, seconds);
    this.banner.textContent = `⚠ ${label} ⚠`;
    this.banner.style.display = 'block';
  }

  get isActive() { return this.remaining > 0; }

  /** Stop the alarm and unbind mission beacons (mission dispose). */
  clear() {
    this.remaining = 0;
    this.label = '';
    this.beacons = [];
    this.vignette.style.opacity = '0';
    this.banner.style.display = 'none';
  }

  update(dt: number) {
    if (this.remaining <= 0) return;
    this.remaining -= dt;
    this.t += dt;
    this.pulseIn -= dt;
    if (this.pulseIn <= 0 && this.remaining > 0) { sfx.alarmPulse(); this.pulseIn = 0.9; }
    const level = this.remaining > 0 ? 0.55 + Math.sin(this.t * 9) * 0.45 : 0;
    this.vignette.style.opacity = String((0.35 + level * 0.65).toFixed(2));
    for (const b of this.beacons) b(level);
    if (this.remaining <= 0) {
      this.vignette.style.opacity = '0';
      this.banner.style.display = 'none';
      for (const b of this.beacons) b(0);
    }
  }
}
