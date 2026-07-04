import { esc, type PanelSpec } from './uiShell';

/** The engineer's field journal: clues and takeaways collected during missions. */
export class Journal {
  readonly notes: { t: number; text: string }[] = [];

  add(text: string) {
    this.notes.push({ t: Date.now(), text });
  }

  panelSpec(onClose?: () => void): PanelSpec {
    const body = this.notes.length
      ? this.notes.map((n, i) => `<div>· ${esc(n.text)}</div>`).join('')
      : '<em>No notes yet. Inspect things in the field — clues land here.</em>';
    return {
      id: 'journal',
      kicker: 'Field journal',
      title: `Notes (${this.notes.length})`,
      bodyHtml: body,
      actions: [{ label: 'Close', onSelect: onClose }],
    };
  }
}
