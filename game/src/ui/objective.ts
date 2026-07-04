/** Top-center mission objective banner. */
export class ObjectiveBanner {
  private el: HTMLDivElement;

  constructor() {
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'fixed', top: '12px', left: '50%', transform: 'translateX(-50%)', zIndex: '12',
      maxWidth: '72vw', display: 'none', alignItems: 'center', gap: '8px',
      background: 'rgba(14,16,22,0.82)', border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: '999px', padding: '8px 18px', color: '#e8ecf4',
      font: '600 13px system-ui, sans-serif', pointerEvents: 'none', whiteSpace: 'nowrap',
      overflow: 'hidden', textOverflow: 'ellipsis',
    } as Partial<CSSStyleDeclaration> as CSSStyleDeclaration);
    document.body.appendChild(this.el);
  }

  set(step: string, text: string) {
    this.el.style.display = 'flex';
    this.el.innerHTML = '';
    const chip = document.createElement('span');
    Object.assign(chip.style, {
      background: '#5fd29a', color: '#0d1210', borderRadius: '999px',
      padding: '2px 10px', font: '800 11px system-ui, sans-serif', letterSpacing: '0.06em',
    } as Partial<CSSStyleDeclaration> as CSSStyleDeclaration);
    chip.textContent = step.toUpperCase();
    const label = document.createElement('span');
    label.textContent = text;
    this.el.append(chip, label);
  }

  get text() { return this.el.textContent ?? ''; }
}
