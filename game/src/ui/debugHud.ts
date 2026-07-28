import { OPTIONS } from '../core/options';

/** Diagnostics overlay (fps, device, speed, control hints). Hidden by default —
 *  players enable it from Options → "Diagnostics overlay". */
export class DebugHud {
  private el: HTMLDivElement;
  private last = 0;

  constructor() {
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'fixed', top: '10px', left: '10px', zIndex: '10',
      font: '12px/1.5 ui-monospace, monospace', color: '#cfd6e4',
      background: 'rgba(14,16,22,0.72)', border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: '8px', padding: '7px 11px', pointerEvents: 'none', whiteSpace: 'pre',
    } as CSSStyleDeclaration);
    document.body.appendChild(this.el);
  }

  update(info: { fps: number; device: string; pad: boolean; speed: number; grounded: boolean }) {
    const on = OPTIONS.debugHud;
    if (this.el.style.display !== (on ? 'block' : 'none')) this.el.style.display = on ? 'block' : 'none';
    if (!on) return;
    const now = performance.now();
    if (now - this.last < 200) return;
    this.last = now;
    const hints = info.device === 'touch'
      ? `left thumb move · right thumb look\nACT interacts · RUN toggles sprint`
      : `WASD/stick move · mouse/R-stick look · Shift/L3 sprint · Space/A jump\nclick canvas to capture mouse`;
    this.el.textContent =
      `fps ${Number.isFinite(info.fps) ? Math.round(info.fps) : '—'} · ${info.device}${info.pad ? ' (pad connected)' : ''}\n` +
      `speed ${info.speed.toFixed(1)} m/s · ${info.grounded ? 'grounded' : 'airborne'}\n` + hints;
  }
}
