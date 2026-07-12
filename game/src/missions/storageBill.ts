import { Vector3 } from '@babylonjs/core';
import type { Topic } from '@content';
import { crowdGate, routeBoard, shelfUnit, statusConsole } from '../world/kit';
import { esc } from '../ui/uiShell';
import { MissionBase, type MissionStep, type TicketInfo } from './base';
import type { MissionDeps } from './manager';


type Policy = 'none' | 'tiered' | 'allda' | 'allia';
type Beat = 'bill' | 'audit';

const BUDGET = 800;
// Monthly cost model per policy: [logs, thumbs, penalties+retrieval, archives, total]
const COSTS: Record<Policy, { logs: number; thumbs: number; fees: number; arch: number; total: number; note: string }> = {
  none: { logs: 920, thumbs: 46, fees: 0, arch: 1380, total: 2346, note: 'everything resting in Standard' },
  tiered: { logs: 500, thumbs: 46, fees: 0, arch: 60, total: 606, note: 'IA for logs · Standard for hot thumbs · Deep Archive for cold' },
  allda: { logs: 40, thumbs: 2, fees: 0, arch: 60, total: 102, note: 'storage line only — retrievals pending…' },
  allia: { logs: 500, thumbs: 610, fees: 800, arch: 750, total: 2660, note: '128 KB minimums + retrieval fees on hot thumbnails' },
};
const BEATS: { id: Beat; label: string }[] = [
  { id: 'bill', label: 'bill review' },
  { id: 'audit', label: 'audit retrieval drill (3 fetches)' },
];

/** Flagship 5 (Cost): SEV-3 "The Storage Bill" — 102 TB ages in S3 Standard forever.
 *  Tier by access pattern. Traps: everything→Deep-Archive passes the bill and then
 *  fails the audit SLA (hours, not milliseconds); everything→IA makes the bill WORSE
 *  (minimum-object charges + retrieval fees on millions of hot thumbnails). */
export class StorageBillMission extends MissionBase {
  private policy: Policy = 'none';
  private beatsPassed = new Set<Beat>();
  private test: { beat: Beat; total: number; resolved: number; violations: number; running: boolean } | null = null;
  private m!: {
    gate: ReturnType<typeof crowdGate>;
    hot: ReturnType<typeof shelfUnit>; cool: ReturnType<typeof shelfUnit>; vault: ReturnType<typeof shelfUnit>;
    board: ReturnType<typeof routeBoard>; term: ReturnType<typeof statusConsole>;
  };

  constructor(deps: MissionDeps, topic: Topic) {
    super(deps, topic);
    this.buildLevel();
    this.wireSim();
    this.wireInteractables();
    this.applyLamps();
  }

  protected onDispose() { this.d.sim.onTokenResolved = undefined; }

  protected ticket(): TicketInfo {
    return {
      incident: 'INC-4620', reporter: 'finops', sev: 'SEV-3', title: 'The Storage Bill',
      bodyHtml:
        `<div>${esc('Finance escalated: the S3 line tripled year-over-year and it’s now the team’s biggest cost. Nothing is deleted — and nothing ever moves. Compliance still needs instant reads on audit, so don’t torch the SLA to save money.')}</div>` +
        `<pre>S3 storage (monthly) .... $2,346  ▲3.1×\nbudget .................. $${BUDGET}\naudit SLA ............... instant reads on logs</pre>`,
      hint: 'Inspect the shelves, diagnose at the field terminal, then configure the lifecycle board. The bill AND the audit drill must both pass.',
    };
  }

