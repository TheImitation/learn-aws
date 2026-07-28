/** Phone controls: floating virtual joystick (left thumb), drag-to-look (right
 *  thumb), and tap buttons for interact/jump/sprint/journal/menu. Activates on
 *  coarse-pointer devices, on the first real touch, or with ?touch=1 (which
 *  also accepts mouse pointers so the overlay is testable on desktop).
 *  Produces LEVEL states — InputMap does the edge detection, same as keys. */

const STICK_RADIUS = 58; //   px knob travel
const LOOK_GAIN = 1.55; //    thumb-drag px → mouse-px equivalent

const CSS = `
#touch-ui { position: fixed; inset: 0; z-index: 40; pointer-events: none;
  font-family: ui-monospace, Menlo, monospace; -webkit-user-select: none; user-select: none; }
#touch-ui .t-btn { position: absolute; pointer-events: auto; touch-action: none;
  display: flex; align-items: center; justify-content: center;
  background: rgba(13, 16, 23, 0.72); color: #d7e3f5;
  border: 1px solid rgba(95, 210, 154, 0.45); border-radius: 50%;
  font-weight: 700; letter-spacing: 0.04em; }
#touch-ui .t-btn.pressed { background: rgba(95, 210, 154, 0.35); }
#touch-ui .t-btn.on { background: rgba(95, 210, 154, 0.28); border-color: #5fd29a; color: #baf5d8; }
#touch-ui #t-interact { right: 18px; bottom: calc(26px + env(safe-area-inset-bottom, 0px)); width: 84px; height: 84px; font-size: 15px; }
#touch-ui #t-jump { right: 116px; bottom: calc(40px + env(safe-area-inset-bottom, 0px)); width: 64px; height: 64px; font-size: 13px; }
#touch-ui #t-sprint { right: 130px; bottom: calc(118px + env(safe-area-inset-bottom, 0px)); width: 54px; height: 54px; font-size: 11px; }
body.touch-on .prompt-chip { bottom: calc(196px + env(safe-area-inset-bottom, 0px)) !important; }
#touch-ui #t-journal { right: 74px; top: 14px; width: 48px; height: 48px; font-size: 11px; border-radius: 12px; }
#touch-ui #t-menu { right: 16px; top: 14px; width: 48px; height: 48px; font-size: 16px; border-radius: 12px; }
#touch-ui .t-stick { position: absolute; pointer-events: none; border-radius: 50%; }
#touch-ui #t-stick-base { width: 132px; height: 132px; margin: -66px 0 0 -66px;
  background: rgba(13, 16, 23, 0.4); border: 1px solid rgba(157, 180, 214, 0.4); }
#touch-ui #t-stick-knob { width: 58px; height: 58px; margin: -29px 0 0 -29px;
  background: rgba(157, 180, 214, 0.5); border: 1px solid #9db4d6; }
`;

export class TouchControls {
  enabled = false;
  move = { x: 0, y: 0 }; //  y = forward
  jumpHeld = false;
  interactHeld = false;
  sprintOn = false;
  journalHeld = false;
  pauseHeld = false;
  used = false; //           any touch input this frame (for lastDevice)

