import type { Topic } from '@content';
import { recordProgress } from '../core/progress';
import { sfx } from '../core/sfx';
import { QuizTerminal } from '../ui/quizTerminal';
import { esc, type PanelAction } from '../ui/uiShell';
import type { Machine } from '../world/kit';
import type { MissionDeps } from './manager';
import type { MissionStep } from './patchNight';

export interface TicketInfo {
  incident: string; // "INC-4620"
  reporter: string; // "finops"
  sev: string; //     "SEV-3"
  title: string;
  bodyHtml: string;
  hint: string; //    last line of the briefing
}

export interface DiagnosisSpec {
  title: string;
  correct: { label: string; journal: string; confirmBody: string; actionLabel: string };
  wrongs: { label: string; rebuttal: string }[];
  correctIndex?: number; // display position of the correct option (default 1)
}

/** Shared mission plumbing, extracted from the four bespoke flagships: the step
 *  machine, briefing/diagnosis/beat/sign-off/summary panels, journal+objective
 *  bookkeeping, machine/interactable ownership, and timers. Subclasses build the
 *  level, wire the sim, and orchestrate their beats. */
export abstract class MissionBase {
  step: MissionStep = 'briefing';
  probes = new Set<string>();

  protected d: MissionDeps;
  protected topic: Topic;
  protected quiz: QuizTerminal;
  protected updaters: ((dt: number) => void)[] = [];
  private interactableIds: string[] = [];
  private ownedMachines: { root: { dispose(): void } }[] = [];
  private timers: { t: number; fn: () => void }[] = [];

  constructor(deps: MissionDeps, topic: Topic) {
    this.d = deps;
    this.topic = topic;
    this.quiz = new QuizTerminal(deps.ui);
  }

  // ------------------------------------------------ subclass responsibilities
  protected abstract ticket(): TicketInfo;
  /** Objective banner content per step. */
  protected abstract objectiveFor(step: MissionStep): [chip: string, text: string];
  /** Called once the ticket is accepted (briefing → investigate). */
  protected onAccepted?(): void;
  /** Per-frame hook (after owned updaters and timers). */
  protected onUpdate?(dt: number): void;
  /** Extra teardown (release shared-sim hooks etc.). */
  protected onDispose?(): void;
  /** One-line summary sentence for the resolved/summary panels. */
  protected abstract summaryText(): string;

  // ----------------------------------------------------------- owned lifecycle
  /** Track a machine for disposal (and fold its ambient updater in). */
  protected own<T extends Machine>(m: T): T {
    this.ownedMachines.push(m);
    if (m.update) this.updaters.push(m.update);
    return m;
  }
  /** Track a bare node (room walls etc.) for disposal. */
  protected ownNode(n: { dispose(): void }) { this.ownedMachines.push({ root: n }); }

  /** Register an interactable that dies with the mission. */
  protected reg(spec: Parameters<MissionDeps['interaction']['add']>[0]) {
    this.interactableIds.push(spec.id);
    this.d.interaction.add(spec);
  }

  /** Run something after a sim-time delay. */
  protected schedule(delay: number, fn: () => void) { this.timers.push({ t: delay, fn }); }

  update(dt: number) {
    for (const u of this.updaters) u(dt);
    if (this.timers.length) {
      for (const t of this.timers) t.t -= dt;
      const due = this.timers.filter((t) => t.t <= 0);
      this.timers = this.timers.filter((t) => t.t > 0);
      for (const t of due) t.fn();
    }
    this.onUpdate?.(dt);
  }

  dispose() {
    for (const id of this.interactableIds) this.d.interaction.remove(id);
    // (false, true): recurse children AND dispose their materials/textures —
    // plain dispose() leaks one set of materials into the scene per mission.
    for (const m of this.ownedMachines) (m.root as { dispose(a?: boolean, b?: boolean): void }).dispose(false, true);
    this.d.alarm.clear();
    this.onDispose?.();
  }

  /** Dev/e2e state snapshot; subclasses extend with their own fields. */
  e2e(): Record<string, unknown> {
    return { step: this.step, probes: [...this.probes] };
  }

  // ------------------------------------------------------------------ briefing
  openBriefing() {
    const t = this.ticket();
    this.d.objective.set('Ticket', `Read the ${t.sev} briefing`);
    this.d.ui.open({
      id: 'briefing',
      kicker: `${t.sev} · ${t.incident} · reported by ${t.reporter}`,
      title: t.title,
      bodyHtml: t.bodyHtml + `<div>${esc(t.hint)}</div>`,
      actions: [{ label: 'Accept ticket', onSelect: () => { this.step = 'investigate'; this.refreshObjective(); this.onAccepted?.(); } }],
    });
  }

  protected refreshObjective() {
    const [chip, text] = this.objectiveFor(this.step);
    this.d.objective.set(chip, text);
  }

  /** Record a probe once and note it in the journal. */
  protected probed(id: string, note: string) {
    if (this.probes.has(id)) return;
    this.probes.add(id);
    this.d.journal.add(note);
    if (this.step === 'investigate') this.refreshObjective();
  }

