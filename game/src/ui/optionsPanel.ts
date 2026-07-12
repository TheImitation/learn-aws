import { keyName, OPTIONS, resetProfile, saveOptions, switchProfile, type Options } from '../core/options';
import { sfx } from '../core/sfx';
import type { PanelAction, UiShell } from './uiShell';

/** The options panel: every setting is a cycle-button (confirm advances the
 *  value) so the whole thing works identically on keyboard and pad. Value
 *  changes save immediately and re-open the panel to refresh labels. */

const cycle = <T,>(list: readonly T[], cur: T): T => list[(list.indexOf(cur) + 1) % list.length];

let rebinding = false;

function rebind(key: 'keyInteract' | 'keyJump' | 'keySprint' | 'keyJournal', ui: UiShell, toast: (t: string) => void) {
  if (rebinding) return;
  rebinding = true;
  ui.close();
  toast('Press the new key… (Esc cancels)');
  const onKey = (e: KeyboardEvent) => {
    e.preventDefault();
    window.removeEventListener('keydown', onKey, true);
    rebinding = false;
    if (e.keyCode !== 27) {
      OPTIONS[key] = e.keyCode;
      saveOptions();
      sfx.confirm();
    }
    openOptionsPanel(ui, toast);
  };
  window.addEventListener('keydown', onKey, true);
}

export function openOptionsPanel(ui: UiShell, toast: (t: string) => void) {
  const set = <K extends keyof Options>(k: K, v: Options[K]) => {
    OPTIONS[k] = v;
    saveOptions();
    openOptionsPanel(ui, toast); // refresh labels
  };
  const opt = (label: string, onSelect: () => void): PanelAction => ({ label, closes: false, onSelect });

  ui.open({
    id: 'options',
    kicker: 'Options',
    title: 'Settings',
    bodyHtml: `<div>Confirm cycles a value. Settings apply instantly and persist.</div>`,
    actions: [
      opt(`Look sensitivity: ${OPTIONS.sensitivity.toFixed(2)}×`, () =>
        set('sensitivity', cycle([0.5, 0.75, 1.0, 1.25, 1.5, 2.0] as const, OPTIONS.sensitivity))),
      opt(`Invert Y: ${OPTIONS.invertY ? 'ON' : 'OFF'}`, () => set('invertY', !OPTIONS.invertY)),
      opt(`Stick deadzone: ${OPTIONS.deadzone.toFixed(2)}`, () =>
        set('deadzone', cycle([0.1, 0.15, 0.2, 0.25, 0.3] as const, OPTIONS.deadzone))),
      opt(`SFX volume: ${Math.round(OPTIONS.sfxVolume * 100)}%`, () => {
        set('sfxVolume', cycle([0, 0.25, 0.5, 0.75, 1] as const, OPTIONS.sfxVolume));
        sfx.toastOk();
      }),
      opt(`Rebind interact: ${keyName(OPTIONS.keyInteract)}`, () => rebind('keyInteract', ui, toast)),
      opt(`Rebind jump: ${keyName(OPTIONS.keyJump)}`, () => rebind('keyJump', ui, toast)),
      opt(`Rebind sprint: ${keyName(OPTIONS.keySprint)}`, () => rebind('keySprint', ui, toast)),
      opt(`Rebind journal: ${keyName(OPTIONS.keyJournal)}`, () => rebind('keyJournal', ui, toast)),
      opt(`Profile: ${OPTIONS.profile} (cycle A/B/C)`, () => {
        const to = cycle(['A', 'B', 'C'] as const, OPTIONS.profile);
        switchProfile(to);
        window.location.reload(); // clean slate: board/missions re-read the live keys
      }),
      {
        label: '⚠ Reset THIS profile’s progress', closes: false,
        onSelect: () => ui.open({
          id: 'reset-confirm', kicker: 'Options', title: `Erase profile ${OPTIONS.profile}?`,
          bodyHtml: `<div>Mastery, missed questions, and exam history for profile ${OPTIONS.profile} will be permanently erased.</div>`,
          actions: [
            { label: 'Cancel', closes: false, onSelect: () => openOptionsPanel(ui, toast) },
            { label: 'Erase it', onSelect: () => { resetProfile(); window.location.reload(); } },
          ],
        }),
      },
      { label: 'Close' },
    ],
  });
}
