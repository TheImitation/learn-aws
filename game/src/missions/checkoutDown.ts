import { Vector3 } from '@babylonjs/core';
import type { Topic } from '@content';
import { recordProgress } from '../core/progress';
import { azPlate, chaosLever, crowdGate, dbTower, routerArm, serverRack, statusConsole, type Machine } from '../world/kit';
import { QuizTerminal } from '../ui/quizTerminal';
import { esc } from '../ui/uiShell';
import type { MissionDeps } from './manager';
import type { MissionStep } from './patchNight';

type Provision = 'none' | 'alb2' | 'big' | 'cdn' | 'bigdb';
const TEST_N = 6;

/** Flagship #2 (Resilient): SEV-1 "Checkout Is Down" — one overloaded web server is
 *  a single point of failure. The trap: vertically scaling PASSES the load test but
 *  dies in the AZ-failure chaos drill; only ALB + a second AZ survives both. */
export class CheckoutDownMission {
  step: MissionStep = 'briefing';
  probes = new Set<string>();
  provision: Provision = 'none';
  loadPassed = false;

  private d: MissionDeps;
  private topic: Topic;
  private quiz: QuizTerminal;
  private updaters: ((dt: number) => void)[] = [];
  private interactableIds: string[] = [];
  private spawned: Machine[] = []; // provision-dependent machines
  private azADead = false;
  private drillMode: 'load' | 'chaos' | null = null;
  private m!: {
    gate: Machine; rackA: Machine; db: Machine; term: Machine;
    lever: ReturnType<typeof chaosLever>;
    plateA: ReturnType<typeof azPlate>; plateB: ReturnType<typeof azPlate>;
  };

  constructor(deps: MissionDeps, topic: Topic) {
    this.d = deps;
    this.topic = topic;
    this.quiz = new QuizTerminal(deps.ui);
    this.buildLevel();
    this.wireSim();
    this.wireInteractables();
    this.applyLamps();
  }

  dispose() {
    for (const id of this.interactableIds) this.d.interaction.remove(id);
    for (const m of [this.m.gate, this.m.rackA, this.m.db, this.m.term, this.m.lever]) m.root.dispose();
    this.m.plateA.root.dispose(); this.m.plateB.root.dispose();
    for (const s of this.spawned) s.root.dispose();
  }

  // ---------------------------------------------------------------- level
  private buildLevel() {
    const s = this.d.scene;
    const o = this.d.origin;
    const gate = crowdGate(s, o.add(new Vector3(-9, 0, 0)), Math.PI / 2);
    const plateA = azPlate(s, o.add(new Vector3(0.5, 0, -3)), 7, 5.5, 'A');
    const plateB = azPlate(s, o.add(new Vector3(0.5, 0, 4)), 7, 5.5, 'B');
    const rackA = serverRack(s, o.add(new Vector3(0.5, 0, -3)), -Math.PI / 2);
    const db = dbTower(s, o.add(new Vector3(5.5, 0, 0.5)));
    const lever = chaosLever(s, o.add(new Vector3(3, 0, -6.5)), Math.PI);
    const term = statusConsole(s, o.add(new Vector3(-4, 0, -6.5)), Math.PI);
    if (rackA.update) this.updaters.push(rackA.update);
    this.m = { gate, rackA, db, term, lever, plateA, plateB };
  }

  private wireSim() {
    const { sim } = this.d;
    const o = this.d.origin;
    sim.addNode({
      id: 'gate', anchor: this.m.gate.anchor,
      next: () => (this.provision === 'alb2' ? 'alb' : this.provision === 'big' ? 'sBig' : 'sA'),
    });
    let rr = 0;
    sim.addNode({
      id: 'alb', anchor: o.add(new Vector3(-4, 1.25, 0)),
      next: () => {
        const alive = [!this.azADead ? 'sA' : null, 'sB'].filter(Boolean) as string[];
        return alive.length ? alive[rr++ % alive.length] : 'drop';
      },
    });
    let overloadFlip = 0;
    sim.addNode({
      id: 'sA', anchor: this.m.rackA.anchor,
      next: () => {
        if (this.azADead) return 'drop';
        const soloOverloaded = this.provision !== 'alb2'; // one box doing everything
        if (soloOverloaded && overloadFlip++ % 2 === 1) return 'drop';
        return 'db';
      },
    });
    sim.addNode({ id: 'sBig', anchor: this.m.rackA.anchor.add(new Vector3(0, 0.4, 0)), next: () => (this.azADead ? 'drop' : 'db') });
    sim.addNode({ id: 'sB', anchor: o.add(new Vector3(0.5, 1.0, 4)), next: () => 'db' });
    sim.addNode({ id: 'db', anchor: this.m.db.anchor, next: () => 'deliver' });
  }