  protected objectiveFor(step: MissionStep): [string, string] {
    const next = BEATS.find((b) => !this.beatsPassed.has(b.id));
    switch (step) {
      case 'investigate': return ['Investigate', `Inspect the shelves (${this.probes.size}/4) · diagnose at the field terminal`];
      case 'fix': return ['Fix', 'Configure the lifecycle policy at the board'];
      case 'verify': return ['Verify', next ? `Run the ${next.label} at the field terminal` : 'All tests passed'];
      case 'signoff': return ['Sign-off', 'Close the ticket at the field terminal (quiz)'];
      case 'done': return ['Resolved', 'INC-4620 closed — tiered by access pattern, SLA intact.'];
      default: return ['Ticket', 'Read the SEV-3 briefing'];
    }
  }

  protected summaryText(): string {
    return 'Symptom: 102 TB resting in Standard forever. Fix: lifecycle rules that tier by ACCESS PATTERN — logs to Standard-IA after 30 days (instant reads, half the storage price), hot thumbnails stay in Standard (IA minimums and retrieval fees punish tiny hot objects), cold archives to Deep Archive. Bill $2,346 → $606 with the audit SLA intact.';
  }

  // ---------------------------------------------------------------- level
  private buildLevel() {
    const s = this.d.scene;
    const o = this.d.origin;
    this.m = {
      gate: this.own(crowdGate(s, o.add(new Vector3(-8, 0, 0)), Math.PI / 2)),
      hot: this.own(shelfUnit(s, o.add(new Vector3(1.5, 0, -4)), -Math.PI / 2, '#e8a657')),
      cool: this.own(shelfUnit(s, o.add(new Vector3(1.5, 0, 0)), -Math.PI / 2, '#57c7e3')),
      vault: this.own(shelfUnit(s, o.add(new Vector3(1.5, 0, 4)), -Math.PI / 2, '#8f7ae6', true)),
      board: this.own(routeBoard(s, o.add(new Vector3(-3, 0, -6.5)), 0)),
      term: this.own(statusConsole(s, o.add(new Vector3(-7, 0, -6.5)), Math.PI)),
    };
  }

  private wireSim() {
    const { sim } = this.d;
    const o = this.d.origin;
    const logsNode = () => ({ none: 'sHot', tiered: 'sCool', allda: 'sVault', allia: 'sCool' }[this.policy]);
    sim.addNode({ id: 'gate', anchor: this.m.gate.anchor, next: () => logsNode() });
    sim.addNode({ id: 'sHot', anchor: this.m.hot.anchor, next: () => 'ret' });
    sim.addNode({ id: 'sCool', anchor: this.m.cool.anchor, next: () => 'ret' });
    // anything fetched from the deep vault misses an instant-read SLA
    sim.addNode({ id: 'sVault', anchor: this.m.vault.anchor, next: () => 'drop' });
    sim.addNode({ id: 'ret', anchor: o.add(new Vector3(-7.2, 1.4, -1.6)), next: () => 'deliver' });
    sim.onTokenResolved = (_t, outcome) => {
      const t = this.test;
      if (!t?.running || t.beat !== 'audit') return;
      t.resolved++;
      if (outcome === 'drop') t.violations++;
      if (t.resolved >= t.total) {
        t.running = false;
        this.onBeat(t.violations === 0, 'audit');
      }
    };
  }

  private applyLamps() {
    const good = this.step === 'signoff' || this.step === 'done';
    this.m.gate.setLamp?.(good ? 'ok' : 'off');
    this.m.hot.setLamp?.(good ? 'ok' : this.policy === 'none' ? 'bad' : 'ok');
    this.m.cool.setLamp?.(this.policy === 'tiered' || this.policy === 'allia' ? 'ok' : 'off');
    this.m.vault.setLamp?.(this.policy === 'allda' || this.policy === 'tiered' ? 'ok' : 'off');
    this.m.term.setLamp?.(good ? 'ok' : 'off');
    this.m.board.setLamp?.(good ? 'ok' : this.policy === 'none' ? 'bad' : 'ok');
    this.m.board.setSlot(0, this.policy !== 'none'); //            logs rule
    this.m.board.setSlot(1, this.policy === 'allia' || this.policy === 'allda'); // thumbs moved (traps)
    this.m.board.setSlot(2, this.policy === 'tiered' || this.policy === 'allda'); // archives rule
  }

