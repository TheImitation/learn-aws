import { Vector3 } from '@babylonjs/core';
import type { Topic } from '@content';
import { recordProgress } from '../core/progress';
import { internetGate, natAirlock, routeBoard, serverRack, statusConsole } from '../world/kit';
import { QuizTerminal } from '../ui/quizTerminal';
import { esc } from '../ui/uiShell';
import type { MissionDeps } from './manager';

export type MissionStep = 'briefing' | 'investigate' | 'fix' | 'verify' | 'signoff' | 'done';
type RouteChoice = 'nat' | 'igw' | 'vgw' | 'localnat' | null;

const TEST_N = 6;

/** Vertical-slice mission for topic `private-egress-nat`:
 *  SEV-2 "Patch Night" — private app racks can't fetch security updates because the
 *  private route table has no default route to the NAT gateway. */
export class PatchNightMission {
  step: MissionStep = 'briefing';
  probes = new Set<string>();
  routeChoice: RouteChoice = null;

  private d: MissionDeps;
  private topic: Topic;
  private quiz: QuizTerminal;
  private updaters: ((dt: number) => void)[] = [];
  private machines!: ReturnType<PatchNightMission['buildLevel']>;
  private interactableIds: string[] = [];
  private sawTestRunning = false;
  private lastFailNote = '';

  constructor(deps: MissionDeps, topic: Topic) {
    this.d = deps;
    this.topic = topic;
    this.quiz = new QuizTerminal(deps.ui);
    this.machines = this.buildLevel();
    this.wireSim();
    this.wireInteractables();
    this.applyLamps();
  }

  dispose() {
    for (const id of this.interactableIds) this.d.interaction.remove(id);
    for (const m of Object.values(this.machines)) m.root.dispose();
  }

  // ---------------------------------------------------------------- level
  private buildLevel() {
    const s = this.d.scene;
    const o = this.d.origin;
    const rackA = serverRack(s, o.add(new Vector3(-6, 0, 3)), Math.PI / 2);
    const rackB = serverRack(s, o.add(new Vector3(-6, 0, 6)), Math.PI / 2);
    const board = routeBoard(s, o.add(new Vector3(-1, 0, 4.5)), Math.PI / 2);
    const nat = natAirlock(s, o.add(new Vector3(3.5, 0, 4.5)), Math.PI / 2);
    const igw = internetGate(s, o.add(new Vector3(8, 0, 4.5)), Math.PI / 2);
    const term = statusConsole(s, o.add(new Vector3(-1, 0, 0)), Math.PI);
    for (const m of [rackA, rackB, igw]) if (m.update) this.updaters.push(m.update);
    return { rackA, rackB, board, nat, igw, term };
  }

  private wireSim() {
    const { sim } = this.d;
    const m = this.machines;
    sim.addNode({ id: 'rackA', anchor: m.rackA.anchor, next: () => 'board' });
    sim.addNode({ id: 'rackB', anchor: m.rackB.anchor, next: () => 'board' });
    sim.addNode({
      id: 'board', anchor: m.board.anchor,
      next: () => (this.routeChoice === 'nat' ? 'nat' : this.routeChoice === 'igw' ? 'igw' : 'drop'),
    });
    sim.addNode({ id: 'nat', anchor: m.nat.anchor, next: (t) => { t.meta.viaNat = true; return 'igw'; } });
    sim.addNode({ id: 'igw', anchor: m.igw.anchor, next: (t) => (t.meta.viaNat ? 'deliver' : 'drop') });
  }

  private applyLamps() {
    const fixed = this.step === 'signoff' || this.step === 'done';
    const m = this.machines;
    m.rackA.setLamp?.(fixed ? 'ok' : 'bad');
    m.rackB.setLamp?.(fixed ? 'ok' : 'bad');
    m.board.setLamp?.(fixed ? 'ok' : 'bad');
    m.nat.setLamp?.('ok');
    m.board.setSlot(0, true); m.board.setSlot(1, true);
    m.board.setSlot(2, this.routeChoice !== null);
    m.term.setLamp?.(fixed ? 'ok' : 'off');
  }

  // ---------------------------------------------------------- interactables
  private wireInteractables() {
    const { interaction } = this.d;
    const m = this.machines;
    const add = (spec: Parameters<typeof interaction.add>[0]) => { this.interactableIds.push(spec.id); interaction.add(spec); };
    add({ id: 'probe-rack', node: m.rackA.root, prompt: 'Inspect app rack', onInteract: () => this.probeRack() });
    add({ id: 'probe-rack-b', node: m.rackB.root, prompt: 'Inspect app rack', onInteract: () => this.probeRack() });
    add({ id: 'route-board', node: m.board.root, prompt: 'Inspect route table', onInteract: () => this.openBoard() });
    add({ id: 'probe-nat', node: m.nat.root, prompt: 'Inspect NAT gateway', onInteract: () => this.probeNat() });
    add({ id: 'probe-igw', node: m.igw.root, prompt: 'Inspect internet gateway', onInteract: () => this.probeIgw() });
    add({ id: 'field-terminal', node: m.term.root, prompt: 'Open field terminal', onInteract: () => this.openTerminal() });
  }

