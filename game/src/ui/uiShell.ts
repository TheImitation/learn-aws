import type { InputState } from '../input/inputMap';

export interface PanelAction {
  label: string;
  onSelect?: () => void;
  closes?: boolean; // close the panel after onSelect (default true)
}

export interface PanelSpec {
  id: string;
  title: string;
  kicker?: string; //   small line above the title ("TERMINAL", "TICKET"…)
  bodyHtml?: string; // already-safe HTML (build with esc())
  actions: PanelAction[];
}

export const esc = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const CSS = `
  .ui-overlay { position: fixed; inset: 0; z-index: 20; display: none; align-items: center; justify-content: center;
    background: rgba(8, 10, 15, 0.55); font-family: system-ui, sans-serif; }
  .ui-overlay.open { display: flex; }
  .ui-panel { width: min(560px, 92vw); max-height: 78vh; overflow: auto; background: #12151d;
    border: 1px solid rgba(255,255,255,0.10); border-radius: 14px; padding: 20px 22px;
    color: #e8ecf4; box-shadow: 0 18px 60px rgba(0,0,0,0.5); }
  .ui-kicker { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #5fd29a; margin: 0 0 6px; }
  .ui-title { font-size: 20px; font-weight: 750; margin: 0 0 12px; }
  .ui-body { font-size: 13.5px; line-height: 1.65; color: #b9c1d0; margin-bottom: 16px; white-space: pre-wrap; }
  .ui-body code { font-family: ui-monospace, monospace; font-size: 12.5px; color: #cfe3d8; background: rgba(95,210,154,0.08);
    border: 1px solid rgba(95,210,154,0.18); border-radius: 6px; padding: 1px 6px; }
  .ui-body pre { font-family: ui-monospace, monospace; font-size: 12px; line-height: 1.6; color: #cfd6e4;
    background: #0d1017; border: 1px solid rgba(255,255,255,0.07); border-radius: 8px; padding: 10px 12px; overflow-x: auto; }
  .ui-actions { display: flex; flex-direction: column; gap: 8px; }
  .ui-btn { text-align: left; font-size: 13.5px; color: #e8ecf4; background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.10); border-radius: 10px; padding: 10px 14px; cursor: pointer; }
  .ui-btn.focus { border-color: #5fd29a; background: rgba(95,210,154,0.10); box-shadow: 0 0 0 2px rgba(95,210,154,0.22); }
  .ui-hint { margin-top: 14px; font-size: 11px; color: #6b7280; }
  .prompt-chip { position: fixed; left: 50%; bottom: 12vh; transform: translateX(-50%); z-index: 15;
    display: none; align-items: center; gap: 9px; background: rgba(14,16,22,0.88); color: #e8ecf4;
    border: 1px solid rgba(255,255,255,0.12); border-radius: 999px; padding: 8px 16px 8px 10px;
    font: 600 13px system-ui, sans-serif; pointer-events: none; }
  .prompt-chip.show { display: flex; }
  .prompt-key { display: inline-flex; align-items: center; justify-content: center; min-width: 22px; height: 22px;
    padding: 0 5px; border-radius: 6px; background: #5fd29a; color: #0d1210; font-weight: 800; font-size: 12px; }
`;

/** DOM panel shell with full keyboard/gamepad navigation. One panel at a time. */
export class UiShell {
  private overlay: HTMLDivElement;
  private chip: HTMLDivElement;
  private chipKey: HTMLSpanElement;
  private chipText: HTMLSpanElement;
  private current: PanelSpec | null = null;
  private buttons: HTMLButtonElement[] = [];
  private focusIdx = 0;
  private grace = 0; // ticks to ignore confirm/back right after opening (held-key bleed)

  constructor() {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    this.overlay = document.createElement('div');
    this.overlay.className = 'ui-overlay';
    document.body.appendChild(this.overlay);

    this.chip = document.createElement('div');
    this.chip.className = 'prompt-chip';
    this.chipKey = document.createElement('span');
    this.chipKey.className = 'prompt-key';
    this.chipText = document.createElement('span');
    this.chip.append(this.chipKey, this.chipText);
    document.body.appendChild(this.chip);
  }

  get isOpen() { return this.current !== null; }
  get currentId() { return this.current?.id ?? null; }
  get currentTitle() { return this.current?.title ?? null; }
  get focusedLabel() { return this.buttons[this.focusIdx]?.textContent ?? null; }

  open(spec: PanelSpec) {
    document.exitPointerLock?.();
    this.current = spec;
    this.grace = 8;
    this.overlay.innerHTML = '';
    const panel = document.createElement('div');
    panel.className = 'ui-panel';
    if (spec.kicker) panel.innerHTML += `<p class="ui-kicker">${esc(spec.kicker)}</p>`;
    panel.innerHTML += `<h2 class="ui-title">${esc(spec.title)}</h2>`;
    if (spec.bodyHtml) panel.innerHTML += `<div class="ui-body">${spec.bodyHtml}</div>`;
    const actions = document.createElement('div');
    actions.className = 'ui-actions';
    this.buttons = spec.actions.map((a, i) => {
      const b = document.createElement('button');
      b.className = 'ui-btn';
      b.textContent = a.label;
      b.onmouseenter = () => this.setFocus(i);
      b.onclick = () => this.activate(i);
      actions.appendChild(b);
      return b;
    });
    panel.appendChild(actions);
    panel.innerHTML += `<p class="ui-hint">↑↓ / D-pad select · Enter / Ⓐ confirm · Esc / Ⓑ close</p>`;
    // innerHTML += re-parses: re-query the real button elements
    this.buttons = Array.from(panel.querySelectorAll('.ui-btn')) as HTMLButtonElement[];
    this.buttons.forEach((b, i) => {
      b.onmouseenter = () => this.setFocus(i);
      b.onclick = () => this.activate(i);
    });
    this.overlay.appendChild(panel);
    this.overlay.classList.add('open');
    this.setFocus(0);
  }

  close() {
    this.current = null;
    this.overlay.classList.remove('open');
    this.overlay.innerHTML = '';
    this.buttons = [];
  }

  /** Route UI navigation while a panel is open. */
  handleNav(input: InputState) {
    if (!this.current) return;
    if (this.grace > 0) { this.grace--; return; }
    if (input.navY !== 0 && this.buttons.length > 0) {
      this.setFocus((this.focusIdx + input.navY + this.buttons.length) % this.buttons.length);
    }
    if (input.confirm) this.activate(this.focusIdx);
    else if (input.back || input.pause) this.close();
  }

  setPrompt(p: { text: string; device: 'kbm' | 'pad' } | null) {
    if (!p) { this.chip.classList.remove('show'); return; }
    this.chipKey.textContent = p.device === 'pad' ? 'X' : 'E';
    this.chipText.textContent = p.text;
    this.chip.classList.add('show');
  }

  private setFocus(i: number) {
    this.focusIdx = i;
    this.buttons.forEach((b, k) => b.classList.toggle('focus', k === i));
  }

  private activate(i: number) {
    const spec = this.current;
    const action = spec?.actions[i];
    if (!spec || !action) return;
    action.onSelect?.();
    // close unless the action explicitly keeps the panel (and nothing else was opened meanwhile)
    if ((action.closes ?? true) && this.current === spec) this.close();
  }
}