  // ---------------------------------------------------------- interactables
  private wireInteractables() {
    const m = this.m;
    this.reg({ id: 'sb-gate', node: m.gate.root, prompt: 'Inspect the readers', onInteract: () => this.probeGate() });
    this.reg({ id: 'sb-hot', node: m.hot.root, prompt: 'Inspect Standard shelf', onInteract: () => this.probeHot() });
    this.reg({ id: 'sb-cool', node: m.cool.root, prompt: 'Inspect Standard-IA shelf', onInteract: () => this.probeCool() });
    this.reg({ id: 'sb-vault', node: m.vault.root, prompt: 'Inspect Deep Archive vault', onInteract: () => this.probeVault() });
    this.reg({ id: 'sb-board', node: m.board.root, prompt: 'Lifecycle policy board', onInteract: () => this.openBoard() });
    this.reg({ id: 'sb-term', node: m.term.root, prompt: 'Open field terminal', onInteract: () => this.openTerminal() });
  }

  // ---------------------------------------------------------------- probes
  private probeGate() {
    this.probed('gate', 'Readers: the app hammers thumbnails all day; auditors fetch a few old logs — but their SLA says INSTANT.');
    this.d.ui.open({
      id: 'sb-probe-gate', kicker: 'Access patterns', title: 'Who reads what',
      bodyHtml: `<pre>thumbnails ... millions of reads/day (hot)\nlogs ......... ~5 reads/quarter (audits)\narchives ..... never read (7-y retention)\naudit SLA .... instant retrieval, contractual</pre>`,
      actions: [{ label: 'Close' }],
    });
  }

  private probeHot() {
    this.probed('hot', 'Standard shelf: ALL 102 TB lives here — 40 TB logs untouched after 30 days, 2 TB hot thumbnails, 60 TB never-read archives.');
    this.d.ui.open({
      id: 'sb-probe-hot', kicker: 'S3 Standard · $23/TB·mo', title: 'The everything shelf',
      bodyHtml: `<pre>logs ........ 40 TB (cold after 30 days)\nthumbnails ..  2 TB (HOT — tiny objects)\narchives .... 60 TB (never read, 7-y hold)\nlifecycle ... none configured</pre><div>${esc('The most expensive shelf in the building, holding data that mostly sleeps.')}</div>`,
      actions: [{ label: 'Close' }],
    });
  }

  private probeCool() {
    this.probed('cool', 'Standard-IA: instant reads at ~half the storage price — but retrieval fees, 128 KB minimum object charge, 30-day minimum.');
    this.d.ui.open({
      id: 'sb-probe-cool', kicker: 'S3 Standard-IA · $12.5/TB·mo', title: 'The cool shelf',
      bodyHtml: `<pre>reads ........ instant (milliseconds)\nretrieval .... per-GB fee on every read\nminimums ..... 128 KB/object · 30 days\nbest for ..... data you keep but rarely touch</pre>`,
      actions: [{ label: 'Close' }],
    });
  }

  private probeVault() {
    this.probed('vault', 'Deep Archive: ~$1/TB — and retrievals take HOURS. Nothing with an instant-read SLA belongs here.');
    this.d.ui.open({
      id: 'sb-probe-vault', kicker: 'S3 Glacier Deep Archive · $1/TB·mo', title: 'The deep vault',
      bodyHtml: `<pre>reads ........ 9–12 HOURS to restore\nbest for ..... data you keep for years\n              and hope to never read</pre>`,
      actions: [{ label: 'Close' }],
    });
  }