  private applyLamps() {
    const good = this.step === 'signoff' || this.step === 'done';
    this.m.gate.setLamp?.(good ? 'ok' : 'bad');
    this.m.rackA.setLamp?.(this.azADead ? 'off' : good || this.provision === 'alb2' || this.provision === 'big' ? 'ok' : 'bad');
    this.m.db.setLamp?.('ok');
    this.m.term.setLamp?.(good ? 'ok' : 'off');
    this.m.lever.setLamp?.(this.azADead ? 'bad' : 'off');
    this.m.plateA.setState(this.azADead ? 'dead' : 'ok');
  }

  // ---------------------------------------------------------- interactables
  private wireInteractables() {
    const add = (spec: Parameters<MissionDeps['interaction']['add']>[0]) => { this.interactableIds.push(spec.id); this.d.interaction.add(spec); };
    add({ id: 'co-gate', node: this.m.gate.root, prompt: 'Inspect the front door', onInteract: () => this.probeGate() });
    add({ id: 'co-rack', node: this.m.rackA.root, prompt: 'Inspect web server', onInteract: () => this.probeRack() });
    add({ id: 'co-db', node: this.m.db.root, prompt: 'Inspect database', onInteract: () => this.probeDb() });
    add({ id: 'co-term', node: this.m.term.root, prompt: 'Open field terminal', onInteract: () => this.openTerminal() });
    add({
      id: 'co-lever', node: this.m.lever.root, prompt: 'Pull chaos-drill lever (fail AZ-A)',
      enabled: () => this.step === 'verify' && this.loadPassed && !this.d.sim.trafficReport.running,
      onInteract: () => this.pullLever(),
    });
  }

  // -------------------------------------------------------------- briefing
  openBriefing() {
    this.d.objective.set('Ticket', 'Read the SEV-1 briefing');
    this.d.ui.open({
      id: 'briefing',
      kicker: 'SEV-1 · INC-4177 · reported by storefront-oncall',
      title: 'Checkout Is Down',
      bodyHtml:
        `<div>${esc('A promo went viral and checkout is buckling. Roughly half of purchase requests bounce with 503s. Revenue is bleeding by the minute.')}</div>` +
        `<pre>ALARM  http-5xx-rate  CRITICAL\nhosts in service: 1\np99 latency: 9,400 ms</pre>` +
        `<div>${esc('Inspect the site, find the root cause, and make checkout survive — the fix will be drilled with a live AZ failure before you can close.')}</div>`,
      actions: [{ label: 'Accept ticket', onSelect: () => { this.step = 'investigate'; this.updateObjective(); } }],
    });
  }