  // ----------------------------------------------------------------- diagnosis
  protected openDiagnosis(spec: DiagnosisSpec) {
    const wrong = (rebuttal: string): PanelAction => ({
      label: '',
      closes: false,
      onSelect: () => {
        this.d.journal.add(`Diagnosis rejected: ${rebuttal}`);
        this.d.ui.open({
          id: 'diag-wrong', kicker: 'Diagnosis', title: '✘ Not supported by the evidence',
          bodyHtml: `<div>${esc(rebuttal)}</div>`,
          actions: [{ label: 'Back to diagnosis', closes: false, onSelect: () => this.openDiagnosis(spec) }],
        });
      },
    });
    const actions: PanelAction[] = spec.wrongs.map((w) => ({ ...wrong(w.rebuttal), label: w.label }));
    const correct: PanelAction = {
      label: spec.correct.label,
      closes: false,
      onSelect: () => {
        this.step = 'fix';
        this.d.journal.add(spec.correct.journal);
        this.refreshObjective();
        this.d.ui.open({
          id: 'diag-right', kicker: 'Diagnosis', title: '✔ Root cause confirmed',
          bodyHtml: `<div>${esc(spec.correct.confirmBody)}</div>`,
          actions: [{ label: spec.correct.actionLabel }],
        });
      },
    };
    actions.splice(Math.min(spec.correctIndex ?? 1, actions.length), 0, correct);
    this.d.ui.open({ id: 'diagnosis', kicker: 'Diagnosis · pick the root cause', title: spec.title, actions });
  }

  // -------------------------------------------------------------------- beats
  /** A beat passed but more remain. */
  protected beatPassed(beat: string, nextLabel: string, extra = '') {
    this.refreshObjective();
    this.d.journal.add(`${beat} PASSED.${extra ? ' ' + extra : ''}`);
    this.d.ui.open({
      id: 'beat-pass', kicker: 'Verification', title: `✔ ${beat} passed`,
      bodyHtml: `<div>${esc(`Next: ${nextLabel}.`)}</div>`,
      actions: [{ label: 'Next test →' }],
    });
  }

  /** A beat failed: lesson + (usually) back to the fix step. */
  protected beatFailed(beat: string, note: string, toStep: MissionStep | null = 'fix') {
    if (toStep) this.step = toStep;
    this.refreshObjective();
    this.d.journal.add(`${beat} FAILED. ${note}`);
    this.d.ui.open({
      id: 'beat-fail', kicker: 'Verification', title: `✘ ${beat} failed`,
      bodyHtml: `<div>${esc(note)}</div>`,
      actions: [{ label: 'Back to work →' }],
    });
  }

  /** All beats passed → sign-off step. */
  protected allBeatsPassed(title: string, body: string, journal: string) {
    this.step = 'signoff';
    this.refreshObjective();
    this.d.journal.add(journal);
    this.d.ui.open({
      id: 'all-pass', kicker: 'Verification', title,
      bodyHtml: `<div>${esc(body)}</div>`,
      actions: [{ label: 'Sign-off →' }],
    });
  }

  // ------------------------------------------------------------------ signoff
  protected startSignoff(onGood?: () => void) {
    const t = this.ticket();
    this.quiz.start(this.topic, (pct, passed) => {
      const rec = recordProgress(this.topic.id, passed ? 'Mastered' : 'Assessed', pct);
      if (passed) {
        this.step = 'done';
        this.refreshObjective();
        sfx.resolved();
        onGood?.();
        this.d.journal.add(`${t.incident} closed. Sign-off ${pct}% — mastery recorded.`);
        this.d.ui.open({
          id: 'resolved', kicker: `${t.incident} · resolved`, title: `🎉 Ticket closed — ${pct}%`,
          bodyHtml: `<div>${esc(`Mastery: ${rec.mastery} · best ${rec.best}%. ${this.summaryText()}`)}</div>`,
          actions: [
            { label: '↩ Return to NOC', onSelect: () => this.d.onReturn() },
            { label: 'Stay on site' },
          ],
        });
      } else {
        this.d.ui.open({
          id: 'signoff-fail', kicker: 'Sign-off', title: `${pct}% — not enough to close (need 80%)`,
          bodyHtml: `<div>${esc('Recorded as Assessed. Review your journal and sign off again at the field terminal.')}</div>`,
          actions: [{ label: 'OK' }],
        });
      }
    });
  }

  protected openSummary() {
    const t = this.ticket();
    const concepts = [...new Set(this.topic.stages.map((s) => s.concept).filter(Boolean))];
    this.d.ui.open({
      id: 'summary', kicker: `${t.incident} · resolved`, title: `${t.title} — summary`,
      bodyHtml:
        `<div>${esc(this.summaryText())}</div><div style="height:8px"></div>` +
        concepts.map((c) => `<div>· ${esc(String(c))}</div>`).join(''),
      actions: [{ label: 'Close' }],
    });
  }
}