  // -------------------------------------------------------- lifecycle board
  private openBoard() {
    if (this.step !== 'fix' && this.step !== 'verify') {
      this.probed('board', 'Lifecycle board: empty. No transition rules — data dies of old age in Standard.');
      this.d.ui.open({
        id: 'sb-board-probe', kicker: 'Lifecycle policy', title: 'No rules configured',
        bodyHtml: `<div>${esc('Objects stay in the class they were born in. Diagnose at the field terminal first.')}</div>`,
        actions: [{ label: 'Close' }],
      });
      return;
    }
    const pick = (p: Policy, label: string) => ({
      label,
      onSelect: () => {
        this.policy = p;
        this.beatsPassed.clear();
        if (this.step === 'fix') this.step = 'verify';
        this.d.journal.add(`Lifecycle policy set: ${label}.`);
        this.applyLamps();
        this.refreshObjective();
      },
    });
    this.d.ui.open({
      id: 'sb-board', kicker: 'Lifecycle policy', title: 'Configure transitions',
      bodyHtml: `<div>${esc('One policy. The bill must land under budget AND the audit drill must still get instant reads.')}</div>`,
      actions: [
        pick('allda', 'Everything older than 30 days → Deep Archive (cheapest possible)'),
        pick('tiered', 'Logs → Standard-IA after 30 d · thumbnails stay Standard · archives → Deep Archive'),
        pick('allia', 'Everything → Standard-IA (one simple rule)'),
        pick('none', 'Keep everything in Standard (no rules)'),
        { label: 'Cancel' },
      ],
    });
  }

  // -------------------------------------------------------- field terminal
  private openTerminal() {
    const beatsLine = BEATS.map((b) => `${this.beatsPassed.has(b.id) ? '✓' : '·'} ${b.label}`).join('\n');
    const c = COSTS[this.policy];
    const actions = [];
    if (this.step === 'investigate') {
      actions.push({ label: 'Run bill review — see the damage', closes: true, onSelect: () => this.runBill() });
      if (this.probes.has('hot')) actions.push({ label: 'Diagnose root cause…', closes: false, onSelect: () => this.openDiag() });
    } else if (this.step === 'fix') {
      actions.push({ label: 'Run bill review', closes: true, onSelect: () => this.runBill() });
    } else if (this.step === 'verify') {
      const next = BEATS.find((b) => !this.beatsPassed.has(b.id));
      if (next) actions.push({ label: `Run ${next.label}`, closes: true, onSelect: () => (next.id === 'bill' ? this.runBill() : this.runAudit()) });
    } else if (this.step === 'signoff') {
      actions.push({ label: 'Close ticket — sign off (quiz)', closes: false, onSelect: () => this.startSignoff(() => this.applyLamps()) });
    } else if (this.step === 'done') {
      actions.push({ label: 'Ticket summary', closes: false, onSelect: () => this.openSummary() });
    }
    actions.push({ label: 'Close' });
    this.d.ui.open({
      id: 'sb-terminal', kicker: 'Field terminal · INC-4620', title: 'Storage economics',
      bodyHtml: `<pre>step: ${this.step.toUpperCase()}\npolicy: ${esc(c.note)}\nprojected bill: $${c.total.toLocaleString()}  (budget $${BUDGET})\n\n${esc(beatsLine)}</pre>`,
      actions,
    });
  }

  private openDiag() {
    this.openDiagnosis({
      title: 'Why did the bill triple?',
      correct: {
        label: 'Nothing ever moves — every byte ages in the priciest class. Tier by ACCESS PATTERN with lifecycle rules',
        journal: 'Diagnosis confirmed: no lifecycle rules; tier logs/thumbnails/archives by how they are actually read.',
        confirmBody: 'The probes told you everything: cold logs (but instant-SLA), hot tiny thumbnails, never-read archives. Configure the lifecycle board to match data to shelf.',
        actionLabel: 'To the board →',
      },
      wrongs: [
        { label: 'The bucket is over-replicated — reduce durability', rebuttal: 'Standard’s multi-AZ durability is built into the price of every class — the bill driver is 102 TB resting on the most expensive shelf.' },
        { label: 'The auditors read too much data', rebuttal: 'Audits fetch a handful of objects a quarter. The cost is the RESTING data, not the reads.' },
        { label: 'Delete the old data', rebuttal: 'Retention is contractual — logs one year, archives seven. Deletion is a compliance breach, not a saving.' },
      ],
    });
  }