  private lookDX = 0;
  private lookDY = 0;
  private allowMouse = false;
  private stickId: number | null = null;
  private lookId: number | null = null;
  private stickOrigin = { x: 0, y: 0 };
  private lastLook = { x: 0, y: 0 };
  private root: HTMLDivElement | null = null;
  private base: HTMLDivElement | null = null;
  private knob: HTMLDivElement | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    const force = location.search.includes('touch=1');
    this.allowMouse = force;
    if (force || matchMedia('(pointer: coarse)').matches) this.activate();
    else {
      const once = (e: PointerEvent) => {
        if (e.pointerType === 'touch') { this.activate(); window.removeEventListener('pointerdown', once); }
      };
      window.addEventListener('pointerdown', once, { passive: true });
    }
  }

  consumeLook(): [number, number] {
    const r: [number, number] = [this.lookDX, this.lookDY];
    this.lookDX = 0;
    this.lookDY = 0;
    return r;
  }

  private activate() {
    if (this.enabled) return;
    this.enabled = true;
    document.body.classList.add('touch-on');

    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    this.root = document.createElement('div');
    this.root.id = 'touch-ui';
    this.root.innerHTML =
      `<div class="t-btn" id="t-interact">ACT</div>` +
      `<div class="t-btn" id="t-jump">JUMP</div>` +
      `<div class="t-btn" id="t-sprint">RUN</div>` +
      `<div class="t-btn" id="t-journal">LOG</div>` +
      `<div class="t-btn" id="t-menu">☰</div>` +
      `<div class="t-stick" id="t-stick-base" style="display:none"></div>` +
      `<div class="t-stick" id="t-stick-knob" style="display:none"></div>`;
    document.body.appendChild(this.root);
    this.base = this.root.querySelector('#t-stick-base')!;
    this.knob = this.root.querySelector('#t-stick-knob')!;

    const hold = (id: string, set: (v: boolean) => void) => {
      const el = this.root!.querySelector('#' + id) as HTMLElement;
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        try { el.setPointerCapture(e.pointerId); } catch { /* synthetic pointers */ }
        el.classList.add('pressed');
        set(true);
        this.used = true;
      });
      const off = () => { el.classList.remove('pressed'); set(false); };
      el.addEventListener('pointerup', off);
      el.addEventListener('pointercancel', off);
    };
    hold('t-interact', (v) => { this.interactHeld = v; });
    hold('t-jump', (v) => { this.jumpHeld = v; });
    hold('t-journal', (v) => { this.journalHeld = v; });
    hold('t-menu', (v) => { this.pauseHeld = v; });
    const sprint = this.root.querySelector('#t-sprint') as HTMLElement;
    sprint.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.sprintOn = !this.sprintOn;
      sprint.classList.toggle('on', this.sprintOn);
      this.used = true;
    });

    // stick + look on the canvas itself
    this.canvas.addEventListener('pointerdown', this.onDown, { passive: false });
    window.addEventListener('pointermove', this.onMove, { passive: false });
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);
  }

  private accepts(e: PointerEvent) {
    return e.pointerType === 'touch' || e.pointerType === 'pen' || this.allowMouse;
  }

  private onDown = (e: PointerEvent) => {
    if (!this.accepts(e)) return;
    this.used = true;
    // layout reads (clientWidth/innerWidth) return 0 in some embedded panes —
    // the canvas drawing-buffer width is always real (Babylon keeps it sized)
    const w = this.canvas.clientWidth || this.canvas.width || innerWidth || 1024;
    if (e.clientX < w * 0.45 && this.stickId === null) {
      e.preventDefault();
      this.stickId = e.pointerId;
      this.stickOrigin = { x: e.clientX, y: e.clientY };
      this.showStick(e.clientX, e.clientY, e.clientX, e.clientY);
    } else if (this.lookId === null) {
      e.preventDefault();
      this.lookId = e.pointerId;
      this.lastLook = { x: e.clientX, y: e.clientY };
    }
  };

  private onMove = (e: PointerEvent) => {
    if (e.pointerId === this.stickId) {
      let dx = e.clientX - this.stickOrigin.x;
      let dy = e.clientY - this.stickOrigin.y;
      const len = Math.hypot(dx, dy);
      if (len > STICK_RADIUS) { dx *= STICK_RADIUS / len; dy *= STICK_RADIUS / len; }
      this.move.x = dx / STICK_RADIUS;
      this.move.y = -dy / STICK_RADIUS; // screen-up = forward
      this.showStick(this.stickOrigin.x, this.stickOrigin.y, this.stickOrigin.x + dx, this.stickOrigin.y + dy);
      this.used = true;
    } else if (e.pointerId === this.lookId) {
      this.lookDX += (e.clientX - this.lastLook.x) * LOOK_GAIN;
      this.lookDY += (e.clientY - this.lastLook.y) * LOOK_GAIN;
      this.lastLook = { x: e.clientX, y: e.clientY };
      this.used = true;
    }
  };

  private onUp = (e: PointerEvent) => {
    if (e.pointerId === this.stickId) {
      this.stickId = null;
      this.move.x = 0;
      this.move.y = 0;
      this.base!.style.display = 'none';
      this.knob!.style.display = 'none';
    } else if (e.pointerId === this.lookId) {
      this.lookId = null;
    }
  };

  private showStick(bx: number, by: number, kx: number, ky: number) {
    this.base!.style.display = 'block';
    this.knob!.style.display = 'block';
    this.base!.style.left = bx + 'px';
    this.base!.style.top = by + 'px';
    this.knob!.style.left = kx + 'px';
    this.knob!.style.top = ky + 'px';
  }
}
