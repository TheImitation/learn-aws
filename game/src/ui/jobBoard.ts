import type { Topic } from '@content';
import { readProgress, recordProgress } from '../core/progress';
import { DOMAINS, isLocked, LEVEL_NAME, levelOf, orderedTopics, readiness, recommended } from '../content/meta';
import { Journal } from './journal';
import { QuizTerminal } from './quizTerminal';
import { esc, UiShell, type PanelAction } from './uiShell';

/** Hooks the job board uses to hand off to a playable field mission. */
export interface MissionHook {
  topicId: string;
  inProgress: () => boolean; //   accepted and not finished
  done: () => boolean;
  start: () => void; //           open the mission briefing
  statusLine: () => string; //    current objective, for the ticket panel
}

/** The NOC job board: tickets for all 48 topics, grouped by exam domain, with the
 *  v1 readiness gauge, mastery badges, and tier gating (Foundational→Core→Advanced). */
export class JobBoard {
  constructor(
    private ui: UiShell,
    private journal: Journal,
    private quiz: QuizTerminal,
    private topics: Topic[],
    private missions: Record<string, MissionHook>,
  ) {}

  open() {
    const r = readiness(this.topics);
    const rec = recommended(this.topics);
    const bars = r.per.map((x) =>
      `<div style="display:flex;align-items:center;gap:8px;font-size:12px;margin:3px 0">` +
      `<span style="flex:1;color:#b9c1d0">${esc(x.d.label)} · ${x.d.weight}%</span>` +
      `<span style="flex:none;width:110px;height:6px;border-radius:99px;background:rgba(255,255,255,0.08);overflow:hidden">` +
      `<i style="display:block;height:100%;width:${x.pct}%;background:${x.d.accent}"></i></span>` +
      `<span style="flex:none;width:34px;text-align:right;color:#e8ecf4">${x.pct}%</span></div>`).join('');
    const gaugeColor = r.overall >= 69 ? '#5fd29a' : '#e8a657';
    const actions: PanelAction[] = [];
    if (rec) actions.push({ label: `▶ Recommended: ${rec.title}`, closes: false, onSelect: () => this.openTicket(rec) });
    for (const d of DOMAINS) {
      const ts = this.topics.filter((t) => t.examDomain === d.key);
      const prog = readProgress();
      const mastered = ts.filter((t) => prog[t.id]?.mastery === 'Mastered').length;
      actions.push({ label: `${d.label} — ${mastered}/${ts.length} mastered`, closes: false, onSelect: () => this.openDomain(d.key) });
    }
    actions.push({ label: 'Close' });
    this.ui.open({
      id: 'job-board',
      kicker: 'NOC · job board',
      title: 'Open tickets',
      bodyHtml:
        `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">` +
        `<span style="font-size:26px;font-weight:800;color:${gaugeColor}">${r.overall}%</span>` +
        `<span style="color:#6b7280;font-size:12px">exam ready · weighted by official domain weights<br>${r.attempted}/${r.total} topics attempted</span></div>` +
        bars,
      actions,
    });
  }

  /** Field missions are never tier-locked — the gate sequences study tickets only. */
  private locked(t: Topic): boolean {
    return isLocked(this.topics, t) && !this.missions[t.id];
  }

  private badge(t: Topic): string {
    if (this.locked(t)) return '🔒';
    const m = readProgress()[t.id]?.mastery ?? 'Not started';
    return m === 'Mastered' ? '✓' : m === 'Assessed' ? '◐' : '○';
  }

  private openDomain(domainKey: string) {
    const d = DOMAINS.find((x) => x.key === domainKey)!;
    const prog = readProgress();
    const ts = orderedTopics(this.topics).filter((t) => t.examDomain === domainKey);
    const actions: PanelAction[] = ts.map((t) => {
      const best = prog[t.id]?.best || 0;
      const mission = this.missions[t.id] ? ' · ⚙ field mission' : '';
      return {
        label: `${this.badge(t)} ${t.title}${best ? ` · ${best}%` : ''}${mission}`,
        closes: false,
        onSelect: () => this.openTicket(t),
      };
    });
    actions.push({ label: '← Back to board', closes: false, onSelect: () => this.open() });
    this.ui.open({
      id: `domain-${domainKey}`,
      kicker: 'Job board · domain',
      title: d.label,
      bodyHtml: `<div>${esc('○ open · ◐ assessed · ✓ mastered · 🔒 locked (master the earlier tier first)')}</div>`,
      actions,
    });
  }

  private openTicket(t: Topic) {
    const locked = this.locked(t);
    const prog = readProgress()[t.id];
    const mission = this.missions[t.id];
    const lines =
      `<div style="color:#6b7280;font-size:12px;margin-bottom:6px">${esc(LEVEL_NAME[levelOf(t.id)])} · ${esc(t.examDomain)} · ${esc(prog?.mastery ?? 'Not started')}${prog?.best ? ` · best ${prog.best}%` : ''}</div>` +
      `<div>${esc(t.summary)}</div>` +
      (locked ? `<div style="margin-top:8px;color:#e8a657">🔒 Locked — master the earlier tier in this domain first.</div>` : '');
    const actions: PanelAction[] = [];
    if (!locked) {
      if (mission) {
        if (mission.done()) {
          actions.push({ label: '✓ Resolved — play again (briefing)', closes: false, onSelect: () => mission.start() });
        } else if (mission.inProgress()) {
          actions.push({ label: `⚙ Resume mission — ${mission.statusLine()}`, closes: true });
        } else {
          actions.push({ label: '⚙ Start field mission', closes: false, onSelect: () => mission.start() });
        }
      } else {
        actions.push({ label: '📖 Study summary', closes: false, onSelect: () => this.openStudy(t) });
        actions.push({ label: '✍ Sign off (quiz)', closes: false, onSelect: () => this.signOff(t) });
      }
    }
    actions.push({ label: '← Back', closes: false, onSelect: () => this.openDomain(t.examDomain) });
    this.ui.open({
      id: `ticket-${t.id}`,
      kicker: `Ticket · ${t.id}`,
      title: t.title,
      bodyHtml: lines,
      actions,
    });
  }

  private openStudy(t: Topic) {
    const concepts = [...new Set(t.stages.map((s) => s.concept).filter(Boolean))];
    this.ui.open({
      id: `study-${t.id}`,
      kicker: 'Study notes',
      title: t.title,
      bodyHtml:
        `<div>${esc(t.summary)}</div><div style="height:8px"></div>` +
        concepts.map((c) => `<div>· ${esc(String(c))}</div>`).join(''),
      actions: [
        { label: '✍ Sign off (quiz)', closes: false, onSelect: () => this.signOff(t) },
        { label: '← Back to ticket', closes: false, onSelect: () => this.openTicket(t) },
      ],
    });
  }

  private signOff(t: Topic) {
    this.quiz.start(t, (pct, passed) => {
      recordProgress(t.id, passed ? 'Mastered' : 'Assessed', pct);
      this.journal.add(`Sign-off ${t.title}: ${pct}% — ${passed ? 'Mastered' : 'Assessed (need 80%)'}.`);
      this.ui.open({
        id: 'signoff-result',
        kicker: 'Sign-off',
        title: passed ? `✔ Mastered — ${pct}%` : `${pct}% — recorded as Assessed`,
        bodyHtml: `<div>${esc(passed ? 'Ticket closed. Readiness updated.' : 'Need 80% to master. Review the study notes and retry.')}</div>`,
        actions: [{ label: '← Back to ticket', closes: false, onSelect: () => this.openTicket(t) }],
      });
    });
  }
}