  // ------------------------------------------------------------ test beats
  private runBill() {
    this.m.term.setLamp?.('off');
    this.test = { beat: 'bill', total: 1, resolved: 0, violations: 0, running: true };
    this.schedule(1.2, () => {
      const c = COSTS[this.policy];
      const pass = c.total <= BUDGET;
      this.test = null;
      const table =
        `<pre>logs ............. $${c.logs.toLocaleString()}\nthumbnails ....... $${c.thumbs.toLocaleString()}\npenalties+fees ... $${c.fees.toLocaleString()}\narchives ......... $${c.arch.toLocaleString()}\nTOTAL ............ $${c.total.toLocaleString()}   budget $${BUDGET}\n(${esc(c.note)})</pre>`;
      if (this.step === 'investigate') {
        this.d.journal.add(`Bill review: $${c.total.toLocaleString()}/mo — ${Math.round(c.total / BUDGET * 100)}% of budget.`);
        this.d.ui.open({ id: 'sb-bill-info', kicker: 'Bill review', title: `$${c.total.toLocaleString()} / month`, bodyHtml: table, actions: [{ label: 'Ouch. Close' }] });
        return;
      }
      if (this.step !== 'verify') return;
      if (pass) {
        this.beatsPassed.add('bill');
        this.d.ui.open({ id: 'sb-bill-pass', kicker: 'Bill review', title: `✔ $${c.total.toLocaleString()} — under budget`, bodyHtml: table, actions: [{ label: 'Next: the audit drill →' }] });
        this.d.journal.add(`Bill review PASSED: $${c.total.toLocaleString()}/mo.`);
        this.refreshObjective();
      } else {
        const note = this.policy === 'allia'
          ? 'The bill went UP: millions of tiny hot thumbnails now pay the 128 KB minimum-object charge plus a retrieval fee on every read. IA suits data you rarely touch — not hot little files.'
          : 'No savings — the data is still resting in the priciest class.';
        this.beatFailed('bill review', note);
        this.d.ui.open({ id: 'sb-bill-fail', kicker: 'Bill review', title: `✘ $${c.total.toLocaleString()} — over budget`, bodyHtml: table + `<div>${esc(note)}</div>`, actions: [{ label: 'Back to the board →' }] });
      }
    });
  }

  private runAudit() {
    this.m.term.setLamp?.('off');
    this.test = { beat: 'audit', total: 3, resolved: 0, violations: 0, running: true };
    for (let i = 0; i < 3; i++) this.schedule(i * 0.5, () => this.d.sim.spawn('gate', 'fetch-log'));
  }

  private onBeat(pass: boolean, beat: Beat) {
    if (this.step !== 'verify') return;
    if (pass) {
      this.beatsPassed.add(beat);
      const next = BEATS.find((b) => !this.beatsPassed.has(b.id));
      if (!next) {
        this.allBeatsPassed(
          '✔ Under budget — audit reads instant',
          `The bill landed at $${COSTS[this.policy].total.toLocaleString()} and the auditors got their logs in milliseconds from Standard-IA. Right data, right shelf. Close the ticket at the field terminal.`,
          'Bill and audit drill both passed — lifecycle tiering by access pattern.',
        );
        this.applyLamps();
      } else {
        this.beatPassed(beat, next.label);
      }
    } else {
      this.beatFailed('audit drill',
        'The auditor’s fetch came back “retrieval initiated — ready in ~10 hours.” Deep Archive trades access time for price; the SLA needs milliseconds. Logs belong in Standard-IA: instant reads at half the storage cost.');
    }
  }
}
