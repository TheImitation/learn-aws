const TONES = {
  info: { border: '#57c7e3', glow: 'rgba(87,199,227,0.25)' },
  ok: { border: '#5fd29a', glow: 'rgba(95,210,154,0.25)' },
  bad: { border: '#e85f5f', glow: 'rgba(232,95,95,0.3)' },
} as const;

export type ToastTone = keyof typeof TONES;

interface Live {
  el: HTMLDivElement;
  ttl: number;
  text: string;
}

/** Transient, non-blocking messages (plug clicks, socket rejections, aim locks).
 *  Tick-driven lifetimes so they behave identically under simStep. */
export class Toaster {
  private root: HTMLDivElement;
  private live: Live[] = [];

  constructor() {
    this.root = document.createElement('div');
    this.root.style.cssText =
      'position:fixed;left:50%;bottom:96px;transform:translateX(-50%);display:flex;' +
      'flex-direction:column-reverse;align-items:center;gap:8px;pointer-events:none;z-index:40;';
    document.body.appendChild(this.root);
  }

  show(text: string, tone: ToastTone = 'info', seconds = 2.8) {
    const t = TONES[tone];
    const el = document.createElement('div');
    el.style.cssText =
      `max-width:520px;padding:8px 14px;border:1px solid ${t.border};border-radius:8px;` +
      `background:rgba(14,16,22,0.92);box-shadow:0 0 18px ${t.glow};color:#dfe3ec;` +
      'font:500 13px/1.45 ui-monospace,Menlo,monospace;text-align:center;transition:opacity 0.3s;';
    el.textContent = text;
    this.root.appendChild(el);
    this.live.push({ el, ttl: seconds, text });
    while (this.live.length > 3) this.live.shift()!.el.remove();
  }

  update(dt: number) {
    for (const l of this.live) {
      l.ttl -= dt;
      if (l.ttl < 0.35) l.el.style.opacity = String(Math.max(0, l.ttl / 0.35));
    }
    this.live = this.live.filter((l) => {
      if (l.ttl <= 0) { l.el.remove(); return false; }
      return true;
    });
  }

  /** Currently visible toast texts (dev/e2e). */
  get current(): string[] { return this.live.map((l) => l.text); }
}