  private updateObjective() {
    const o = this.d.objective;
    switch (this.step) {
      case 'investigate': o.set('Investigate', `Inspect the site (${this.probes.size}/3) · diagnose at the field terminal`); break;
      case 'fix': o.set('Fix', 'Provision infrastructure at the field terminal'); break;
      case 'verify': o.set('Verify', this.loadPassed ? 'Load test passed — now pull the chaos lever (fail AZ-A)' : 'Run the load test at the field terminal'); break;
      case 'signoff': o.set('Sign-off', 'Close the ticket at the field terminal (quiz)'); break;
      case 'done': o.set('Resolved', 'INC-4177 closed — checkout survives an AZ failure.'); break;
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
  private probeGate() {
    this.probed('gate', 'Front door: traffic IS arriving — ~50% of requests bounce with 503 after long waits.');
    this.d.ui.open({
      id: 'co-probe-gate', kicker: 'Front door · incoming traffic', title: 'Storefront edge',
      bodyHtml: `<pre>requests/min ...... 4,180  (3× normal)\n503 responses ..... 47%\nDNS resolution .... ok ✓\nTLS handshakes .... ok ✓</pre><div>${esc('Users reach the site fine — then time out waiting for the one web server.')}</div>`,
      actions: [{ label: 'Close' }],
    });
  }

  private probeRack() {
    this.probed('rack', 'Web server i-web-01: CPU pegged at 100%, the ONLY instance, in AZ-A.');
    this.d.ui.open({
      id: 'co-probe-rack', kicker: 'Web tier · subnet-a (AZ-A)', title: 'i-web-01 — the only web server',
      bodyHtml: `<pre>CPU ............... 100% (pegged)\ninstances in tier . 1\nload balancer ..... none\nAZ ................ us-east-1a only</pre><div>${esc('Every request lands here. If this box blinks, checkout is gone.')}</div>`,
      actions: [{ label: 'Close' }],
    });
  }

  private probeDb() {
    this.probed('db', 'Database: healthy — 12% CPU, 3/100 connections. Not the bottleneck.');
    this.d.ui.open({
      id: 'co-probe-db', kicker: 'Data tier', title: 'orders-db',
      bodyHtml: `<pre>CPU ............... 12%\nconnections ....... 3 / 100\nreplica lag ....... n/a\nslow queries ...... 0</pre><div>${esc('The database is idling. Whatever is wrong, it isn’t here.')}</div>`,
      actions: [{ label: 'Close' }],
    });
  }

  // -------------------------------------------------------- field terminal
  private openTerminal() {
    const r = this.d.sim.trafficReport;
    const testLine = r.total === 0 ? 'no test run yet'
      : `last test: ${r.delivered}/${r.total} delivered · ${r.dropped} dropped · ${r.pass === null ? 'running…' : r.pass ? 'PASS' : 'FAIL'}`;
    const actions = [];
    if (this.step === 'investigate') {
      actions.push({ label: 'Run load test — watch the symptom', closes: true, onSelect: () => this.runTest('load') });
      if (this.probes.has('rack')) actions.push({ label: 'Diagnose root cause…', closes: false, onSelect: () => this.openDiagnosis() });
    } else if (this.step === 'fix') {
      actions.push({ label: 'Provision infrastructure…', closes: false, onSelect: () => this.openProvisioning() });
      actions.push({ label: 'Run load test', closes: true, onSelect: () => this.runTest('load') });
    } else if (this.step === 'verify') {
      actions.push({ label: `Run load test (${TEST_N} checkouts)`, closes: true, onSelect: () => this.runTest('load') });
      actions.push({ label: 'Re-provision…', closes: false, onSelect: () => this.openProvisioning() });
    } else if (this.step === 'signoff') {
      actions.push({ label: 'Close ticket — sign off (quiz)', closes: false, onSelect: () => this.startSignoff() });
    } else if (this.step === 'done') {
      actions.push({ label: 'Ticket summary', closes: false, onSelect: () => this.openSummary() });
    }
    actions.push({ label: 'Close' });
    const hint =
      this.step === 'verify' && this.loadPassed ? '\nhint: prove it — pull the red chaos lever (fail AZ-A)'
        : this.step === 'investigate' && !this.probes.has('rack') ? '\nhint: inspect the web server before diagnosing' : '';
    this.d.ui.open({
      id: 'co-terminal',
      kicker: 'Field terminal · INC-4177',
      title: 'Checkout — web tier',
      bodyHtml: `<pre>step: ${this.step.toUpperCase()}${this.loadPassed ? ' (load ✓)' : ''}\nprovision: ${this.provision}\n${esc(testLine)}${esc(hint)}</pre>`,
      actions,
    });
  }

  private openDiagnosis() {
    const wrong = (rebuttal: string) => ({
      closes: false,
      onSelect: () => {
        this.d.journal.add(`Diagnosis rejected: ${rebuttal}`);
        this.d.ui.open({
          id: 'co-diag-wrong', kicker: 'Diagnosis', title: '✘ Not supported by the evidence',
          bodyHtml: `<div>${esc(rebuttal)}</div>`,
          actions: [{ label: 'Back to diagnosis', closes: false, onSelect: () => this.openDiagnosis() }],
        });
      },
    });
    this.d.ui.open({
      id: 'co-diagnosis', kicker: 'Diagnosis · pick the root cause', title: 'Why is checkout failing?',
      actions: [
        { label: 'The database is the bottleneck', ...wrong('The DB probe showed 12% CPU and 3/100 connections — it is idling.') },
        {
          label: 'One overloaded web server serves everything — no redundancy, a single point of failure',
          closes: false,
          onSelect: () => {
            this.step = 'fix';
            this.d.journal.add('Diagnosis confirmed: single overloaded instance, no load balancer, one AZ.');
            this.updateObjective();
            this.d.ui.open({
              id: 'co-diag-right', kicker: 'Diagnosis', title: '✔ Root cause confirmed',
              bodyHtml: `<div>${esc('i-web-01 is pegged and alone. Fix the capacity AND the fragility: provision at the field terminal. Your fix will be chaos-drilled before the ticket closes.')}</div>`,
              actions: [{ label: 'To work →' }],
            });
          },
        },
        { label: 'DNS is failing to resolve the storefront', ...wrong('The front-door probe showed requests arriving and TLS completing — then timing out at the web tier.') },
        { label: 'The web server needs a NAT gateway', ...wrong('NAT is for OUTBOUND traffic from private subnets — checkout is inbound. Not related.') },
      ],
    });
  }

  // ---------------------------------------------------------- provisioning
  private openProvisioning() {
    const pick = (p: Provision, label: string, note: string) => ({
      label,
      onSelect: () => {
        this.provision = p;
        this.applyProvision();
        this.d.journal.add(`Provisioned: ${label}. ${note}`);
        if (this.step === 'fix') this.step = 'verify';
        this.loadPassed = false;
        this.applyLamps();
        this.updateObjective();
      },
    });
    this.d.ui.open({
      id: 'co-provision', kicker: 'Provisioning', title: 'Choose the fix',
      bodyHtml: `<div>${esc('Budget approved for one change. It must survive the chaos drill.')}</div>`,
      actions: [
        pick('big', 'Scale up: replace with one giant instance (16× larger)', 'Vertical scale.'),
        pick('alb2', 'Add a load balancer + second server in another AZ', 'Horizontal scale + redundancy.'),
        pick('cdn', 'Put a CDN in front of checkout', 'Edge caching.'),
        pick('bigdb', 'Upgrade the database instance', 'Bigger DB.'),
        { label: 'Cancel' },
      ],
    });
  }

  private applyProvision() {
    for (const s of this.spawned) s.root.dispose();
    this.spawned = [];
    this.m.rackA.root.setEnabled(true);
    const sBig = this.d.scene; // scene handle
    const o = this.d.origin;
    if (this.provision === 'alb2') {
      const alb = routerArm(sBig, o.add(new Vector3(-4, 0, 0)));
      const rackB = serverRack(sBig, o.add(new Vector3(0.5, 0, 4)), -Math.PI / 2);
      rackB.setLamp?.('ok');
      if (alb.update) this.updaters.push(alb.update);
      this.spawned.push(alb, rackB);
    } else if (this.provision === 'big') {
      this.m.rackA.root.setEnabled(false);
      const big = serverRack(sBig, o.add(new Vector3(0.5, 0, -3)), -Math.PI / 2);
      big.root.scaling.setAll(1.35);
      big.setLamp?.('ok');
      this.spawned.push(big);
    } else if (this.provision === 'cdn') {
      const ring = crowdGate(sBig, o.add(new Vector3(-6.5, 0, 0)), Math.PI / 2);
      ring.setLamp?.('ok');
      this.spawned.push(ring);
    } else if (this.provision === 'bigdb') {
      const bigger = dbTower(sBig, o.add(new Vector3(5.5, 0, 0.5)));
      bigger.root.scaling.setAll(1.3);
      this.spawned.push(bigger);
    }
  }

  private runTest(mode: 'load' | 'chaos') {
    this.drillMode = mode;
    this.m.term.setLamp?.('off');
    this.d.sim.trafficTest(['gate'], TEST_N);
  }

  private pullLever() {
    this.azADead = true;
    this.m.lever.setPulled(true);
    this.applyLamps();
    this.d.journal.add('CHAOS DRILL: AZ-A failed. Watching checkout…');
    this.runTest('chaos');
  }

  private endDrill() {
    this.azADead = false;
    this.m.lever.setPulled(false);
    this.applyLamps();
  }

  // ------------------------------------------------------------- per-frame
  update(dt: number) {
    for (const u of this.updaters) u(dt);
    const r = this.d.sim.trafficReport;
    if (!r.running && this.drillMode && r.total > 0 && r.resolved === r.total) {
      const mode = this.drillMode;
      this.drillMode = null;
      if (mode === 'load') this.onLoadResult(!!r.pass);
      else this.onChaosResult(!!r.pass);
    }
  }

  private onLoadResult(pass: boolean) {
    if (this.step === 'investigate') {
      if (!pass) this.d.journal.add('Symptom confirmed: half of checkout requests dropped at the web tier.');
      return;
    }
    if (this.step !== 'verify') return;
    if (pass) {
      this.loadPassed = true;
      this.updateObjective();
      this.d.journal.add('Load test PASSED. Now prove it survives an AZ failure.');
      this.d.ui.open({
        id: 'co-load-pass', kicker: 'Load test', title: `✔ ${TEST_N}/${TEST_N} checkouts served`,
        bodyHtml: `<div>${esc('Capacity looks good. But capacity isn’t resilience — pull the red chaos lever to fail AZ-A and see if checkout survives.')}</div>`,
        actions: [{ label: 'To the lever →' }],
      });
    } else {
      const note =
        this.provision === 'cdn' ? 'The CDN can’t help: checkout is dynamic, per-user traffic — it can’t be served from cache. The web tier is still one pegged box.'
          : this.provision === 'bigdb' ? 'The database was never the bottleneck (12% CPU). The web tier is still one pegged box.'
            : 'Still one overloaded server doing everything.';
      this.step = 'fix';
      this.loadPassed = false;
      this.updateObjective();
      this.d.journal.add(`Load test FAILED. ${note}`);
      this.d.ui.open({
        id: 'co-load-fail', kicker: 'Load test', title: '✘ Checkouts still dropping',
        bodyHtml: `<div>${esc(note)}</div>`,
        actions: [{ label: 'Re-provision →' }],
      });
    }
  }

  private onChaosResult(pass: boolean) {
    if (this.step !== 'verify') { this.endDrill(); return; }
    if (pass) {
      this.endDrill();
      this.step = 'signoff';
      this.applyLamps();
      this.updateObjective();
      this.d.journal.add('CHAOS DRILL PASSED: AZ-A failed, the ALB shifted traffic to AZ-B, checkout never blinked.');
      this.d.ui.open({
        id: 'co-drill-pass', kicker: 'Chaos drill', title: `✔ Survived the AZ failure`,
        bodyHtml: `<div>${esc('AZ-A went dark and the load balancer routed every checkout to the healthy server in AZ-B. This is what highly available means. Close the ticket at the field terminal.')}</div>`,
        actions: [{ label: 'Sign-off →' }],
      });
    } else {
      this.endDrill();
      const note = this.provision === 'big'
        ? 'The giant instance handled the load — and then died WITH its AZ. Vertical scaling can buy capacity, never availability: one box is one point of failure.'
        : 'Everything in one AZ died together. Redundancy has to span Availability Zones.';
      this.step = 'fix';
      this.loadPassed = false;
      this.updateObjective();
      this.d.journal.add(`CHAOS DRILL FAILED. ${note}`);
      this.d.ui.open({
        id: 'co-drill-fail', kicker: 'Chaos drill', title: '✘ Total outage during the drill',
        bodyHtml: `<div>${esc(note)}</div>`,
        actions: [{ label: 'Re-provision →' }],
      });
    }
  }

  // --------------------------------------------------------------- signoff
  private startSignoff() {
    this.quiz.start(this.topic, (pct, passed) => {
      const rec = recordProgress(this.topic.id, passed ? 'Mastered' : 'Assessed', pct);
      if (passed) {
        this.step = 'done';
        this.updateObjective();
        this.d.journal.add(`INC-4177 closed. Sign-off ${pct}% — mastery recorded.`);
        this.d.ui.open({
          id: 'co-resolved', kicker: 'INC-4177 · resolved', title: `🎉 Ticket closed — ${pct}%`,
          bodyHtml: `<div>${esc(`Mastery: ${rec.mastery} · best ${rec.best}%. Checkout now rides an ALB across two AZs — and it's been proven under fire.`)}</div>`,
          actions: [
            { label: '↩ Return to NOC', onSelect: () => this.d.onReturn() },
            { label: 'Stay on site' },
          ],
        });
      } else {
        this.d.ui.open({
          id: 'co-signoff-fail', kicker: 'Sign-off', title: `${pct}% — not enough to close (need 80%)`,
          bodyHtml: `<div>${esc('Recorded as Assessed. Review your journal and sign off again at the field terminal.')}</div>`,
          actions: [{ label: 'OK' }],
        });
      }
    });
  }

  private openSummary() {
    const concepts = [...new Set(this.topic.stages.map((s) => s.concept).filter(Boolean))];
    this.d.ui.open({
      id: 'co-summary', kicker: 'INC-4177 · resolved', title: 'Checkout Is Down — summary',
      bodyHtml:
        `<div>${esc('Symptom: one pegged web server dropping half of checkout. Root cause: no redundancy — a single instance in a single AZ. Fix: ALB + second server in another AZ, proven by a live AZ-failure drill.')}</div><div style="height:8px"></div>` +
        concepts.map((c) => `<div>· ${esc(String(c))}</div>`).join(''),
      actions: [{ label: 'Close' }],
    });
  }
}