  // -------------------------------------------------------------- briefing
  openBriefing() {
    this.d.objective.set('Ticket', 'Read the SEV-2 briefing');
    this.d.ui.open({
      id: 'briefing',
      kicker: 'SEV-2 · INC-4021 · reported by release-eng',
      title: 'Patch Night',
      bodyHtml:
        `<div>${esc('Tonight’s security patches are failing on the app fleet. The racks sit in a private subnet — by design, no public exposure — but they can’t reach the package repo. Maintenance window closes soon.')}</div>` +
        `<pre>$ sudo yum update\nCould not retrieve mirrorlist\ntimeout: repo.example.com:443</pre>` +
        `<div>${esc('Head to the private-subnet corner (north). Inspect the machines (E/✕), collect clues in your journal (Tab/Ⓨ), then diagnose at the field terminal.')}</div>`,
      actions: [{ label: 'Accept ticket', onSelect: () => this.toInvestigate() }],
    });
  }

  private toInvestigate() {
    this.step = 'investigate';
    this.updateObjective();
  }

  private updateObjective() {
    const o = this.d.objective;
    switch (this.step) {
      case 'investigate': o.set('Investigate', `Inspect the machines (${this.probes.size}/4) · diagnose at the field terminal`); break;
      case 'fix': o.set('Fix', 'Add the missing route at the route-table board'); break;
      case 'verify': o.set('Verify', 'Run the traffic test at the field terminal'); break;
      case 'signoff': o.set('Sign-off', 'Close the ticket at the field terminal (quiz)'); break;
      case 'done': o.set('Resolved', 'INC-4021 closed — patches flowing. Nice work.'); break;
      default: break;
    }
  }

  private probed(id: string, note: string) {
    if (!this.probes.has(id)) {
      this.probes.add(id);
      this.d.journal.add(note);
      if (this.step === 'investigate') this.updateObjective();
    }
  }

  // ---------------------------------------------------------------- probes
  private probeRack() {
    this.probed('rack', 'Racks: outbound update requests time out. No public IPs (by design). SG outbound: allow all.');
    this.d.ui.open({
      id: 'probe-rack',
      kicker: 'App rack · private subnet',
      title: 'i-0aa41 / i-0aa42 — app fleet',
      bodyHtml:
        `<pre>$ sudo yum update\ntimeout: repo.example.com:443\n\npublic IP ......... none (by design)\nSG outbound ....... allow 0.0.0.0/0 ✓\nsubnet ............ subnet-private-a</pre>` +
        `<div>${esc(String(this.topic.blocks.find((b) => b.id === 'server')?.real ?? ''))}</div>`,
      actions: [{ label: 'Close' }],
    });
  }

  private probeNat() {
    this.probed('nat', 'NAT gateway nat-0a1b2c3d: available, lives in the PUBLIC subnet. Healthy.');
    this.d.ui.open({
      id: 'probe-nat',
      kicker: 'NAT gateway',
      title: 'nat-0a1b2c3d',
      bodyHtml:
        `<pre>state ............. available ✓\nsubnet ............ subnet-public-a\nelastic IP ........ attached ✓</pre>` +
        `<div>${esc(String(this.topic.blocks.find((b) => b.id === 'nat')?.plain ?? ''))}</div>`,
      actions: [{ label: 'Close' }],
    });
  }

  private probeIgw() {
    this.probed('igw', 'Internet gateway: attached to the VPC. Public subnet routes through it.');
    this.d.ui.open({
      id: 'probe-igw',
      kicker: 'Internet gateway',
      title: 'igw-main',
      bodyHtml:
        `<pre>state ............. attached ✓\nVPC ............... vpc-main</pre>` +
        `<div>${esc(String(this.topic.blocks.find((b) => b.id === 'igw')?.plain ?? ''))}</div>`,
      actions: [{ label: 'Close' }],
    });
  }

  // ----------------------------------------------------------- route board
  private openBoard() {
    const canEdit = this.step === 'fix' || this.step === 'verify';
    this.probed('board', 'Private route table rtb-private-01: only 10.0.0.0/16 → local. NO default route.');
    const current = this.routeChoice === null ? '—  (empty slot)'
      : this.routeChoice === 'nat' ? '0.0.0.0/0 → nat-0a1b2c3d'
        : this.routeChoice === 'igw' ? '0.0.0.0/0 → igw-main'
          : this.routeChoice === 'vgw' ? '0.0.0.0/0 → vgw-vpn' : '10.0.0.0/16 → nat-0a1b2c3d';
    const body =
      `<pre>rtb-private-01   (subnet-private-a, -b)\n10.0.0.0/16 → local\n${esc(current)}</pre>` +
      (canEdit ? `<div>${esc('Pick the entry for the empty slot.')}</div>` : `<div>${esc('The slot is empty — updates have nowhere to go. Diagnose at the field terminal first.')}</div>`);
    const pick = (choice: Exclude<RouteChoice, null>, label: string) => ({
      label,
      onSelect: () => {
        this.routeChoice = choice;
        this.d.journal.add(`Placed route card: ${label}.`);
        if (this.step === 'fix') this.step = 'verify';
        this.applyLamps();
        this.updateObjective();
      },
    });
    this.d.ui.open({
      id: 'route-board',
      kicker: 'Route table',
      title: 'rtb-private-01',
      bodyHtml: body,
      actions: canEdit
        ? [
          pick('igw', '0.0.0.0/0 → igw-main'),
          pick('nat', '0.0.0.0/0 → nat-0a1b2c3d'),
          pick('localnat', '10.0.0.0/16 → nat-0a1b2c3d'),
          pick('vgw', '0.0.0.0/0 → vgw-vpn'),
          { label: 'Close' },
        ]
        : [{ label: 'Close' }],
    });
  }

  // -------------------------------------------------------- field terminal
  private openTerminal() {
    const r = this.d.sim.trafficReport;
    const testLine = r.total === 0 ? 'no test run yet'
      : `last test: ${r.delivered}/${r.total} delivered · ${r.dropped} dropped · ${r.pass === null ? 'running…' : r.pass ? 'PASS' : 'FAIL'}`;
    const actions = [];
    if (this.step === 'investigate') {
      actions.push({ label: 'Run traffic test — watch the symptom', closes: true, onSelect: () => this.runTest() });
      if (this.probes.has('board')) actions.push({ label: 'Diagnose root cause…', closes: false, onSelect: () => this.openDiagnosis() });
    } else if (this.step === 'fix') {
      actions.push({ label: 'Run traffic test', closes: true, onSelect: () => this.runTest() });
    } else if (this.step === 'verify') {
      actions.push({ label: `Run traffic test (${TEST_N} parcels)`, closes: true, onSelect: () => this.runTest() });
    } else if (this.step === 'signoff') {
      actions.push({ label: 'Close ticket — sign off (quiz)', closes: false, onSelect: () => this.startSignoff() });
      actions.push({ label: 'Run traffic test again', closes: true, onSelect: () => this.runTest() });
    } else if (this.step === 'done') {
      actions.push({ label: 'Ticket summary', closes: false, onSelect: () => this.openSummary() });
    }
    actions.push({ label: 'Close' });
    const hint = this.step === 'investigate' && !this.probes.has('board')
      ? '\nhint: inspect the route table before diagnosing' : '';
    this.d.ui.open({
      id: 'field-terminal',
      kicker: 'Field terminal · INC-4021',
      title: 'Egress test — private subnet',
      bodyHtml: `<pre>step: ${this.step.toUpperCase()}\n${esc(testLine)}${esc(hint)}</pre>`,
      actions,
    });
  }

  private openDiagnosis() {
    const wrong = (rebuttal: string) => ({
      closes: false,
      onSelect: () => {
        this.d.journal.add(`Diagnosis rejected: ${rebuttal}`);
        this.d.ui.open({
          id: 'diagnosis-wrong',
          kicker: 'Diagnosis',
          title: '✘ Not supported by the evidence',
          bodyHtml: `<div>${esc(rebuttal)}</div>`,
          actions: [{ label: 'Back to diagnosis', closes: false, onSelect: () => this.openDiagnosis() }],
        });
      },
    });
    this.d.ui.open({
      id: 'diagnosis',
      kicker: 'Diagnosis · pick the root cause',
      title: 'Why can’t the fleet reach the repo?',
      actions: [
        { label: 'The NAT gateway is in a private subnet, so it has no internet path', ...wrong('Your probe showed nat-0a1b2c3d in subnet-public-a with an Elastic IP — it has an internet path.') },
        {
          label: 'The private route table has no default route to the NAT gateway',
          closes: false,
          onSelect: () => {
            this.step = 'fix';
            this.d.journal.add('Diagnosis confirmed: rtb-private-01 is missing its default route to the NAT.');
            this.updateObjective();
            this.d.ui.open({
              id: 'diagnosis-right',
              kicker: 'Diagnosis',
              title: '✔ Root cause confirmed',
              bodyHtml: `<div>${esc('rtb-private-01 has only the local route. Without 0.0.0.0/0 pointing somewhere, update traffic dies at the table. Head to the route board and place the missing entry.')}</div>`,
              actions: [{ label: 'To work →' }],
            });
          },
        },
        { label: 'The security group blocks outbound 443', ...wrong('The rack probe showed SG outbound allow-all — and security groups are stateful anyway.') },
        { label: 'The instances need public IP addresses', ...wrong('Giving the fleet public IPs breaks the private-subnet design — the ticket requires no direct exposure.') },
      ],
    });
  }

  private runTest() {
    this.machines.term.setLamp?.('off');
    this.sawTestRunning = false;
    this.d.sim.trafficTest(['rackA', 'rackB'], TEST_N);
  }

  private startSignoff() {
    this.quiz.start(this.topic, (pct, passed) => {
      const rec = recordProgress(this.topic.id, passed ? 'Mastered' : 'Assessed', pct);
      if (passed) {
        this.step = 'done';
        this.updateObjective();
        this.d.journal.add(`INC-4021 closed. Sign-off ${pct}% — mastery recorded.`);
        this.d.ui.open({
          id: 'resolved',
          kicker: 'INC-4021 · resolved',
          title: `🎉 Ticket closed — ${pct}%`,
          bodyHtml: `<div>${esc(`Mastery: ${rec.mastery} · best ${rec.best}%. Patches are flowing through the NAT. The fleet stays private.`)}</div>`,
          actions: [
            { label: '↩ Return to NOC', onSelect: () => this.d.onReturn() },
            { label: 'Stay on site' },
          ],
        });
      } else {
        this.d.ui.open({
          id: 'signoff-fail',
          kicker: 'Sign-off',
          title: `${pct}% — not enough to close (need 80%)`,
          bodyHtml: `<div>${esc('Recorded as Assessed. Review the machines and your journal, then sign off again at the field terminal.')}</div>`,
          actions: [{ label: 'OK' }],
        });
      }
    });
  }

  private openSummary() {
    this.d.ui.open({
      id: 'summary',
      kicker: 'INC-4021 · resolved',
      title: 'Patch Night — summary',
      bodyHtml:
        `<div>${esc('Symptom: private fleet timed out on updates. Root cause: no default route in the private route table. Fix: 0.0.0.0/0 → NAT gateway (in the public subnet). Verified by traffic test.')}</div>` +
        `<pre>${esc(String(this.topic.blocks.find((b) => b.id === 'nat')?.code ?? ''))}</pre>`,
      actions: [{ label: 'Close' }],
    });
  }

  // ------------------------------------------------------------- per-frame
  update(dt: number) {
    for (const u of this.updaters) u(dt);
    const r = this.d.sim.trafficReport;
    if (r.running) this.sawTestRunning = true;
    else if (this.sawTestRunning && r.total > 0) {
      this.sawTestRunning = false;
      if (this.step === 'verify') (r.pass ? this.passVerify() : this.failVerify());
      else if (this.step === 'investigate' && !r.pass) {
        this.d.journal.add(`Symptom confirmed: ${r.dropped}/${r.total} parcels died at the route table.`);
      }
    }
  }

  private passVerify() {
    this.step = 'signoff';
    this.applyLamps();
    this.updateObjective();
    this.d.journal.add(`Traffic test PASSED — ${TEST_N}/${TEST_N} delivered via NAT.`);
    this.d.ui.open({
      id: 'verify-pass',
      kicker: 'Traffic test',
      title: `✔ ${TEST_N}/${TEST_N} delivered`,
      bodyHtml: `<div>${esc('Parcels flow rack → route table → NAT airlock → internet gate. Egress restored, fleet still private. Close the ticket at the field terminal.')}</div>`,
      actions: [{ label: 'Sign-off →' }],
    });
  }

  private failVerify() {
    this.lastFailNote =
      this.routeChoice === 'igw'
        ? 'Parcels reached the internet gateway, then bounced: private instances have no public IPs, so replies can’t route back. 0.0.0.0/0 → igw belongs in PUBLIC subnets.'
        : this.routeChoice === 'localnat'
          ? '10.0.0.0/16 must stay → local. Update traffic needs a DEFAULT (0.0.0.0/0) route.'
          : this.routeChoice === 'vgw'
            ? 'No VPN attachment matches — parcels dropped at the route table.'
            : 'The slot is still empty — parcels dropped at the route table.';
    this.step = 'fix';
    this.applyLamps();
    this.updateObjective();
    this.d.journal.add(`Traffic test FAILED. ${this.lastFailNote}`);
    this.d.ui.open({
      id: 'verify-fail',
      kicker: 'Traffic test',
      title: '✘ Test failed',
      bodyHtml: `<div>${esc(this.lastFailNote)}</div>`,
      actions: [{ label: 'Back to the route board →' }],
    });
  }
}
